import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data)
};

// Inventory API
export const inventoryAPI = {
    getProducts: (params) => api.get('/inventory', { params }),
    getProduct: (id) => api.get(`/inventory/${id}`),
    getSummary: () => api.get('/inventory/summary'),
    createProduct: (data) => api.post('/inventory', data),
    updateProduct: (id, data) => api.put(`/inventory/${id}`, data),
    updateStock: (id, data) => api.put(`/inventory/${id}/stock`, data),
    transferStock: (id, data) => api.post(`/inventory/${id}/transfer`, data),
    getUsage: (id) => api.get(`/inventory/${id}/usage`),
    deleteProduct: (id) => api.delete(`/inventory/${id}`)
};

// Sales API
export const salesAPI = {
    getInvoices: (params) => api.get('/sales/invoices', { params }),
    getInvoice: (id) => api.get(`/sales/invoices/${id}`),
    createInvoice: (data) => api.post('/sales/invoices', data),
    getPartyWise: (params) => api.get('/sales/party-wise', { params }),
    getDistrictWise: () => api.get('/sales/district-wise'),
    deleteInvoice: (id) => api.delete(`/sales/invoices/${id}`)
};

// Customer API
export const customerAPI = {
    getCustomers: (params) => api.get('/customers', { params }),
    getCustomer: (id) => api.get(`/customers/${id}`),
    getSummary: (params) => api.get('/customers/summary', { params }),
    getDistrictSummary: () => api.get('/customers/district-summary'),
    getDistricts: () => api.get('/customers/districts'),
    createCustomer: (data) => api.post('/customers', data),
    updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
    deleteCustomer: (id) => api.delete(`/customers/${id}`)
};

// Purchase API
export const purchaseAPI = {
    getPurchases: (params) => api.get('/purchase', { params }),
    getPurchase: (id) => api.get(`/purchase/${id}`),
    getSupplierWise: () => api.get('/purchase/supplier-wise'),
    createPurchase: (data) => api.post('/purchase', data)
};

// Supplier API
export const supplierAPI = {
    getSuppliers: (params) => api.get('/suppliers', { params }),
    getSupplier: (id) => api.get(`/suppliers/${id}`),
    getSummary: () => api.get('/suppliers/summary'),
    createSupplier: (data) => api.post('/suppliers', data),
    updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
    deleteSupplier: (id) => api.delete(`/suppliers/${id}`)
};

// Ledger API
export const ledgerAPI = {
    getLedger: (params) => api.get('/ledger', { params }),
    getCustomerLedger: (customerId, params) => api.get(`/ledger/customer/${customerId}`, { params }),
    getBrandLedger: (brand, params) => api.get(`/ledger/brand/${brand}`, { params }),
    recordPayment: (data) => api.post('/ledger/payment', data),
    recordAdjustment: (data) => api.post('/ledger/adjustment', data)
};

// Expense API
export const expenseAPI = {
    getExpenses: (params) => api.get('/expenses', { params }),
    getSummary: (params) => api.get('/expenses/summary', { params }),
    createExpense: (data) => api.post('/expenses', data),
    updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
    deleteExpense: (id) => api.delete(`/expenses/${id}`)
};

// Finance API
export const financeAPI = {
    getLoans: (params) => api.get('/finance/loans', { params }),
    createLoan: (data) => api.post('/finance/loans', data),
    recordLoanPayment: (id, data) => api.post(`/finance/loans/${id}/payment`, data),
    getInvestments: (params) => api.get('/finance/investments', { params }),
    createInvestment: (data) => api.post('/finance/investments', data),
    updateInvestment: (id, data) => api.put(`/finance/investments/${id}`, data)
};

// HRM API
export const hrmAPI = {
    getEmployees: (params) => api.get('/hrm/employees', { params }),
    getEmployeeSummary: () => api.get('/hrm/employees/summary'),
    createEmployee: (data) => api.post('/hrm/employees', data),
    updateEmployeeStatus: (id, status) => api.put(`/hrm/employees/${id}/status`, { status }),
    getAttendance: (params) => api.get('/hrm/attendance', { params }),
    markAttendance: (data) => api.post('/hrm/attendance', data),
    getTargets: (params) => api.get('/hrm/targets', { params }),
    setTarget: (data) => api.post('/hrm/targets', data),
    getAchievement: (params) => api.get('/hrm/targets/achievement', { params }),
    getPayroll: (params) => api.get('/hrm/payroll', { params }),
    processSalary: (data) => api.post('/hrm/payroll/pay', data)
};

// Replacement API
export const replacementAPI = {
    getReplacements: (params) => api.get('/replacement', { params }),
    getReplacement: (id) => api.get(`/replacement/${id}`),
    getDealerReplacements: (dealerId) => api.get(`/replacement/dealer/${dealerId}`),
    getModelReplacements: (productId) => api.get(`/replacement/model/${productId}`),
    createReplacement: (data) => api.post('/replacement', data),

    // New Workflow Endpoints
    getReplacementStats: (params) => api.get('/replacement/stats', { params }),
    submitTriage: (id, items) => api.post(`/replacement/${id}/triage`, { items }),
    sendToFactory: (id) => api.post(`/replacement/${id}/factory-send`),
    receiveFromFactory: (id, data) => api.post(`/replacement/${id}/factory-receive`, data),

    // Legacy / Admin Utils
    updateReplacement: (id, data) => api.put(`/replacement/${id}`, data),
    updateRepair: (id, data) => api.put(`/replacement/${id}/repair`, data),
    addToStock: (id, data) => api.post(`/replacement/${id}/add-to-stock`, data),
    adjustLedger: (id, data) => api.post(`/replacement/${id}/adjust-ledger`, data),
    deleteReplacement: (id) => api.delete(`/replacement/${id}`)
};

// Payment API
export const paymentAPI = {
    getPayments: (params) => api.get('/payments', { params }),
    paySupplier: (data) => api.post('/payments/supplier', data),
    payPurchase: (data) => api.post('/payments/purchase', data),
    receiveDealer: (data) => api.post('/payments/dealer', data),
    payEmployee: (data) => api.post('/payments/employee', data),
    payOthers: (data) => api.post('/payments/others', data)
};

// Reports API
export const reportsAPI = {
    getProfitLoss: (params) => api.get('/reports/profit-loss', { params }),
    getSales: (params) => api.get('/reports/sales', { params }),
    getPurchase: (params) => api.get('/reports/purchase', { params }),
    getCustomerDues: (params) => api.get('/reports/dues/customers', { params }),
    getSupplierDues: () => api.get('/reports/dues/suppliers'),
    getCollection: (params) => api.get('/reports/collection', { params }),
    getPartyCollection: (params) => api.get('/reports/collection/party-wise', { params }),
    getExpense: (params) => api.get('/reports/expense', { params }),
    getAssets: () => api.get('/reports/assets'),
    getStockSummary: (params) => api.get('/reports/stock-summary', { params })
};

export default api;
