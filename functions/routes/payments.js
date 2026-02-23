const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Purchase = require('../models/Purchase');
const Ledger = require('../models/Ledger');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

router.get('/', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const { type, startDate, endDate, page = 1, limit = 50 } = req.query;
        let query = {};
        if (type) query.type = type;
        if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
        const payments = await Payment.find(query).populate('addedBy', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
        const total = await Payment.countDocuments(query);
        const summary = await Payment.aggregate([{ $match: query }, { $group: { _id: '$type', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }]);
        const grandTotal = await Payment.aggregate([{ $match: query }, { $group: { _id: null, totalAmount: { $sum: '$amount' } } }]);
        res.json({ payments, summary, grandTotal: grandTotal[0]?.totalAmount || 0, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/supplier', protect, canAccessModule('purchase'), async (req, res) => {
    try {
        const { supplierId, amount, paymentMethod, description } = req.body;
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        const payment = await Payment.create({ type: 'Supplier', referenceId: supplierId, referenceModel: 'Supplier', referenceName: supplier.name, amount, paymentMethod, description: description || `Payment to ${supplier.name}`, addedBy: req.user._id });
        supplier.totalPayment += amount; supplier.totalDues -= amount; await supplier.save();
        res.status(201).json(payment);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/purchase', protect, canAccessModule('purchase'), async (req, res) => {
    try {
        const { purchaseId, amount, paymentMethod, description } = req.body;
        const purchase = await Purchase.findById(purchaseId).populate('supplier');
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
        const payment = await Payment.create({ type: 'Purchase', referenceId: purchaseId, referenceModel: 'Purchase', referenceName: purchase.supplier.name, referenceNo: purchase.purchaseNo, amount, paymentMethod, description: description || `Payment for ${purchase.purchaseNo}`, addedBy: req.user._id });
        purchase.paidAmount += amount; purchase.dues -= amount; await purchase.save();
        const supplier = await Supplier.findById(purchase.supplier._id);
        supplier.totalPayment += amount; supplier.totalDues -= amount; await supplier.save();
        res.status(201).json(payment);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/dealer', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const { customerId, brand, amount, paymentMethod, description } = req.body;
        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        const lastEntry = await Ledger.findOne({ customer: customerId, brand }).sort({ date: -1 });
        const previousBalance = lastEntry ? lastEntry.balance : customer.totalDues;
        const newBalance = previousBalance - amount;
        const payment = await Payment.create({ type: customer.type === 'Dealer' ? 'Dealer' : 'Customer', referenceId: customerId, referenceModel: 'Customer', referenceName: customer.name, amount, paymentMethod, description: description || `Payment from ${customer.name}`, addedBy: req.user._id });
        await Ledger.create({ customer: customerId, brand, type: 'Payment', referenceId: payment._id, debit: 0, credit: amount, balance: newBalance, description: description || 'Payment received', addedBy: req.user._id });
        customer.totalPayment += amount; customer.totalDues = newBalance; await customer.save();
        res.status(201).json(payment);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/employee', protect, authorize('Admin'), async (req, res) => {
    try {
        const { employeeId, amount, paymentMethod, description } = req.body;
        const employee = await User.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        const payment = await Payment.create({ type: 'Employee', referenceId: employeeId, referenceModel: 'User', referenceName: employee.name, amount, paymentMethod, description: description || `Salary payment to ${employee.name}`, addedBy: req.user._id });
        res.status(201).json(payment);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/others', protect, canAccessModule('finance'), async (req, res) => {
    try {
        const { referenceName, amount, paymentMethod, description } = req.body;
        const payment = await Payment.create({ type: 'Others', referenceName, amount, paymentMethod, description, addedBy: req.user._id });
        res.status(201).json(payment);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
