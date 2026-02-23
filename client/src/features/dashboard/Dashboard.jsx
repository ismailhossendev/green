import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBrand, useAuth } from '../../App';
import { inventoryAPI, customerAPI, salesAPI, reportsAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPackage, FiUsers, FiShoppingCart, FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Dashboard.css';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 640);
    React.useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= 640);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
};

const Dashboard = () => {
    const { currentBrand } = useBrand();
    const { user } = useAuth();
    const isMobile = useIsMobile();

    // Fetch inventory summary
    const { data: inventorySummary } = useQuery({
        queryKey: ['inventory-summary'],
        queryFn: () => inventoryAPI.getSummary(),
    });

    // Fetch customer summary
    const { data: customerSummary } = useQuery({
        queryKey: ['customer-summary'],
        queryFn: () => customerAPI.getSummary({ brand: currentBrand }),
    });

    // Fetch sales report
    const { data: salesData } = useQuery({
        queryKey: ['sales-report', currentBrand],
        queryFn: () => salesAPI.getInvoices({ brand: currentBrand, limit: 100 }),
    });

    // Sample data for charts (replace with real data)
    const salesChartData = [
        { name: 'Jan', sales: 4000, collection: 2400 },
        { name: 'Feb', sales: 3000, collection: 1398 },
        { name: 'Mar', sales: 2000, collection: 9800 },
        { name: 'Apr', sales: 2780, collection: 3908 },
        { name: 'May', sales: 1890, collection: 4800 },
        { name: 'Jun', sales: 2390, collection: 3800 },
        { name: 'Jul', sales: 3490, collection: 4300 },
    ];

    const stockDistribution = [
        { name: 'Good', value: 400, color: '#10B981' },
        { name: 'Bad', value: 30, color: '#EF4444' },
        { name: 'Damage', value: 20, color: '#F59E0B' },
        { name: 'Repair', value: 50, color: '#3B82F6' },
    ];

    const stats = [
        {
            title: 'Total Products',
            value: inventorySummary?.data?.totalProducts || 0,
            icon: FiPackage,
            color: '#00796B',
            change: '+12%',
            positive: true
        },
        {
            title: 'Total Customers',
            value: customerSummary?.data?.summary?.totalCustomers || 0,
            icon: FiUsers,
            color: '#388E3C',
            change: '+8%',
            positive: true
        },
        {
            title: 'Today Sales',
            value: formatCurrency(salesData?.data?.invoices?.reduce((acc, inv) => acc + inv.grandTotal, 0) || 0),
            icon: FiShoppingCart,
            color: '#3B82F6',
            change: '+15%',
            positive: true
        },
        {
            title: 'Total Dues',
            value: formatCurrency(customerSummary?.data?.summary?.totalDues || 0),
            icon: FiDollarSign,
            color: '#F59E0B',
            change: '-5%',
            positive: false
        },
    ];

    const recentInvoices = salesData?.data?.invoices?.slice(0, 5) || [];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Welcome back, {user?.name}! 👋</h1>
                    <p className="dashboard-subtitle">Here's what's happening with {currentBrand} today.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                            <stat.icon />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{stat.title}</span>
                            <span className="stat-value">{stat.value}</span>
                            <span className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
                                {stat.positive ? <FiTrendingUp /> : <FiTrendingDown />}
                                {stat.change} from last month
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="dashboard-charts">
                <div className="chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Sales & Collection Overview</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                            <AreaChart data={salesChartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00796B" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00796B" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#388E3C" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#388E3C" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#64748B" />
                                <YAxis stroke="#64748B" />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1E293B',
                                        border: '1px solid #334155',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#00796B" fillOpacity={1} fill="url(#colorSales)" />
                                <Area type="monotone" dataKey="collection" stroke="#388E3C" fillOpacity={1} fill="url(#colorCollection)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Stock Distribution</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                            <PieChart>
                                <Pie
                                    data={stockDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={isMobile ? 40 : 60}
                                    outerRadius={isMobile ? 70 : 100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stockDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1E293B',
                                        border: '1px solid #334155',
                                        borderRadius: '8px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="chart-legend">
                            {stockDistribution.map((item, index) => (
                                <div key={index} className="legend-item">
                                    <span className="legend-dot" style={{ background: item.color }}></span>
                                    <span className="legend-label">{item.name}</span>
                                    <span className="legend-value">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Invoices */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Invoices</h3>
                    <a href="/sales" className="card-action">
                        View all <FiArrowRight />
                    </a>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice No</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Due</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.length > 0 ? (
                                recentInvoices.map((invoice) => (
                                    <tr key={invoice._id}>
                                        <td className="font-medium">{invoice.invoiceNo}</td>
                                        <td>{invoice.customer?.name || 'N/A'}</td>
                                        <td>{formatCurrency(invoice.grandTotal)}</td>
                                        <td className="text-success">{formatCurrency(invoice.paidAmount)}</td>
                                        <td className="text-danger">{formatCurrency(invoice.dues)}</td>
                                        <td>
                                            <span className={`badge ${invoice.dues > 0 ? 'badge-warning' : 'badge-success'}`}>
                                                {invoice.dues > 0 ? 'Pending' : 'Paid'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                                        No invoices found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alerts */}
            {customerSummary?.data?.summary?.totalDues > 0 && (
                <div className="alert alert-warning">
                    <FiAlertCircle />
                    <div>
                        <strong>Outstanding Dues Alert!</strong>
                        <p>You have {formatCurrency(customerSummary?.data?.summary?.totalDues)} in pending dues from customers.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
