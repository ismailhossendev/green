const express = require('express');
const router = express.Router();
const Replacement = require('../models/Replacement');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Ledger = require('../models/Ledger');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

router.get('/stats', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const { brand } = req.query;
        const matchBrand = brand ? { brand } : {};
        const inFactoryStats = await Replacement.aggregate([{ $match: { ...matchBrand, status: 'Sent to Factory' } }, { $unwind: '$items' }, { $group: { _id: '$items.product', qty: { $sum: '$items.repairableQty' } } }, { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }, { $unwind: '$product' }, { $project: { productName: '$product.modelName', qty: 1, unitPrice: '$product.purchasePrice', totalValue: { $multiply: ['$qty', '$product.purchasePrice'] } } }, { $match: { qty: { $gt: 0 } } }]);
        const pendingStats = await Replacement.aggregate([{ $match: { ...matchBrand, status: 'Checked' } }, { $unwind: '$items' }, { $match: { 'items.repairableQty': { $gt: 0 } } }, { $group: { _id: '$items.product', qty: { $sum: '$items.repairableQty' } } }, { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }, { $unwind: '$product' }, { $project: { productName: '$product.modelName', qty: 1, unitPrice: '$product.purchasePrice', totalValue: { $multiply: ['$qty', '$product.purchasePrice'] } } }]);
        res.json({ inFactory: { items: inFactoryStats, totalQty: inFactoryStats.reduce((a, c) => a + c.qty, 0), totalValue: inFactoryStats.reduce((a, c) => a + c.totalValue, 0) }, pending: { items: pendingStats, totalQty: pendingStats.reduce((a, c) => a + c.qty, 0), totalValue: pendingStats.reduce((a, c) => a + c.totalValue, 0) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const { dealerId, brand, status, page = 1, limit = 50 } = req.query;
        let query = {};
        if (dealerId) query.dealer = dealerId;
        if (brand) query.brand = brand;
        if (status) query.status = status;
        const replacements = await Replacement.find(query).populate('dealer', 'name phone').populate('items.product', 'modelName').populate('createdBy', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
        const total = await Replacement.countDocuments(query);
        res.json({ replacements, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const replacement = await Replacement.findById(req.params.id).populate('dealer', 'name phone address').populate('items.product', 'modelName').populate('createdBy', 'name');
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });
        res.json(replacement);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', protect, canAccessModule('replacement'), async (req, res) => {
    try {
        const { dealer, brand, items, totalClaimed } = req.body;
        const dealerData = await Customer.findById(dealer);
        if (!dealerData || dealerData.type !== 'Dealer') return res.status(400).json({ message: 'Invalid dealer' });
        if (!items || items.length === 0) return res.status(400).json({ message: 'At least one product is required' });
        const processedItems = items.map(item => ({ product: item.product, productName: item.productName, claimedQty: item.claimedQty }));
        const calcTotalClaimed = processedItems.reduce((sum, i) => sum + i.claimedQty, 0);
        const replacement = await Replacement.create({ dealer, brand, items: processedItems, totalClaimed: totalClaimed || calcTotalClaimed, status: 'Pending', createdBy: req.user._id });
        await replacement.populate('dealer', 'name phone');
        await replacement.populate('items.product', 'modelName');
        res.status(201).json(replacement);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:id/triage', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { items } = req.body;
        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });
        let totalGood = 0, totalRepairable = 0, totalBad = 0, totalDamage = 0, ledgerCreditAmount = 0;
        for (const inputItem of items) {
            const dbItem = replacement.items.find(i => i.product.toString() === inputItem.product);
            if (dbItem) {
                dbItem.goodQty = inputItem.goodQty || 0; dbItem.repairableQty = inputItem.repairableQty || 0; dbItem.badQty = inputItem.badQty || 0; dbItem.damageQty = inputItem.damageQty || 0; dbItem.rejectedQty = (inputItem.badQty || 0) + (inputItem.damageQty || 0);
                const product = await Product.findById(dbItem.product);
                const price = product.dealerPrice || product.salesPrice || 0; dbItem.unitPrice = price;
                totalGood += dbItem.goodQty; totalRepairable += dbItem.repairableQty; totalBad += dbItem.badQty; totalDamage += dbItem.damageQty;
                ledgerCreditAmount += (dbItem.goodQty + dbItem.repairableQty) * price;
                if (product) { if (dbItem.goodQty > 0) product.stock.goodQty += dbItem.goodQty; if (dbItem.repairableQty > 0) product.stock.repairQty += dbItem.repairableQty; if (dbItem.badQty > 0) product.stock.badQty += dbItem.badQty; if (dbItem.damageQty > 0) product.stock.damageQty += dbItem.damageQty; await product.save(); }
            }
        }
        replacement.totalGood = totalGood; replacement.totalRepairable = totalRepairable; replacement.totalBad = totalBad; replacement.totalDamage = totalDamage; replacement.totalRejected = totalBad + totalDamage; replacement.status = 'Checked'; replacement.isStockAdded = true;
        if (!replacement.isLedgerAdjusted && ledgerCreditAmount > 0) {
            const lastEntry = await Ledger.findOne({ customer: replacement.dealer, brand: replacement.brand }).sort({ date: -1 });
            const previousBalance = lastEntry ? lastEntry.balance : 0; const newBalance = previousBalance - ledgerCreditAmount;
            await Ledger.create({ customer: replacement.dealer, brand: replacement.brand, type: 'Replacement', referenceId: replacement._id, referenceNo: replacement.replacementNo, debit: 0, credit: ledgerCreditAmount, balance: newBalance, description: `Replacement Credit (${replacement.replacementNo})`, addedBy: req.user._id });
            const customer = await Customer.findById(replacement.dealer);
            customer.totalAdjust = (customer.totalAdjust || 0) + ledgerCreditAmount; customer.totalDues = (customer.totalDues || 0) - ledgerCreditAmount; await customer.save();
            replacement.isLedgerAdjusted = true;
        }
        await replacement.save();
        await replacement.populate('items.product', 'modelName dealerPrice salesPrice');
        res.json(replacement);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:id/factory-send', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });
        if (replacement.status !== 'Checked') return res.status(400).json({ message: 'Replacement must be Checked before sending to factory' });
        replacement.status = 'Sent to Factory'; replacement.repairDetails.sentDate = new Date(); await replacement.save();
        res.json(replacement);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/:id/factory-receive', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { highCostQty, lowCostQty, repairNote } = req.body;
        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });
        if (replacement.status !== 'Sent to Factory') return res.status(400).json({ message: 'Replacement is not at Factory stage' });
        const totalRepaired = (parseInt(highCostQty) || 0) + (parseInt(lowCostQty) || 0);
        if (totalRepaired > replacement.totalRepairable) return res.status(400).json({ message: `Total repaired (${totalRepaired}) exceeds repairable quantity (${replacement.totalRepairable})` });
        replacement.repairDetails.highCostQty = highCostQty || 0; replacement.repairDetails.lowCostQty = lowCostQty || 0; replacement.repairDetails.receivedDate = new Date(); if (repairNote) replacement.repairDetails.repairNote = repairNote;
        replacement.status = 'Repaired';
        for (const item of replacement.items) { if (item.repairableQty > 0) { const product = await Product.findById(item.product); if (product) { product.stock.goodQty += item.repairableQty; await product.save(); } } }
        await replacement.save(); res.json(replacement);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const replacement = await Replacement.findById(req.params.id);
        if (!replacement) return res.status(404).json({ message: 'Replacement not found' });
        if (replacement.status !== 'Pending') return res.status(400).json({ message: 'Cannot delete processed replacement.' });
        await Replacement.findByIdAndDelete(req.params.id); res.json({ message: 'Replacement deleted' });
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
