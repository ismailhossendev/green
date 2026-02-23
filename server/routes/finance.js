const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const { authorize, canViewSensitive } = require('../middleware/rbac');

// ==================== LOANS ====================

// @route   GET /api/finance/loans
// @desc    Get all loans
// @access  Private (Admin only for sensitive data)
router.get('/loans', protect, canViewSensitive, async (req, res) => {
    try {
        const { type, status, page = 1, limit = 50 } = req.query;

        let query = {};
        if (type) query.type = type;
        if (status) query.status = status;

        const loans = await Loan.find(query)
            .populate('addedBy', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Loan.countDocuments(query);

        // Summary
        const summary = await Loan.aggregate([
            { $match: { status: 'Active' } },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalRemaining: { $sum: '$remainingAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            loans,
            summary,
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

// @route   POST /api/finance/loans
// @desc    Add new loan
// @access  Private (Admin)
router.post('/loans', protect, authorize('Admin'), async (req, res) => {
    try {
        const { type, borrower, borrowerRef, borrowerRefModel, amount, interestRate, conditions, dueDate } = req.body;

        const loan = await Loan.create({
            type,
            borrower,
            borrowerRef,
            borrowerRefModel,
            amount,
            remainingAmount: amount,
            interestRate,
            conditions,
            dueDate,
            addedBy: req.user._id
        });

        res.status(201).json(loan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/finance/loans/:id/payment
// @desc    Record loan payment
// @access  Private (Admin)
router.post('/loans/:id/payment', protect, authorize('Admin'), async (req, res) => {
    try {
        const { amount, description } = req.body;

        const loan = await Loan.findById(req.params.id);
        if (!loan) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        loan.paidAmount += amount;
        loan.remainingAmount = loan.amount - loan.paidAmount;

        if (loan.remainingAmount <= 0) {
            loan.status = 'Paid';
        }

        await loan.save();

        // Record payment
        await Payment.create({
            type: 'Loan',
            referenceId: loan._id,
            referenceModel: 'Loan',
            referenceName: loan.borrower,
            amount,
            description: description || `Loan payment for ${loan.borrower}`,
            addedBy: req.user._id
        });

        res.json(loan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== INVESTMENTS ====================

// @route   GET /api/finance/investments
// @desc    Get all investments
// @access  Private (Admin only)
router.get('/investments', protect, canViewSensitive, async (req, res) => {
    try {
        const { type, page = 1, limit = 50 } = req.query;

        let query = {};
        if (type) query.type = type;

        const investments = await Investment.find(query)
            .populate('addedBy', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ date: -1 });

        const total = await Investment.countDocuments(query);

        // Summary
        const summary = await Investment.aggregate([
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    totalCurrentValue: { $sum: '$currentValue' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const grandTotal = await Investment.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    totalCurrentValue: { $sum: '$currentValue' }
                }
            }
        ]);

        res.json({
            investments,
            summary,
            grandTotal: grandTotal[0] || { totalAmount: 0, totalCurrentValue: 0 },
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

// @route   POST /api/finance/investments
// @desc    Add new investment
// @access  Private (Admin)
router.post('/investments', protect, authorize('Admin'), async (req, res) => {
    try {
        const { type, description, amount, currentValue, date } = req.body;

        const investment = await Investment.create({
            type,
            description,
            amount,
            currentValue: currentValue || amount,
            date: date || new Date(),
            addedBy: req.user._id
        });

        res.status(201).json(investment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/finance/investments/:id
// @desc    Update investment
// @access  Private (Admin)
router.put('/investments/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const investment = await Investment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!investment) {
            return res.status(404).json({ message: 'Investment not found' });
        }

        res.json(investment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
