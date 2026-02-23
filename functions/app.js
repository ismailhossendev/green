const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const customersRoutes = require('./routes/customers');
const purchaseRoutes = require('./routes/purchase');
const suppliersRoutes = require('./routes/suppliers');
const ledgerRoutes = require('./routes/ledger');
const expensesRoutes = require('./routes/expenses');
const financeRoutes = require('./routes/finance');
const hrmRoutes = require('./routes/hrm');
const replacementRoutes = require('./routes/replacement');
const paymentsRoutes = require('./routes/payments');
const reportsRoutes = require('./routes/reports');

const app = express();

// Connect to MongoDB (lazy connection - reuses connection across function calls)
connectDB();

// Middleware
app.use(cors({
    origin: true, // Allow all origins (Firebase Hosting is same project)
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/hrm', hrmRoutes);
app.use('/api/replacement', replacementRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Green Tel & Green Star API is running on Firebase' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Export app (no app.listen() — Firebase handles the server)
module.exports = app;
