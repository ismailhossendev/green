const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

router.get('/', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const { type, search, page = 1, limit = 50 } = req.query;
        let query = { isActive: true };
        if (type) query.type = type;
        if (search) { query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }]; }
        const suppliers = await Supplier.find(query).skip((page - 1) * limit).limit(parseInt(limit)).sort({ name: 1 });
        const total = await Supplier.countDocuments(query);
        res.json({ suppliers, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/summary', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const summary = await Supplier.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$type', count: { $sum: 1 }, totalPurchase: { $sum: '$totalPurchaseAmount' }, totalPayment: { $sum: '$totalPayment' }, totalDues: { $sum: '$totalDues' } } }]);
        const grandTotal = await Supplier.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, totalSuppliers: { $sum: 1 }, totalPurchase: { $sum: '$totalPurchaseAmount' }, totalPayment: { $sum: '$totalPayment' }, totalDues: { $sum: '$totalDues' } } }]);
        res.json({ byType: summary, total: grandTotal[0] || { totalSuppliers: 0, totalPurchase: 0, totalPayment: 0, totalDues: 0 } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', protect, canAccessModule('inventory'), async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json(supplier);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { name, phone, email, address, type } = req.body;
        const supplier = await Supplier.create({ name, phone, email, address, type: type || 'Product' });
        res.status(201).json(supplier);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json(supplier);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
