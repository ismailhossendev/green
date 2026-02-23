const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Ledger = require('../models/Ledger');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

// @route   GET /api/sales/invoices
// @desc    Get all invoices
// @access  Private
router.get('/invoices', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const { brand, customerId, startDate, endDate, page = 1, limit = 50, sortBy = 'createdAt' } = req.query;

        let query = {};

        if (brand) query.brand = brand;
        if (customerId) query.customer = customerId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Determine sort order
        let sortOrder = {};
        if (sortBy === 'invoiceNo') {
            sortOrder = { invoiceNo: -1 };
        } else {
            sortOrder = { createdAt: -1 };
        }

        const invoices = await Invoice.find(query)
            .populate('customer', 'name companyName phone district lastInvoiceDate')
            .populate('createdBy', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort(sortOrder);

        const total = await Invoice.countDocuments(query);

        // Calculate totals
        const totals = await Invoice.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalQty: { $sum: '$totalQty' },
                    totalAmount: { $sum: '$grandTotal' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDues: { $sum: '$dues' }
                }
            }
        ]);

        res.json({
            invoices,
            totals: totals[0] || { totalQty: 0, totalAmount: 0, totalPaid: 0, totalDues: 0 },
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

// @route   GET /api/sales/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/invoices/:id', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('customer')
            .populate('createdBy', 'name');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/sales/invoices
// @desc    Create new invoice
// @access  Private
router.post('/invoices', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const {
            customer,
            brand,
            priceType,
            items,
            discount,
            discountFixed,
            discountPercent,
            rebate,
            paidAmount,
            note,
            date // Allow custom date
        } = req.body;

        // Get customer's previous dues
        const customerData = await Customer.findById(customer);
        if (!customerData) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Calculate totals
        let totalQty = 0;
        let subTotal = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.productId}` });
            }

            // Check stock
            if (product.stock.goodQty < item.qty) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.modelName}. Available: ${product.stock.goodQty}`
                });
            }

            const itemTotal = item.qty * item.price;
            totalQty += item.qty;
            subTotal += itemTotal;

            processedItems.push({
                productId: item.productId,
                productName: product.modelName,
                type: product.type,
                qty: item.qty,
                price: item.price,
                total: itemTotal,
                isCombined: item.isCombined || false
            });

            // Reduce stock
            product.stock.goodQty -= item.qty;
            await product.save();
        }

        const grandTotal = subTotal - (discount || 0) - (rebate || 0);
        const currentDue = grandTotal - (paidAmount || 0);
        const totalCustomerDues = currentDue + (customerData.totalDues || 0);

        // Create invoice
        const invoice = await Invoice.create({
            customer,
            brand,
            date: date || new Date(),
            priceType,
            items: processedItems,
            totalQty,
            subTotal,
            discount: discount || 0,
            discountFixed: discountFixed || 0,
            discountPercent: discountPercent || 0,
            rebate: rebate || 0,
            previousDues: customerData.totalDues,
            grandTotal,
            paidAmount: paidAmount || 0,
            dues: currentDue,
            note,
            createdBy: req.user._id
        });

        // Update customer
        customerData.totalSalesQty += totalQty;
        customerData.totalSalesAmount += subTotal;
        customerData.totalPayment += paidAmount || 0;
        customerData.totalDues = totalCustomerDues;
        customerData.lastInvoiceNo = invoice.invoiceNo;
        customerData.lastInvoiceQty = totalQty;
        customerData.lastInvoiceAmount = grandTotal;
        customerData.lastInvoiceDate = new Date();
        await customerData.save();

        // Create ledger entry
        await Ledger.create({
            customer,
            brand,
            type: 'Invoice',
            referenceId: invoice._id,
            referenceNo: invoice.invoiceNo,
            debit: grandTotal,
            credit: paidAmount || 0,
            balance: totalCustomerDues,
            description: `Invoice ${invoice.invoiceNo}`,
            addedBy: req.user._id
        });

        res.status(201).json(invoice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/sales/party-wise
// @desc    Get party-wise sales
// @access  Private
router.get('/party-wise', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchQuery = {};
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        const partySales = await Invoice.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$customer',
                    totalInvoices: { $sum: 1 },
                    totalQty: { $sum: '$totalQty' },
                    totalAmount: { $sum: '$grandTotal' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDues: { $sum: '$dues' }
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
                    totalInvoices: 1,
                    totalQty: 1,
                    totalAmount: 1,
                    totalPaid: 1,
                    totalDues: 1
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.json(partySales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/sales/district-wise
// @desc    Get district-wise sales summary
// @access  Private
router.get('/district-wise', protect, canAccessModule('sales'), async (req, res) => {
    try {
        const districtSales = await Invoice.aggregate([
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customerData'
                }
            },
            { $unwind: '$customerData' },
            {
                $group: {
                    _id: '$customerData.district',
                    totalInvoices: { $sum: 1 },
                    totalQty: { $sum: '$totalQty' },
                    totalAmount: { $sum: '$grandTotal' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDues: { $sum: '$dues' },
                    customerCount: { $addToSet: '$customer' }
                }
            },
            {
                $project: {
                    _id: 1,
                    district: '$_id',
                    totalInvoices: 1,
                    totalQty: 1,
                    totalAmount: 1,
                    totalPaid: 1,
                    totalDues: 1,
                    customerCount: { $size: '$customerCount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.json(districtSales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/sales/invoices/:id
// @desc    Delete invoice and rollback stock/ledger
// @access  Private (Admin only)
router.delete('/invoices/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // 1. Rollback Stock
        for (const item of invoice.items) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock.goodQty += item.qty;
                await product.save();
            }
        }

        // 2. Rollback Customer Data
        const customer = await Customer.findById(invoice.customer);
        if (customer) {
            customer.totalSalesQty -= invoice.totalQty;
            customer.totalSalesAmount -= invoice.subTotal;
            customer.totalPayment -= invoice.paidAmount;
            customer.totalDues -= invoice.dues;
            // Update last invoice (optional, slightly complex to revert perfectly so leaving as is or just clearing if it was the last one)
            await customer.save();
        }

        // 3. Delete Ledger Entry
        await Ledger.findOneAndDelete({
            referenceId: invoice._id,
            type: 'Invoice'
        });

        // 4. Delete Invoice
        await Invoice.findByIdAndDelete(req.params.id);

        res.json({ message: 'Invoice deleted and rolled back successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
