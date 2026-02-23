const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const { brand, type, district, search, page = 1, limit = 50 } = req.query;

        let query = { isActive: true };

        if (brand && brand !== 'Both') query.brand = { $in: [brand, 'Both'] };
        if (type) query.type = type;
        if (district) query.district = district;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const customers = await Customer.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ name: 1 });

        const total = await Customer.countDocuments(query);

        res.json({
            customers,
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

// @route   GET /api/customers/summary
// @desc    Get customer summary (all customers with sales/payment/dues)
// @access  Private
router.get('/summary', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const { brand, type, district } = req.query;

        let match = { isActive: true };
        if (brand) match.brand = { $in: [brand, 'Both'] };
        if (type) match.type = type;
        if (district) match.district = district;

        const summary = await Customer.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    totalSalesQty: { $sum: '$totalSalesQty' },
                    totalSalesAmount: { $sum: '$totalSalesAmount' },
                    totalPayment: { $sum: '$totalPayment' },
                    totalAdjust: { $sum: '$totalAdjust' },
                    totalDues: { $sum: '$totalDues' }
                }
            }
        ]);

        res.json(summary[0] || {
            totalCustomers: 0,
            totalSalesQty: 0,
            totalSalesAmount: 0,
            totalPayment: 0,
            totalAdjust: 0,
            totalDues: 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/customers/district-summary
// @desc    Get district-wise customer summary
// @access  Private
router.get('/district-summary', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const summary = await Customer.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$district',
                    customerCount: { $sum: 1 },
                    totalSalesQty: { $sum: '$totalSalesQty' },
                    totalSalesAmount: { $sum: '$totalSalesAmount' },
                    totalPayment: { $sum: '$totalPayment' },
                    totalDues: { $sum: '$totalDues' }
                }
            },
            { $sort: { totalSalesAmount: -1 } }
        ]);

        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/customers/districts
// @desc    Get list of all districts
// @access  Private
router.get('/districts', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const districts = await Customer.distinct('district');
        res.json(districts.filter(d => d));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/customers
// @desc    Add new customer
// @access  Private
router.post('/', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const { name, phone, email, address, district, brand, type } = req.body;

        const customer = await Customer.create({
            name,
            phone,
            email,
            address,
            district,
            brand: brand || 'Both',
            type: type || 'Retail'
        });

        // Handle opening dues if provided
        if (req.body.openingDues && parseFloat(req.body.openingDues) > 0) {
            const amount = parseFloat(req.body.openingDues);
            customer.totalDues = amount;
            customer.totalAdjust = amount; // Track as adjustment
            await customer.save();

            // Create Opening Balance Ledger Entry
            const Ledger = require('../models/Ledger');
            await Ledger.create({
                customer: customer._id,
                brand: customer.brand,
                type: 'Opening',
                referenceId: customer._id,
                debit: amount,
                credit: 0,
                balance: amount,
                description: 'Opening Balance',
                addedBy: req.user._id
            });
        }

        res.status(201).json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', protect, canAccessModule('customers'), async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
