import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../App';
import { reportsAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingCart, FiUsers, FiPackage } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import './Reports.css';

const Reports = () => {
    const { user } = useAuth();
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

    const { data: profitLossData, isLoading: plLoading } = useQuery({
        queryKey: ['profit-loss', dateRange],
        queryFn: () => reportsAPI.getProfitLoss(dateRange),
        enabled: user?.role === 'Admin'
    });

    const { data: salesData } = useQuery({
        queryKey: ['sales-report', dateRange],
        queryFn: () => reportsAPI.getSales({ ...dateRange, groupBy: 'month' }),
    });

    const { data: customerDues } = useQuery({
        queryKey: ['customer-dues'],
        queryFn: () => reportsAPI.getCustomerDues({}),
    });

    const { data: supplierDues } = useQuery({
        queryKey: ['supplier-dues'],
        queryFn: () => reportsAPI.getSupplierDues(),
    });

    const profitLoss = profitLossData?.data;
    const salesReport = salesData?.data?.salesReport || [];

    return (
        <div className="reports">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Business analytics and reports</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="date"
                        className="input"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    />
                    <input
                        type="date"
                        className="input"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    />
                </div>
            </div>

            {/* Profit/Loss Summary - Admin Only */}
            {user?.role === 'Admin' && profitLoss && (
                <>
                    <h3 style={{ marginBottom: '1rem' }}>Profit & Loss</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                                <FiShoppingCart />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Net Sales</span>
                                <span className="stat-value">{formatCurrency(profitLoss.revenue?.netSales)}</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
                                <FiPackage />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Purchase Cost</span>
                                <span className="stat-value">{formatCurrency(profitLoss.costs?.purchaseCost)}</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}>
                                <FiDollarSign />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Total Expenses</span>
                                <span className="stat-value">{formatCurrency(profitLoss.expenses?.totalExpenses)}</span>
                            </div>
                        </div>

                        <div className="stat-card" style={{
                            background: profitLoss.netProfit >= 0
                                ? 'linear-gradient(135deg, var(--greentel-primary), var(--greentel-secondary))'
                                : 'linear-gradient(135deg, #EF4444, #B91C1C)',
                            color: 'white'
                        }}>
                            <div className="stat-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                                {profitLoss.netProfit >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                            </div>
                            <div className="stat-content">
                                <span className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Net Profit</span>
                                <span className="stat-value" style={{ color: 'white' }}>{formatCurrency(profitLoss.netProfit)}</span>
                                <span className="stat-change" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                    {profitLoss.profitMargin}% margin
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Sales Chart */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card-title mb-4">Monthly Sales Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesReport}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="_id" stroke="#64748B" />
                        <YAxis stroke="#64748B" />
                        <Tooltip
                            contentStyle={{
                                background: '#1E293B',
                                border: '1px solid #334155',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="totalAmount" fill="#00796B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Dues Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="card">
                    <h3 className="card-title mb-4">Customer Dues</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Customers with Dues</span>
                        <span className="font-semibold">{customerDues?.data?.summary?.totalCustomers || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <span>Total Outstanding</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
                            {formatCurrency(customerDues?.data?.summary?.totalDues || 0)}
                        </span>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-title mb-4">Supplier Dues</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Suppliers with Dues</span>
                        <span className="font-semibold">{supplierDues?.data?.summary?.totalSuppliers || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <span>Total Payable</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>
                            {formatCurrency(supplierDues?.data?.summary?.totalDues || 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
