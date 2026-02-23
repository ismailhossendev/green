const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { authorize, canViewSensitive } = require('../middleware/rbac');

// @route   GET /api/reports/profit-loss
// @desc    Get Profit/Loss report
// @access  Private (Admin only)
router.get('/profit-loss', protect, canViewSensitive, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateQuery = {};
        if (startDate || endDate) {
            dateQuery.date = {};
            if (startDate) dateQuery.date.$gte = new Date(startDate);
            if (endDate) dateQuery.date.$lte = new Date(endDate);
        }

        // Total Sales
        const sales = await Invoice.aggregate([
            { $match: { ...dateQuery, status: 'Confirmed' } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$subTotal' },
                    totalDiscount: { $sum: '$discount' },
                    totalRebate: { $sum: '$rebate' }
                }
            }
        ]);

        // Total Purchases (Cost of Goods)
        const purchases = await Purchase.aggregate([
            { $match: { ...dateQuery, status: 'Received' } },
            {
                $group: {
                    _id: null,
                    totalPurchases: { $sum: '$totalAmount' }
                }
            }
        ]);

        // Total Expenses
        const expenses = await Expense.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: '$amount' }
                }
            }
        ]);

        // Expense breakdown
        const expenseBreakdown = await Expense.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: '$category',
                    amount: { $sum: '$amount' }
                }
            },
            { $sort: { amount: -1 } }
        ]);

        const salesData = sales[0] || { totalSales: 0, totalDiscount: 0, totalRebate: 0 };
        const purchaseData = purchases[0] || { totalPurchases: 0 };
        const expenseData = expenses[0] || { totalExpenses: 0 };

        const netSales = salesData.totalSales - salesData.totalDiscount - salesData.totalRebate;
        const grossProfit = netSales - purchaseData.totalPurchases;
        const netProfit = grossProfit - expenseData.totalExpenses;

        res.json({
            revenue: {
                totalSales: salesData.totalSales,
                discount: salesData.totalDiscount,
                rebate: salesData.totalRebate,
                netSales
            },
            costs: {
                purchaseCost: purchaseData.totalPurchases,
                grossProfit
            },
            expenses: {
                totalExpenses: expenseData.totalExpenses,
                breakdown: expenseBreakdown
            },
            netProfit,
            profitMargin: netSales > 0 ? ((netProfit / netSales) * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/sales
// @desc    Get Sales report
// @access  Private
router.get('/sales', protect, async (req, res) => {
    try {
        const { startDate, endDate, brand, groupBy = 'day' } = req.query;

        let matchQuery = { status: 'Confirmed' };
        if (brand) matchQuery.brand = brand;
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        let groupId;
        if (groupBy === 'day') {
            groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        } else if (groupBy === 'month') {
            groupId = { $dateToString: { format: '%Y-%m', date: '$date' } };
        } else if (groupBy === 'year') {
            groupId = { $dateToString: { format: '%Y', date: '$date' } };
        }

        const salesReport = await Invoice.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: groupId,
                    totalInvoices: { $sum: 1 },
                    totalQty: { $sum: '$totalQty' },
                    totalAmount: { $sum: '$grandTotal' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDues: { $sum: '$dues' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // Brand-wise breakdown
        const brandBreakdown = await Invoice.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$brand',
                    totalInvoices: { $sum: 1 },
                    totalAmount: { $sum: '$grandTotal' }
                }
            }
        ]);

        res.json({
            salesReport,
            brandBreakdown
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/purchase
// @desc    Get Purchase report
// @access  Private
router.get('/purchase', protect, async (req, res) => {
    try {
        const { startDate, endDate, brand, groupBy = 'day' } = req.query;

        let matchQuery = { status: 'Received' };
        if (brand) matchQuery.brand = brand;
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        let groupId;
        if (groupBy === 'day') {
            groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        } else if (groupBy === 'month') {
            groupId = { $dateToString: { format: '%Y-%m', date: '$date' } };
        } else if (groupBy === 'year') {
            groupId = { $dateToString: { format: '%Y', date: '$date' } };
        }

        const purchaseReport = await Purchase.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: groupId,
                    totalPurchases: { $sum: 1 },
                    totalQty: { $sum: '$totalQty' },
                    totalAmount: { $sum: '$totalAmount' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDues: { $sum: '$dues' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json(purchaseReport);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/dues/customers
// @desc    Get Customer Dues report
// @access  Private
router.get('/dues/customers', protect, async (req, res) => {
    try {
        const { brand, district } = req.query;

        let matchQuery = { isActive: true, totalDues: { $gt: 0 } };
        if (brand) matchQuery.brand = { $in: [brand, 'Both'] };
        if (district) matchQuery.district = district;

        const customerDues = await Customer.find(matchQuery)
            .select('name phone district type totalDues lastInvoiceNo lastInvoiceAmount lastInvoiceDate')
            .sort({ totalDues: -1 });

        const summary = await Customer.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    totalDues: { $sum: '$totalDues' }
                }
            }
        ]);

        res.json({
            customers: customerDues,
            summary: summary[0] || { totalCustomers: 0, totalDues: 0 }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/dues/suppliers
// @desc    Get Supplier Dues report
// @access  Private
router.get('/dues/suppliers', protect, async (req, res) => {
    try {
        const supplierDues = await Supplier.find({ isActive: true, totalDues: { $gt: 0 } })
            .select('name phone type totalDues lastPurchaseNo lastPurchaseAmount lastPurchaseDate')
            .sort({ totalDues: -1 });

        const summary = await Supplier.aggregate([
            { $match: { isActive: true, totalDues: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    totalSuppliers: { $sum: 1 },
                    totalDues: { $sum: '$totalDues' }
                }
            }
        ]);

        res.json({
            suppliers: supplierDues,
            summary: summary[0] || { totalSuppliers: 0, totalDues: 0 }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/collection
// @desc    Get Collection report
// @access  Private
router.get('/collection', protect, async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        let matchQuery = { type: { $in: ['Dealer', 'Customer'] } };
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        let groupId;
        if (groupBy === 'day') {
            groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        } else if (groupBy === 'month') {
            groupId = { $dateToString: { format: '%Y-%m', date: '$date' } };
        }

        const collectionReport = await Payment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: groupId,
                    totalCollection: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const grandTotal = await Payment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalCollection: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            collectionReport,
            grandTotal: grandTotal[0]?.totalCollection || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/collection/party-wise
// @desc    Get Party-wise Collection report
// @access  Private
router.get('/collection/party-wise', protect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchQuery = { type: { $in: ['Dealer', 'Customer'] } };
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        const partyCollection = await Payment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$referenceId',
                    name: { $first: '$referenceName' },
                    totalCollection: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalCollection: -1 } }
        ]);

        res.json(partyCollection);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/expense
// @desc    Get Expense report
// @access  Private
router.get('/expense', protect, async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;

        let matchQuery = {};
        if (category) matchQuery.category = category;
        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        const expenseReport = await Expense.aggregate([
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

        const grandTotal = await Expense.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            expenseReport,
            grandTotal: grandTotal[0]?.totalAmount || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/assets
// @desc    Get Asset summary
// @access  Private (Admin)
router.get('/assets', protect, canViewSensitive, async (req, res) => {
    try {
        // Product values
        const productValue = await Product.aggregate([
            { $match: { isActive: true, type: 'Product' } },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ['$stock.goodQty', '$purchasePrice'] } }
                }
            }
        ]);

        // Packet values
        const packetValue = await Product.aggregate([
            { $match: { isActive: true, type: 'Packet' } },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ['$stock.goodQty', '$purchasePrice'] } }
                }
            }
        ]);

        // Market dues (from customers)
        const marketDues = await Customer.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalDues: { $sum: '$totalDues' }
                }
            }
        ]);

        // Supplier dues (liability)
        const supplierDues = await Supplier.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalDues: { $sum: '$totalDues' }
                }
            }
        ]);

        res.json({
            assets: {
                productValue: productValue[0]?.totalValue || 0,
                packetValue: packetValue[0]?.totalValue || 0,
                marketDues: marketDues[0]?.totalDues || 0
            },
            liabilities: {
                supplierDues: supplierDues[0]?.totalDues || 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/stock-summary
// @desc    Get Monthly Stock Summary Report
// @access  Private
router.get('/stock-summary', protect, async (req, res) => {
    try {
        const { month, year, brand } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Get all products for the brand
        let productQuery = { isActive: true };
        if (brand) productQuery.brand = brand;

        const products = await Product.find(productQuery)
            .select('modelName type purchasePrice stock brand')
            .sort({ type: 1, modelName: 1 });

        // Get purchases (receive) within the month
        let purchaseQuery = { status: 'Received', date: { $gte: startDate, $lte: endDate } };
        if (brand) purchaseQuery.brand = brand;

        const purchaseItems = await Purchase.aggregate([
            { $match: purchaseQuery },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    receiveQty: { $sum: '$items.qty' },
                    receiveValue: { $sum: '$items.total' }
                }
            }
        ]);

        // Get sales within the month
        let salesQuery = { status: 'Confirmed', date: { $gte: startDate, $lte: endDate } };
        if (brand) salesQuery.brand = brand;

        const salesItems = await Invoice.aggregate([
            { $match: salesQuery },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    salesQty: { $sum: '$items.qty' },
                    salesValue: { $sum: '$items.total' }
                }
            }
        ]);

        // Get replacements/returns within the month
        const Replacement = require('../models/Replacement');
        let replacementQuery = { date: { $gte: startDate, $lte: endDate } };
        if (brand) replacementQuery.brand = brand;

        const returnItems = await Replacement.aggregate([
            { $match: replacementQuery },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    returnQty: { $sum: { $add: ['$items.goodQty', '$items.badQty', '$items.damageQty', '$items.repairQty'] } }
                }
            }
        ]);

        // Build lookup maps
        const purchaseMap = {};
        purchaseItems.forEach(p => { purchaseMap[p._id.toString()] = p; });

        const salesMap = {};
        salesItems.forEach(s => { salesMap[s._id.toString()] = s; });

        const returnMap = {};
        returnItems.forEach(r => { returnMap[r._id.toString()] = r; });

        // Build summary data
        const summary = [];
        let serial = 1;

        for (const product of products) {
            const pid = product._id.toString();
            const purchase = purchaseMap[pid] || { receiveQty: 0, receiveValue: 0 };
            const sale = salesMap[pid] || { salesQty: 0, salesValue: 0 };
            const returnData = returnMap[pid] || { returnQty: 0 };

            const currentStock = product.stock.goodQty;
            // Opening = Current Stock + Sales - Purchases + Returns (reverse calculate)
            const openingQty = currentStock + sale.salesQty - purchase.receiveQty + returnData.returnQty;
            const openingValue = openingQty * product.purchasePrice;
            const closingQty = openingQty + purchase.receiveQty - sale.salesQty - returnData.returnQty;
            const closingValue = closingQty * product.purchasePrice;
            const returnValue = returnData.returnQty * product.purchasePrice;

            // Only include products that had any activity or have stock
            if (openingQty > 0 || purchase.receiveQty > 0 || sale.salesQty > 0 || returnData.returnQty > 0 || currentStock > 0) {
                summary.push({
                    sl: serial++,
                    type: product.type,
                    model: product.modelName,
                    buyPrice: product.purchasePrice,
                    openingQty,
                    openingValue,
                    receiveQty: purchase.receiveQty,
                    receiveValue: purchase.receiveValue,
                    salesQty: sale.salesQty,
                    salesValue: sale.salesValue,
                    returnQty: returnData.returnQty,
                    returnValue,
                    closingQty,
                    closingValue
                });
            }
        }

        // Group by type
        const grouped = {};
        summary.forEach(item => {
            if (!grouped[item.type]) grouped[item.type] = [];
            grouped[item.type].push(item);
        });

        // Calculate type-wise totals
        const typeTotals = {};
        Object.keys(grouped).forEach(type => {
            typeTotals[type] = grouped[type].reduce((acc, item) => ({
                openingQty: acc.openingQty + item.openingQty,
                openingValue: acc.openingValue + item.openingValue,
                receiveQty: acc.receiveQty + item.receiveQty,
                receiveValue: acc.receiveValue + item.receiveValue,
                salesQty: acc.salesQty + item.salesQty,
                salesValue: acc.salesValue + item.salesValue,
                returnQty: acc.returnQty + item.returnQty,
                returnValue: acc.returnValue + item.returnValue,
                closingQty: acc.closingQty + item.closingQty,
                closingValue: acc.closingValue + item.closingValue
            }), {
                openingQty: 0, openingValue: 0,
                receiveQty: 0, receiveValue: 0,
                salesQty: 0, salesValue: 0,
                returnQty: 0, returnValue: 0,
                closingQty: 0, closingValue: 0
            });
        });

        // Grand totals
        const grandTotals = summary.reduce((acc, item) => ({
            openingQty: acc.openingQty + item.openingQty,
            openingValue: acc.openingValue + item.openingValue,
            receiveQty: acc.receiveQty + item.receiveQty,
            receiveValue: acc.receiveValue + item.receiveValue,
            salesQty: acc.salesQty + item.salesQty,
            salesValue: acc.salesValue + item.salesValue,
            returnQty: acc.returnQty + item.returnQty,
            returnValue: acc.returnValue + item.returnValue,
            closingQty: acc.closingQty + item.closingQty,
            closingValue: acc.closingValue + item.closingValue
        }), {
            openingQty: 0, openingValue: 0,
            receiveQty: 0, receiveValue: 0,
            salesQty: 0, salesValue: 0,
            returnQty: 0, returnValue: 0,
            closingQty: 0, closingValue: 0
        });

        res.json({
            summary,
            grouped,
            typeTotals,
            grandTotals,
            month: parseInt(month),
            year: parseInt(year)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
