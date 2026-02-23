const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const { canAccessModule } = require('../middleware/rbac');

router.get('/', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const { category, startDate, endDate, page = 1, limit = 50 } = req.query;
        let query = {};
        if (category) query.category = category;
        if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
        const expenses = await Expense.find(query).populate('addedBy', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
        const total = await Expense.countDocuments(query);
        res.json({ expenses, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/summary', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};
        if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
        const summary = await Expense.aggregate([{ $match: query }, { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { totalAmount: -1 } }]);
        const grandTotal = await Expense.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
        res.json({ summary, grandTotal: grandTotal[0]?.total || 0, count: grandTotal[0]?.count || 0 });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const { category, description, amount, paymentMethod, date } = req.body;
        const expense = await Expense.create({ category, description, amount, paymentMethod, date: date || new Date(), addedBy: req.user._id });
        res.status(201).json(expense);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json(expense);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
