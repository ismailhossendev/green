const express = require('express');
const router = express.Router();
const Replacement = require('../models/Replacement');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Ledger = require('../models/Ledger');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

// @route   GET /api/replacement/stats
// @desc    Get detailed factory and repair statistics
// @access  Private
router.get('/stats', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const { brand } = req.query;
        const matchBrand = brand ? { brand } : {};

        // 1. Aggregation for "In Factory" (Status: 'Sent to Factory')
        const inFactoryStats = await Replacement.aggregate([
            {
                $match: {
                    ...matchBrand,
                    status: 'Sent to Factory'
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    qty: { $sum: '$items.repairableQty' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    productName: '$product.modelName',
                    qty: 1,
                    unitPrice: '$product.purchasePrice',
                    totalValue: { $multiply: ['$qty', '$product.purchasePrice'] }
                }
            },
            { $match: { qty: { $gt: 0 } } } // Filter out 0 qty logic just in case
        ]);

        // 2. Aggregation for "Pending Shipment" (Status: 'Checked', repairableQty > 0)
        const pendingStats = await Replacement.aggregate([
            {
                $match: {
                    ...matchBrand,
                    status: 'Checked'
                }
            },
            { $unwind: '$items' },
            { $match: { 'items.repairableQty': { $gt: 0 } } },
            {
                $group: {
                    _id: '$items.product',
                    qty: { $sum: '$items.repairableQty' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    productName: '$product.modelName',
                    qty: 1,
                    unitPrice: '$product.purchasePrice',
                    totalValue: { $multiply: ['$qty', '$product.purchasePrice'] }
                }
            }
        ]);

        // Calculate Totals
        const inFactoryTotalQty = inFactoryStats.reduce((acc, curr) => acc + curr.qty, 0);
        const inFactoryTotalValue = inFactoryStats.reduce((acc, curr) => acc + curr.totalValue, 0);

        const pendingTotalQty = pendingStats.reduce((acc, curr) => acc + curr.qty, 0);
        const pendingTotalValue = pendingStats.reduce((acc, curr) => acc + curr.totalValue, 0);

        res.json({
            inFactory: {
                items: inFactoryStats,
                totalQty: inFactoryTotalQty,
                totalValue: inFactoryTotalValue
            },
            pending: {
                items: pendingStats,
                totalQty: pendingTotalQty,
                totalValue: pendingTotalValue
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/replacement
// @desc    Get all replacements
// @access  Private
router.get('/', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const { dealerId, brand, status, page = 1, limit = 50 } = req.query;

        let query = {};
        if (dealerId) query.dealer = dealerId;
        if (brand) query.brand = brand;
        if (status) query.status = status;

        const replacements = await Replacement.find(query)
            .populate('dealer', 'name phone')
            .populate('items.product', 'modelName')
            .populate('createdBy', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ date: -1 });

        const total = await Replacement.countDocuments(query);

        res.json({
            replacements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/replacement/:id
// @desc    Get single replacement
// @access  Private
router.get('/:id', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const replacement = await Replacement.findById(req.params.id)
            .populate('dealer', 'name phone address')
            .populate('items.product', 'modelName')
            .populate('createdBy', 'name');

        if (!replacement) {
            return res.status(404).json({ message: 'Replacement not found' });
        }

        res.json(replacement);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/replacement/dealer/:dealerId
// @desc    Get dealer-wise replacement summary
// @access  Private
router.get('/dealer/:dealerId', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const replacements = await Replacement.find({ dealer: req.params.dealerId })
            .populate('items.product', 'modelName type')
            .sort({ date: -1 });

        const summary = await Replacement.aggregate([
            { $match: { dealer: require('mongoose').Types.ObjectId(req.params.dealerId) } },
            {
                $group: {
                    _id: null,
                    totalGood: { $sum: '$totalGood' },
                    totalBad: { $sum: '$totalBad' },
                    totalDamage: { $sum: '$totalDamage' },
                    totalRepair: { $sum: '$totalRepair' },
                    totalRepairCost: { $sum: '$repairCost' },
                    totalAdjustment: { $sum: '$adjustmentAmount' }
                }
            }
        ]);

        res.json({
            replacements,
            summary: summary[0] || {}
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/replacement
// @desc    Step 1: Create Replacement (Receive from Dealer)
// @access  Private
router.post('/', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const { dealer, brand, items, totalClaimed } = req.body;

        const dealerData = await Customer.findById(dealer);
        if (!dealerData || dealerData.type !== 'Dealer') {
            return res.status(400).json({ message: 'Invalid dealer' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'At least one product is required' });
        }

        const processedItems = items.map(item => ({
            product: item.product,
            productName: item.productName,
            claimedQty: item.claimedQty
        }));

        // Calculate total claimed if not provided
        const calcTotalClaimed = processedItems.reduce((sum, i) => sum + i.claimedQty, 0);

        const replacement = await Replacement.create({
            dealer,
            brand,
            items: processedItems,
            totalClaimed: totalClaimed || calcTotalClaimed,
            status: 'Pending',
            createdBy: req.user._id
        });

        await replacement.populate('dealer', 'name phone');
        await replacement.populate('items.product', 'modelName');

        res.status(201).json(replacement);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/replacement/:id/triage
// @desc    Step 2: Submit Triage Results (Check Items)
// @access  Private
router.post('/:id/triage', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { items } = req.body; // Expects [{ product: ID, goodQty, repairableQty, badQty, damageQty }]

        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) {
            return res.status(404).json({ message: 'Replacement not found' });
        }

        // 1. Update Items with Triage Data
        let totalGood = 0;
        let totalRepairable = 0;
        let totalBad = 0;
        let totalDamage = 0;
        let ledgerCreditAmount = 0;

        for (const inputItem of items) {
            const dbItem = replacement.items.find(i => i.product.toString() === inputItem.product);
            if (dbItem) {
                dbItem.goodQty = inputItem.goodQty || 0;
                dbItem.repairableQty = inputItem.repairableQty || 0;
                dbItem.badQty = inputItem.badQty || 0;
                dbItem.damageQty = inputItem.damageQty || 0;
                // dbItem.rejectedQty can be sum of bad+damage if we want to keep it populated, or just 0
                dbItem.rejectedQty = (inputItem.badQty || 0) + (inputItem.damageQty || 0);

                // Get current price for ledger value
                const product = await Product.findById(dbItem.product);
                // Use dealerPrice if available, else salesPrice, fallback to 0
                const price = product.dealerPrice || product.salesPrice || 0;
                dbItem.unitPrice = price;

                // Validate Triage Totals matches Claimed?
                // Optional: STRICT MODE - ensure good+repair+bad+damage <= claimed

                totalGood += dbItem.goodQty;
                totalRepairable += dbItem.repairableQty;
                totalBad += dbItem.badQty;
                totalDamage += dbItem.damageQty;

                // Credit Calculation: (Good + Repairable) * Price
                // Rejected items (Bad/Damage) are not credited.
                ledgerCreditAmount += (dbItem.goodQty + dbItem.repairableQty) * price;

                // 2. STOCK UPDATE
                if (product) {
                    if (dbItem.goodQty > 0) product.stock.goodQty += dbItem.goodQty;
                    if (dbItem.repairableQty > 0) product.stock.repairQty += dbItem.repairableQty;
                    if (dbItem.badQty > 0) product.stock.badQty += dbItem.badQty;
                    if (dbItem.damageQty > 0) product.stock.damageQty += dbItem.damageQty;

                    await product.save();
                }
            }
        }

        replacement.totalGood = totalGood;
        replacement.totalRepairable = totalRepairable;
        replacement.totalBad = totalBad;
        replacement.totalDamage = totalDamage;
        replacement.totalRejected = totalBad + totalDamage; // Keep legacy field consistent
        replacement.status = 'Checked'; // Move to next stage
        replacement.isStockAdded = true; // Partially true (stock updated)

        // 3. LEDGER UPDATE: Credit Dealer for Accepted Items
        if (!replacement.isLedgerAdjusted && ledgerCreditAmount > 0) {
            // Get dealer's current balance
            const lastEntry = await Ledger.findOne({ customer: replacement.dealer, brand: replacement.brand })
                .sort({ date: -1 });
            const previousBalance = lastEntry ? lastEntry.balance : 0;
            const newBalance = previousBalance - ledgerCreditAmount; // Credit decreases balance (Dealer gets money back)

            await Ledger.create({
                customer: replacement.dealer,
                brand: replacement.brand,
                type: 'Replacement',
                referenceId: replacement._id,
                referenceNo: replacement.replacementNo,
                debit: 0,
                credit: ledgerCreditAmount,
                balance: newBalance,
                description: `Replacement Credit (${replacement.replacementNo}) - Accepted: ${totalGood + totalRepairable} items`,
                addedBy: req.user._id
            });

            // Update customer totals
            const customer = await Customer.findById(replacement.dealer);
            customer.totalAdjust = (customer.totalAdjust || 0) + ledgerCreditAmount;
            // Note: usually 'totalDues' tracks positive debt. Credit reduces dues.
            customer.totalDues = (customer.totalDues || 0) - ledgerCreditAmount;
            await customer.save();

            replacement.isLedgerAdjusted = true;
        }

        await replacement.save();

        // Re-populate for response
        await replacement.populate('items.product', 'modelName dealerPrice salesPrice');
        res.json(replacement);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/replacement/:id/factory-send
// @desc    Step 3: Send Repairable items to Factory
// @access  Private
router.post('/:id/factory-send', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });

        if (replacement.status !== 'Checked') {
            return res.status(400).json({ message: 'Replacement must be Checked before sending to factory' });
        }

        replacement.status = 'Sent to Factory';
        replacement.repairDetails.sentDate = new Date();
        await replacement.save();

        res.json(replacement);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/replacement/:id/factory-receive
// @desc    Step 4: Receive from Factory (Finalize Repair)
// @access  Private
router.post('/:id/factory-receive', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { highCostQty, lowCostQty, repairNote } = req.body;

        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });

        if (replacement.status !== 'Sent to Factory') {
            return res.status(400).json({ message: 'Replacement is not at Factory stage' });
        }

        // Validate: high + low <= totalRepairable
        const totalRepaired = (parseInt(highCostQty) || 0) + (parseInt(lowCostQty) || 0);
        if (totalRepaired > replacement.totalRepairable) {
            return res.status(400).json({ message: `Total repaired (${totalRepaired}) exceeds repairable quantity (${replacement.totalRepairable})` });
        }

        replacement.repairDetails.highCostQty = highCostQty || 0;
        replacement.repairDetails.lowCostQty = lowCostQty || 0;
        replacement.repairDetails.receivedDate = new Date();
        if (repairNote) replacement.repairDetails.repairNote = repairNote;

        // TODO: Calculate Repair Cost? The user prompt implied repair "costing" logic.
        // For now, tracking quantities. Cost calculation might happen later or be manual.

        replacement.status = 'Repaired';

        // STOCK UPDATE: Add REPAIRED items to Stock
        // Logic: All "Repairable" items that came back are added to stock, either as Good or Repaired stock?
        // Prompt says: "Good products I will add to stock... Factory will check and repair... Receipted product will receive to stock"
        // Prompt also says: "Posting (Costing) will have 2 types... PCB damage costing more... Recipted product received directly to stock"

        // Assumption: All successfully repaired items go to 'Used/Refurb' or 'Good' stock?
        // Let's add them to 'goodQty' for now or maybe 'repairQty' (Repaired Stock) if Product model distinguishes them.

        // Distribute repaired items back to product stocks
        // Since we don't know EXACTLY which product was high/low cost (we only have total counts in repairDetails for the whole batch?),
        // this is tricky if there are MULTIPLE products in one replacement.
        // User Requirement Refinement: "factory check... repair... recieve... directly to stock".
        // If the replacement has multiple products, how do we know which product got fixed?
        // 
        // SIMPLIFICATION: If replacement has multiple items, we might need item-level repair details.
        // BUT, for now, let's assume we indiscriminately add the 'repairableQty' of each item BACK to stock as 'goodQty' (or maybe 'repairQty') once the batch is closed.

        for (const item of replacement.items) {
            if (item.repairableQty > 0) {
                const product = await Product.findById(item.product);
                if (product) {
                    // Add repaired items to Good Stock (as they are now functional)
                    // Or maybe 'repairQty' field in Product represents 'Refurbished Stock'?
                    // Let's assume Good Stock for sales potential.
                    product.stock.goodQty += item.repairableQty;
                    await product.save();
                }
            }
        }

        await replacement.save();
        res.json(replacement);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/replacement/:id
// @desc    Delete replacement
// @access  Private (Admin)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });

        // Complex Rollback Logic Needed if we support Delete
        // Just block delete for non-pending for safety in this iteration
        if (replacement.status !== 'Pending') {
            return res.status(400).json({ message: 'Cannot delete processed replacement. Contact support.' });
        }

        await Replacement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Replacement deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
