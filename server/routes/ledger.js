const express = require('express');
const router = express.Router();
const Ledger = require('../models/Ledger');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

// @route   GET /api/ledger
// @desc    Get ledger entries with filters
// @access  Private
router.get('/', protect, canAccessModule('ledger'), async (req, res) => {
    try {
        const { customerId, brand, startDate, endDate, month, year, page = 1, limit = 100 } = req.query;

        let query = {};

        if (customerId) query.customer = customerId;
        if (brand) query.brand = brand;

        // Date filtering
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        } else if (month && year) {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);
            query.date = { $gte: startOfMonth, $lte: endOfMonth };
        } else if (year) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31, 23, 59, 59);
            query.date = { $gte: startOfYear, $lte: endOfYear };
        }

        const entries = await Ledger.find(query)
            .populate('customer', 'name phone')
            .populate('addedBy', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ date: -1 });

        const total = await Ledger.countDocuments(query);

        // Calculate summary
        const summary = await Ledger.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalDebit: { $sum: '$debit' },
                    totalCredit: { $sum: '$credit' },
                    balance: { $last: '$balance' }
                }
            }
        ]);

        res.json({
            entries,
            summary: summary[0] || { totalDebit: 0, totalCredit: 0, balance: 0 },
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

// @route   GET /api/ledger/customer/:customerId
// @desc    Get customer ledger (formatted)
// @access  Private
router.get('/customer/:customerId', protect, canAccessModule('ledger'), async (req, res) => {
    try {
        const { brand, startDate, endDate } = req.query;

        let query = { customer: req.params.customerId };
        if (brand) query.brand = brand;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const customer = await Customer.findById(req.params.customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const entries = await Ledger.find(query)
            .populate('addedBy', 'name')
            .sort({ date: 1 });

        // Populate invoice data for Invoice-type entries
        const Invoice = require('../models/Invoice');
        const invoiceIds = entries
            .filter(e => e.type === 'Invoice' && e.referenceId)
            .map(e => e.referenceId);
        const invoices = invoiceIds.length > 0
            ? await Invoice.find({ _id: { $in: invoiceIds } }).select('totalQty grandTotal paidAmount invoiceNo')
            : [];
        const invoiceMap = {};
        invoices.forEach(inv => { invoiceMap[inv._id.toString()] = inv; });

        // Calculate running balance
        let runningBalance = 0;
        const formattedEntries = entries.map(entry => {
            const obj = entry.toObject();
            runningBalance = runningBalance + entry.debit - entry.credit;

            // For Invoice entries, attach qty data from the invoice
            if (entry.type === 'Invoice' && entry.referenceId) {
                const inv = invoiceMap[entry.referenceId.toString()];
                if (inv) {
                    obj.totalQty = inv.totalQty;
                }
            }

            return {
                ...obj,
                runningBalance
            };
        });

        res.json({
            customer: {
                name: customer.name,
                companyName: customer.companyName,
                phone: customer.phone,
                address: customer.address,
                district: customer.district
            },
            entries: formattedEntries,
            closingBalance: runningBalance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/ledger/brand/:brand
// @desc    Get brand-wise ledger summary
// @access  Private
router.get('/brand/:brand', protect, canAccessModule('ledger'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchQuery = { brand: req.params.brand };
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        const summary = await Ledger.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$customer',
                    totalDebit: { $sum: '$debit' },
                    totalCredit: { $sum: '$credit' },
                    balance: { $last: '$balance' },
                    lastTransaction: { $last: '$date' }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            {
                $project: {
                    _id: 1,
                    name: '$customer.name',
                    phone: '$customer.phone',
                    district: '$customer.district',
                    totalDebit: 1,
                    totalCredit: 1,
                    balance: 1,
                    lastTransaction: 1
                }
            },
            { $sort: { balance: -1 } }
        ]);

        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/ledger/payment
// @desc    Record a payment in ledger
// @access  Private
router.post('/payment', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const { customerId, brand, amount, description } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Get previous balance
        const lastEntry = await Ledger.findOne({ customer: customerId, brand })
            .sort({ date: -1 });

        const previousBalance = lastEntry ? lastEntry.balance : customer.totalDues;
        const newBalance = previousBalance - amount;

        // Create ledger entry
        const entry = await Ledger.create({
            customer: customerId,
            brand,
            type: 'Payment',
            debit: 0,
            credit: amount,
            balance: newBalance,
            description: description || 'Payment received',
            addedBy: req.user._id
        });

        // Update customer
        customer.totalPayment += amount;
        customer.totalDues = newBalance;
        await customer.save();

        res.status(201).json(entry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/ledger/adjustment
// @desc    Record an adjustment in ledger
// @access  Private (Admin, Manager)
router.post('/adjustment', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { customerId, brand, amount, type, description } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Get previous balance
        const lastEntry = await Ledger.findOne({ customer: customerId, brand })
            .sort({ date: -1 });

        const previousBalance = lastEntry ? lastEntry.balance : customer.totalDues;
        const debit = type === 'debit' ? amount : 0;
        const credit = type === 'credit' ? amount : 0;
        const newBalance = previousBalance + debit - credit;

        // Create ledger entry
        const entry = await Ledger.create({
            customer: customerId,
            brand,
            type: 'Adjustment',
            debit,
            credit,
            balance: newBalance,
            description: description || 'Adjustment',
            addedBy: req.user._id
        });

        // Update customer
        customer.totalAdjust += credit - debit;
        customer.totalDues = newBalance;
        await customer.save();

        res.status(201).json(entry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
