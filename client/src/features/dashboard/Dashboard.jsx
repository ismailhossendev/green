import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBrand, useAuth } from '../../App';
import { inventoryAPI, customerAPI, salesAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { Link } from 'react-router-dom';
import { 
    FiPackage, FiUsers, FiShoppingCart, FiDollarSign, FiTrendingUp,
    FiFileText, FiBarChart2, FiActivity, FiFile, FiBookOpen, FiHome, 
    FiTrendingUp as IncomeIcon, FiCreditCard, FiList, FiBox, FiTool
} from 'react-icons/fi';
import { FaUserTie, FaUsersCog, FaIndustry } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
    const { currentBrand } = useBrand();
    const { user } = useAuth();

    // Fetch today's stats (Revenue, Receive, Due, Profit)
    const { data, isLoading } = useQuery({
        queryKey: ['today-stats', currentBrand],
        queryFn: () => reportsAPI.getTodayStats({ brand: currentBrand, localDate: new Date().toISOString() }),
    });

    const stats = data?.data || { todayTotalSale: 0, todayReceive: 0, todayDue: 0, todayProfit: 0 };
    const { todayTotalSale, todayReceive, todayDue, todayProfit } = stats;

    const mobileMenuIds = [
        { title: 'Product', path: '/inventory', icon: FiPackage, color: '#8B5A2B' },
        { title: 'Customers', path: '/customers', icon: FiUsers, color: '#3B82F6' },
        { title: 'Stock List', path: '/stock-summary', icon: FiList, color: '#6366F1' },
        { title: 'Company Summary', path: '/company-summary', icon: FiBarChart2, color: '#8B5CF6' },
        
        { title: 'Purchase', path: '/purchase', icon: FiShoppingCart, color: '#10B981' },
        { title: 'Sale', path: '/sales/new', icon: FiShoppingCart, color: '#0EA5E9' },
        { title: 'Sales List', path: '/sales', icon: FiBarChart2, color: '#8B5CF6' },
        
        { title: 'Ledger', path: '/ledger', icon: FiBookOpen, color: '#3B82F6' },
        { title: 'Reports', path: '/reports', icon: FiFileText, color: '#6366F1' },
        { title: 'Damage', path: '/replacement', icon: FiActivity, color: '#EF4444' },

        { title: 'Expense', path: '/expenses', icon: FiDollarSign, color: '#EF4444' },
        { title: 'HRM', path: '/hrm', icon: FaUserTie, color: '#3B82F6' },
    ];

    return (
        <div className="app-dashboard">
            <div className="dashboard-greeting">
                <div>
                    <h1 className="dashboard-title">Welcome back, {user?.name}! 👋</h1>
                    <p className="dashboard-subtitle">Here's what's happening with {currentBrand} today.</p>
                </div>
            </div>

            {/* Top Stats Section */}
            <div className="app-stats-header">
                <div className="app-stats-top">
                    <div className="today-sale-box">
                        <span className="sale-label">Today Sale</span>
                        <span className="sale-value" style={{ color: '#8B5CF6' }}>
                            {formatCurrency(todayTotalSale)}
                        </span>
                    </div>
                    <div className="sale-dropdown">
                        <select>
                            <option>Today</option>
                            <option>Yesterday</option>
                            <option>This Week</option>
                        </select>
                    </div>
                </div>
                
                <div className="app-stats-bottom">
                    <div className="stat-column">
                        <span className="col-label">Today Receive</span>
                        <span className="col-value" style={{ color: '#0EA5E9' }}>{formatCurrency(todayReceive)}</span>
                    </div>
                    <div className="stat-column">
                        <span className="col-label">Today Due</span>
                        <span className="col-value" style={{ color: '#F59E0B' }}>{formatCurrency(todayDue)}</span>
                    </div>
                    <div className="stat-column no-border">
                        <span className="col-label">Today Profit</span>
                        <span className="col-value" style={{ color: '#10B981' }}>{formatCurrency(todayProfit)}</span>
                    </div>
                </div>
            </div>

            {/* Grid Menu */}
            <div className="app-menus-grid">
                {mobileMenuIds.map((item, idx) => (
                    <Link to={item.path} key={idx} className="app-menu-item">
                        <div className="menu-icon-wrapper" style={{ background: `${item.color}15`, color: item.color }}>
                            <item.icon size={28} />
                        </div>
                        <span className="menu-text">{item.title}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
