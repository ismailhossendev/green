const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { canAccessModule } = require('../middleware/rbac');

router.get('/', protect, canAccessModule('purchase'), async (req, res) => {
    try {
        const { brand, supplierId, startDate, endDate, page = 1, limit = 50 } = req.query;
        let query = {};
        if (brand) query.brand = brand;
        if (supplierId) query.supplier = supplierId;
        if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
        const purchases = await Purchase.find(query).populate('supplier', 'name phone').populate('createdBy', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
        const total = await Purchase.countDocuments(query);
        const totals = await Purchase.aggregate([{ $match: query }, { $group: { _id: null, totalQty: { $sum: '$totalQty' }, totalAmount: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' }, totalDues: { $sum: '$dues' } } }]);
        res.json({ purchases, totals: totals[0] || { totalQty: 0, totalAmount: 0, totalPaid: 0, totalDues: 0 }, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/supplier-wise', protect, canAccessModule('purchase'), async (req, res) => {
    try {
        const supplierPurchases = await Purchase.aggregate([{ $group: { _id: '$supplier', totalPurchases: { $sum: 1 }, totalQty: { $sum: '$totalQty' }, totalAmount: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' }, totalDues: { $sum: '$dues' } } }, { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'supplier' } }, { $unwind: '$supplier' }, { $project: { _id: 1, name: '$supplier.name', phone: '$supplier.phone', type: '$supplier.type', totalPurchases: 1, totalQty: 1, totalAmount: 1, totalPaid: 1, totalDues: 1 } }, { $sort: { totalAmount: -1 } }]);
        res.json(supplierPurchases);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', protect, canAccessModule('purchase'), async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id).populate('supplier').populate('createdBy', 'name');
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
        res.json(purchase);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', protect, canAccessModule('purchase'), async (req, res) => {
    try {
        const { supplier, brand, items, paidAmount, note } = req.body;
        const supplierData = await Supplier.findById(supplier);
        if (!supplierData) return res.status(404).json({ message: 'Supplier not found' });
        let totalQty = 0, totalAmount = 0;
        const processedItems = [];
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: `Product not found: ${item.productId}` });
            const itemTotal = item.qty * item.price;
            totalQty += item.qty; totalAmount += itemTotal;
            processedItems.push({ productId: item.productId, productName: product.modelName, type: product.type, qty: item.qty, price: item.price, total: itemTotal });
            product.stock.goodQty += item.qty;
            await product.save();
        }
        const dues = totalAmount - (paidAmount || 0);
        const purchase = await Purchase.create({ supplier, brand, items: processedItems, totalQty, totalAmount, paidAmount: paidAmount || 0, dues, note, createdBy: req.user._id });
        supplierData.totalPurchaseAmount += totalAmount; supplierData.totalPayment += paidAmount || 0; supplierData.totalDues += dues; supplierData.lastPurchaseNo = purchase.purchaseNo; supplierData.lastPurchaseAmount = totalAmount; supplierData.lastPurchaseDate = new Date();
        await supplierData.save();
        res.status(201).json(purchase);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
