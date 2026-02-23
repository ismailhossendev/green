const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Replacement = require('../models/Replacement');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

router.get('/', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const { brand, type, search, stockStatus, minPrice, maxPrice, sortBy, sortOrder = 'desc', page = 1, limit = 50 } = req.query;
        let query = { isActive: true };
        if (brand && brand !== 'All') query.brand = brand;
        if (type && type !== 'All') query.type = type;
        if (search) { query.$or = [{ modelName: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]; }
        if (minPrice || maxPrice) { query.salesPrice = {}; if (minPrice) query.salesPrice.$gte = parseFloat(minPrice); if (maxPrice) query.salesPrice.$lte = parseFloat(maxPrice); }
        if (stockStatus) {
            if (stockStatus === 'in-stock') { query['$expr'] = { $gt: [{ $add: ["$stock.goodQty", "$stock.badQty", "$stock.damageQty", "$stock.repairQty"] }, 0] }; }
            else if (stockStatus === 'out-of-stock') { query['$expr'] = { $eq: [{ $add: ["$stock.goodQty", "$stock.badQty", "$stock.damageQty", "$stock.repairQty"] }, 0] }; }
            else if (stockStatus === 'low-stock') { query['$expr'] = { $lt: [{ $add: ["$stock.goodQty", "$stock.badQty", "$stock.damageQty", "$stock.repairQty"] }, 5] }; }
        }
        let sort = sortBy ? { [sortBy]: sortOrder === 'asc' ? 1 : -1 } : { createdAt: -1 };
        const products = await Product.find(query).populate('supplier', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort(sort);
        const total = await Product.countDocuments(query);
        res.json({ products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/summary', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const summary = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: { brand: '$brand', type: '$type' }, totalGood: { $sum: '$stock.goodQty' }, totalBad: { $sum: '$stock.badQty' }, totalDamage: { $sum: '$stock.damageQty' }, totalRepair: { $sum: '$stock.repairQty' }, totalValue: { $sum: { $multiply: ['$stock.goodQty', '$purchasePrice'] } }, count: { $sum: 1 } } },
            { $group: { _id: '$_id.brand', types: { $push: { type: '$_id.type', totalGood: '$totalGood', totalBad: '$totalBad', totalDamage: '$totalDamage', totalRepair: '$totalRepair', totalValue: '$totalValue', count: '$count' } }, grandTotalValue: { $sum: '$totalValue' } } }
        ]);
        res.json(summary);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('supplier', 'name');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { modelName, brand, type, purchasePrice, salesPrice, dealerPrice, supplier, description } = req.body;
        const product = await Product.create({ modelName, brand, type, purchasePrice, salesPrice, dealerPrice, supplier, description });
        res.status(201).json(product);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/stock', protect, authorize('Admin', 'Manager', 'Staff'), async (req, res) => {
    try {
        const { goodQty, badQty, damageQty, repairQty } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (goodQty !== undefined) product.stock.goodQty = goodQty;
        if (badQty !== undefined) product.stock.badQty = badQty;
        if (damageQty !== undefined) product.stock.damageQty = damageQty;
        if (repairQty !== undefined) product.stock.repairQty = repairQty;
        await product.save();
        res.json(product);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:id/transfer', protect, authorize('Admin', 'Manager', 'Staff'), async (req, res) => {
    try {
        const { from, to, qty } = req.body;
        const validConditions = ['goodQty', 'badQty', 'damageQty', 'repairQty'];
        if (!validConditions.includes(from) || !validConditions.includes(to)) return res.status(400).json({ message: 'Invalid condition type' });
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (product.stock[from] < qty) return res.status(400).json({ message: `Insufficient ${from} stock` });
        product.stock[from] -= qty;
        product.stock[to] += qty;
        await product.save();
        res.json(product);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id/usage', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        const activeReplacementsCount = await Replacement.countDocuments({ 'items.product': req.params.id, status: { $in: ['Pending', 'Checked', 'Sent to Factory'] } });
        const stockTotal = (product.stock?.goodQty || 0) + (product.stock?.badQty || 0) + (product.stock?.damageQty || 0) + (product.stock?.repairQty || 0);
        res.json({ activeReplacements: activeReplacementsCount, stockTotal, modelName: product.modelName });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
