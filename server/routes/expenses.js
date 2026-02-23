const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/', protect, canAccessModule('expenses'), async (req, res) => {
    try {
        const { category, startDate, endDate, page = 1, limit = 50 } = req.query;

        let query = {};

        if (category) query.category = category;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const expenses = await Expense.find(query)
            .populate('addedBy', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ date: -1 });

        const total = await Expense.countDocuments(query);

        // Calculate totals
        const totals = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            expenses,
            total: totals[0]?.totalAmount || 0,
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

// @route   GET /api/expenses/summary
// @desc    Get expense summary by category
// @access  Private
router.get('/summary', protect, canAccessModule('expenses'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchQuery = {};
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        const summary = await Expense.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        const grandTotal = summary.reduce((acc, item) => acc + item.totalAmount, 0);

        res.json({
            byCategory: summary,
            grandTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/expenses
// @desc    Add new expense
// @access  Private
router.post('/', protect, canAccessModule('expenses'), async (req, res) => {
    try {
        const { category, amount, description, reference, date } = req.body;

        const expense = await Expense.create({
            category,
            amount,
            description,
            reference,
            date: date || new Date(),
            addedBy: req.user._id
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private (Admin, Manager)
router.put('/:id', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        res.json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private (Admin)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
