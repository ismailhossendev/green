const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const SalesTarget = require('../models/SalesTarget');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const { authorize, canAccessModule } = require('../middleware/rbac');

router.get('/employees', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { status, department, designation, page = 1, limit = 50 } = req.query;
        let query = { role: { $in: ['Staff', 'Sales', 'Manager'] } };
        if (status) query.status = status;
        if (department) query.department = department;
        if (designation) query.designation = designation;
        const employees = await User.find(query).select('-password').skip((page - 1) * limit).limit(parseInt(limit)).sort({ name: 1 });
        const total = await User.countDocuments(query);
        res.json({ employees, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/employees/summary', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const byStatus = await User.aggregate([{ $match: { role: { $in: ['Staff', 'Sales', 'Manager'] } } }, { $group: { _id: '$status', count: { $sum: 1 }, totalSalary: { $sum: '$salary' } } }]);
        const byDepartment = await User.aggregate([{ $match: { role: { $in: ['Staff', 'Sales', 'Manager'] }, status: 'Active' } }, { $group: { _id: '$department', count: { $sum: 1 }, totalSalary: { $sum: '$salary' } } }]);
        res.json({ byStatus, byDepartment });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/employees', protect, authorize('Admin'), async (req, res) => {
    try {
        const { name, email, password, phone, role, designation, department, area, joiningDate, salary, taDA } = req.body;
        const employee = await User.create({ name, email, password, phone, role: role || 'Staff', designation, department, area, joiningDate: joiningDate || new Date(), salary, taDA });
        res.status(201).json({ _id: employee._id, name: employee.name, email: employee.email, role: employee.role, designation: employee.designation });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/employees/:id/status', protect, authorize('Admin'), async (req, res) => {
    try {
        const { status } = req.body;
        const employee = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/attendance', protect, canAccessModule('hrm'), async (req, res) => {
    try {
        const { employeeId, startDate, endDate, status, page = 1, limit = 50 } = req.query;
        let query = {};
        if (employeeId) query.employee = employeeId;
        if (status) query.status = status;
        if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
        const attendance = await Attendance.find(query).populate('employee', 'name designation').skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
        const total = await Attendance.countDocuments(query);
        res.json({ attendance, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/attendance', protect, async (req, res) => {
    try {
        const { employeeId, location, photoUrl, status, note } = req.body;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const existing = await Attendance.findOne({ employee: employeeId || req.user._id, date: { $gte: today } });
        if (existing) { existing.checkOut = new Date(); await existing.save(); return res.json(existing); }
        const attendance = await Attendance.create({ employee: employeeId || req.user._id, date: today, checkIn: new Date(), location, photoUrl, status: status || 'Present', note });
        res.status(201).json(attendance);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/targets', protect, canAccessModule('hrm'), async (req, res) => {
    try {
        const { employeeId, year, month } = req.query;
        let query = {};
        if (employeeId) query.employee = employeeId;
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);
        const targets = await SalesTarget.find(query).populate('employee', 'name designation').sort({ year: -1, month: -1 });
        res.json(targets);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/targets', protect, authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { employeeId, year, month, targetAmount, targetQty, collectionTarget } = req.body;
        let target = await SalesTarget.findOne({ employee: employeeId, year, month });
        if (target) { target.targetAmount = targetAmount; target.targetQty = targetQty; target.collectionTarget = collectionTarget; await target.save(); }
        else { target = await SalesTarget.create({ employee: employeeId, year, month, targetAmount, targetQty, collectionTarget }); }
        res.status(201).json(target);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/payroll', protect, authorize('Admin'), async (req, res) => {
    try {
        const { year, month } = req.query;
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || new Date().getMonth() + 1;
        const employees = await User.find({ role: { $in: ['Staff', 'Sales', 'Manager'] }, status: 'Active' }).select('name designation salary taDA loanBalance');
        const startDate = new Date(currentYear, currentMonth - 1, 1); const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        const payrollData = await Promise.all(employees.map(async (emp) => {
            const attendance = await Attendance.countDocuments({ employee: emp._id, date: { $gte: startDate, $lte: endDate }, status: 'Present' });
            const sales = await Invoice.aggregate([{ $match: { createdBy: emp._id, date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: null, totalSales: { $sum: '$grandTotal' }, totalCollection: { $sum: '$paidAmount' } } }]);
            const salesData = sales[0] || { totalSales: 0, totalCollection: 0 };
            return { employee: { _id: emp._id, name: emp.name, designation: emp.designation }, salary: emp.salary, taDA: emp.taDA, loanDeduction: Math.min(emp.loanBalance, emp.salary * 0.1), attendance: { present: attendance, workingDays: new Date(currentYear, currentMonth, 0).getDate() }, sales: salesData, netPayable: emp.salary + emp.taDA - Math.min(emp.loanBalance, emp.salary * 0.1) };
        }));
        res.json(payrollData);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/payroll/pay', protect, authorize('Admin'), async (req, res) => {
    try {
        const { employeeId, amount, description } = req.body;
        const employee = await User.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        const payment = await Payment.create({ type: 'Employee', referenceId: employeeId, referenceModel: 'User', referenceName: employee.name, amount, description: description || `Salary payment for ${employee.name}`, addedBy: req.user._id });
        if (employee.loanBalance > 0) { const loanDeduction = Math.min(employee.loanBalance, amount * 0.1); employee.loanBalance -= loanDeduction; await employee.save(); }
        res.status(201).json(payment);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
