import { NavLink, useLocation } from 'react-router-dom';
import { useBrand, useAuth } from '../../App';
import { BrandingConfig, getBrandLogo } from '../../config/brandingConfig';
import {
    FiHome, FiPackage, FiUsers, FiShoppingCart, FiTruck,
    FiBook, FiDollarSign, FiUserCheck, FiRefreshCw,
    FiBarChart2, FiSettings, FiLogOut, FiClock
} from 'react-icons/fi';
import './Sidebar.css';

const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/inventory', icon: FiPackage, label: 'Inventory', roles: ['Admin', 'Manager', 'Staff'] },
    { path: '/customers', icon: FiUsers, label: 'Customers', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/sales', icon: FiShoppingCart, label: 'Sales', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/purchase', icon: FiTruck, label: 'Purchase', roles: ['Admin', 'Manager', 'Staff'] },
    { path: '/suppliers', icon: FiUsers, label: 'Suppliers', roles: ['Admin', 'Manager'] },
    { path: '/ledger', icon: FiBook, label: 'Ledger', roles: ['Admin', 'Manager', 'Staff', 'Dealer'] },
    { path: '/expenses', icon: FiDollarSign, label: 'Expenses', roles: ['Admin', 'Manager'] },
    { path: '/hrm', icon: FiUserCheck, label: 'HRM', roles: ['Admin', 'Manager'] },
    { path: '/attendance', icon: FiClock, label: 'Attendance', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/replacement', icon: FiRefreshCw, label: 'Replacement', roles: ['Admin', 'Manager', 'Staff'] },
    { path: '/reports', icon: FiBarChart2, label: 'Reports', roles: ['Admin', 'Manager'] },
    { path: '/stock-summary', icon: FiPackage, label: 'Stock Summary', roles: ['Admin', 'Manager'] },
];

const Sidebar = () => {
    const { currentBrand } = useBrand();
    const { user, logout } = useAuth();
    const location = useLocation();

    const filteredMenuItems = menuItems.filter(item =>
        item.roles.includes(user?.role || 'Staff')
    );

    return (
        <aside className={`sidebar ${currentBrand === 'Green Star' ? 'theme-greenstar' : 'theme-greentel'}`}>
            <div className="sidebar-header">
                <img
                    src={getBrandLogo(currentBrand)}
                    alt={currentBrand}
                    className="sidebar-logo"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
                <div className="sidebar-brand">
                    <h1 className="sidebar-title">{currentBrand}</h1>
                    <span className="sidebar-subtitle">Business System</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {filteredMenuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`
                        }
                    >
                        <item.icon className="sidebar-icon" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user?.name || 'User'}</span>
                        <span className="sidebar-user-role">{user?.role || 'Staff'}</span>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={logout}>
                    <FiLogOut />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
