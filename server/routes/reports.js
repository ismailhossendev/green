const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Investment = require('../models/Investment');
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
        
        // Investment assets (Fixed Assets, Cash, etc.)
        const investments = await Investment.find({}).sort({ date: -1 });
        
        const investmentSummary = await Investment.aggregate([
            {
                $group: {
                    _id: '$type',
                    initialAmount: { $sum: '$amount' },
                    currentValue: { $sum: '$currentValue' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            inventory: {
                productValue: productValue[0]?.totalValue || 0,
                packetValue: packetValue[0]?.totalValue || 0,
            },
            market: {
                customerDues: marketDues[0]?.totalDues || 0,
                supplierDues: supplierDues[0]?.totalDues || 0
            },
            investments: {
                details: investments,
                summary: investmentSummary
            },
            summary: {
                totalAssets: (productValue[0]?.totalValue || 0) + 
                             (packetValue[0]?.totalValue || 0) + 
                             (marketDues[0]?.totalDues || 0) + 
                             (investmentSummary.reduce((acc, i) => acc + i.currentValue, 0)),
                totalLiabilities: (supplierDues[0]?.totalDues || 0),
                netWorth: ((productValue[0]?.totalValue || 0) + 
                          (packetValue[0]?.totalValue || 0) + 
                          (marketDues[0]?.totalDues || 0) + 
                          (investmentSummary.reduce((acc, i) => acc + i.currentValue, 0))) - 
                         (supplierDues[0]?.totalDues || 0)
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

// @route   GET /api/reports/party-summary
// @desc    Get date-ranged summary for all customers or suppliers
// @access  Private
router.get('/party-summary', protect, async (req, res) => {
    try {
        const { type, startDate, endDate, brand, customerType } = req.query;
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        
        if (type === 'customer' || type === 'Dealer') {
            const Ledger = require('../models/Ledger');
            const Customer = require('../models/Customer');

            // 1. Get all customers
            let custQuery = { isActive: true };
            if (brand && brand !== 'Both') custQuery.brand = { $in: [brand, 'Both'] };
            if (customerType) custQuery.type = customerType;
            
            const customers = await Customer.find(custQuery).select('name district companyName totalDues type');

            // 2. Aggregate Ledger Activity
            const activity = await Ledger.aggregate([
                { $match: { 
                    brand: brand === 'Both' ? { $exists: true } : brand,
                    date: { $lte: end }
                }},
                { $group: {
                    _id: '$customer',
                    opening: { $sum: { $cond: [{ $lt: ['$date', start] }, { $subtract: ['$debit', '$credit'] }, 0] } },
                    sales: { $sum: { $cond: [{ $and: [{ $gte: ['$date', start] }, { $eq: ['$type', 'Invoice'] }] }, '$debit', 0] } },
                    payments: { $sum: { $cond: [{ $and: [{ $gte: ['$date', start] }, { $eq: ['$type', 'Payment'] }] }, '$credit', 0] } },
                    returns: { $sum: { $cond: [{ $and: [{ $gte: ['$date', start] }, { $in: ['$type', ['Return', 'Replacement', 'Adjustment']] }] }, { $subtract: ['$credit', '$debit'] }, 0] } }
                }}
            ]);

            const activityMap = {};
            activity.forEach(a => { activityMap[a._id.toString()] = a; });

            const summary = customers.map(c => {
                const act = activityMap[c._id.toString()] || { opening: 0, sales: 0, payments: 0, returns: 0 };
                // If no date range provided, opening might be 0 and lifetime totals are used elsewhere.
                // But with range, we show the calculated opening.
                return {
                    _id: c._id,
                    name: c.companyName || c.name,
                    district: c.district,
                    opening: act.opening,
                    sales: act.sales,
                    payments: act.payments,
                    returns: act.returns,
                    balance: act.opening + act.sales - act.payments - act.returns
                };
            }).filter(s => s.sales !== 0 || s.payments !== 0 || s.returns !== 0 || s.balance !== 0);

            res.json(summary);

        } else if (type === 'supplier') {
            const Supplier = require('../models/Supplier');
            const Purchase = require('../models/Purchase');
            const Payment = require('../models/Payment');

            const suppliers = await Supplier.find({ isActive: true }).select('name address totalDues');

            // Aggregate Purchases in range
            const purchases = await Purchase.aggregate([
                { $match: { date: { $lte: end }, status: 'Received' } },
                { $group: {
                    _id: '$supplier',
                    opening: { $sum: { $cond: [{ $lt: ['$date', start] }, '$dues', 0] } }, // This isn't quite right for opening dues
                    inRange: { $sum: { $cond: [{ $gte: ['$date', start] }, '$totalAmount', 0] } }
                }}
            ]);

            // Aggregate Payments in range
            const payments = await Payment.aggregate([
                { $match: { 
                    date: { $lte: end }, 
                    referenceModel: 'Supplier' 
                }},
                { $group: {
                    _id: '$referenceId',
                    paid: { $sum: { $cond: [{ $gte: ['$date', start] }, '$amount', 0] } }
                }}
            ]);

            // For suppliers, since we don't have a ledger, "Opening" is harder to calculate without a full history.
            // We'll simplify: Show Lifetime totals if no dates, or calculate activity if dates provided.
            const purchaseMap = {};
            purchases.forEach(p => { purchaseMap[p._id.toString()] = p; });
            const paymentMap = {};
            payments.forEach(p => { paymentMap[p._id.toString()] = p; });

            const summary = suppliers.map(s => {
                const p = purchaseMap[s._id.toString()] || { inRange: 0 };
                const pay = paymentMap[s._id.toString()] || { paid: 0 };
                
                return {
                    _id: s._id,
                    name: s.name,
                    address: s.address,
                    opening: 0, // Placeholder
                    purchases: p.inRange,
                    payments: pay.paid,
                    balance: s.totalDues // Show current total dues for now
                };
            });

            res.json(summary);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/today-stats
// @desc    Get Today's summary stats (Revenue, Receive, Due, Profit)
// @access  Private
router.get('/today-stats', protect, async (req, res) => {
    try {
        const { brand, localDate } = req.query;
        
        // Use provided local date or server date
        const now = localDate ? new Date(localDate) : new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // We broaden the match slightly (last 24-30 hours if timezone is an issue)
        // but for high accuracy we stick to the 00:00-23:59 of the target day.
        let matchQuery = { 
            status: 'Confirmed', 
            date: { $gte: startOfToday, $lte: endOfToday } 
        };
        if (brand) matchQuery.brand = brand;

        const invoices = await Invoice.find(matchQuery)
            .populate({
                path: 'items.productId',
                select: 'purchasePrice linkedPacket linkedPacketQty',
                populate: { path: 'linkedPacket', select: 'purchasePrice' }
            });

        let todayTotalSale = 0;
        let todayReceive = 0;
        let todayDue = 0;
        let todayProfit = 0;

        invoices.forEach(inv => {
            todayTotalSale += inv.grandTotal || 0;
            todayReceive += inv.paidAmount || 0;
            todayDue += inv.dues || 0;

            inv.items.forEach(item => {
                const product = item.productId;
                const itemTotal = item.total || 0;
                const qty = item.qty || 0;

                if (product) {
                    const productCost = product.purchasePrice || 0;
                    const packetCost = product.linkedPacket?.purchasePrice || 0;
                    const packetQty = product.linkedPacketQty || 1;
                    
                    const totalUnitCost = productCost + (packetCost * packetQty);
                    todayProfit += itemTotal - (qty * totalUnitCost);
                } else {
                    // Fallback for items without valid product link (shouldn't happen)
                    // At least count the full total as profit if cost is unknown? 
                    // No, better to count 0 profit for unknown items.
                }
            });
        });

        res.json({
            todayTotalSale,
            todayReceive,
            todayDue,
            todayProfit,
            count: invoices.length
        });
    } catch (error) {
        console.error('Today Stats Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/reports/company-summary
// @desc    Get Detailed Company Summary Report (Expert Level)
// @access  Private
router.get('/company-summary', protect, async (req, res) => {
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
            .populate('linkedPacket', 'purchasePrice modelName')
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

        // Get returns within the month
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

            // Stock at end of month (current) - actually we need closing as of endDate
            // For now, let's use the current stock status as closing if no future transactions exist
            const currentStock = product.stock.goodQty;
            
            // Reverse calculate Opening
            // Opening = Current - (Purchases since Start) + (Sales since Start) - (Returns since Start)
            // But wait, if we are in the middle of a month, we want opening as of day 1.
            const openingQty = currentStock + sale.salesQty - purchase.receiveQty + returnData.returnQty;
            const openingValue = openingQty * product.purchasePrice;
            
            const closingQty = openingQty + purchase.receiveQty - sale.salesQty - returnData.returnQty;
            const closingValue = closingQty * product.purchasePrice;
            
            // Financial Metrics
            const packetBuyPrice = product.linkedPacket?.purchasePrice || 0;
            const productBuyPrice = product.purchasePrice || 0;
            const salesPrice = product.salesPrice || 0;
            const gap = salesPrice - productBuyPrice; // Estimate
            
            // Profit calculation: Revenue - Cost (Product + Packet)
            const totalUnitCost = productBuyPrice + (packetBuyPrice * (product.linkedPacketQty || 1));
            const estimatedProfit = sale.salesValue - (sale.salesQty * totalUnitCost);

            // Filter out items with no activity and no stock
            if (openingQty > 0 || purchase.receiveQty > 0 || sale.salesQty > 0 || returnData.returnQty > 0 || currentStock > 0) {
                summary.push({
                    sl: serial++,
                    type: product.type,
                    model: product.modelName,
                    packetBuyPrice,
                    productBuyPrice,
                    salesPrice,
                    gap,
                    openingQty,
                    openingValue,
                    receiveQty: purchase.receiveQty,
                    receiveValue: purchase.receiveValue,
                    // Note: Excel has Packet Receive columns too, we filter by type 'Packet' in logic
                    isPacket: product.type === 'Packet',
                    salesQty: sale.salesQty,
                    salesValue: sale.salesValue,
                    returnQty: returnData.returnQty,
                    returnValue: returnData.returnQty * productBuyPrice,
                    closingQty,
                    closingValue,
                    profit: estimatedProfit
                });
            }
        }

        // Group by Model Type for the Super Table
        const grouped = {};
        summary.forEach(item => {
            const cat = item.type;
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        res.json({
            summary,
            grouped,
            month: parseInt(month),
            year: parseInt(year)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
