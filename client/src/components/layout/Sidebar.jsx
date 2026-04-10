import { NavLink, useLocation } from 'react-router-dom';
import { useBrand, useAuth } from '../../App';
import { BrandingConfig, getBrandLogo } from '../../config/brandingConfig';
import {
    FiHome, FiPackage, FiUsers, FiShoppingCart, FiTruck,
    FiBook, FiDollarSign, FiUserCheck, FiRefreshCw,
    FiBarChart2, FiSettings, FiLogOut, FiClock, FiChevronRight
} from 'react-icons/fi';

const menuSections = [
    {
        label: 'Main',
        items: [
            { path: '/', icon: FiHome, label: 'Dashboard', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
            { path: '/inventory', icon: FiPackage, label: 'Inventory', roles: ['Admin', 'Manager', 'Staff'] },
        ]
    },
    {
        label: 'Business',
        items: [
            { path: '/customers', icon: FiUsers, label: 'Customers', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
            { path: '/sales', icon: FiShoppingCart, label: 'Sales', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
            { path: '/purchase', icon: FiTruck, label: 'Purchase', roles: ['Admin', 'Manager', 'Staff'] },
            { path: '/suppliers', icon: FiUsers, label: 'Suppliers', roles: ['Admin', 'Manager'] },
            { path: '/ledger', icon: FiBook, label: 'Ledger', roles: ['Admin', 'Manager', 'Staff', 'Dealer'] },
            { path: '/expenses', icon: FiDollarSign, label: 'Expenses', roles: ['Admin', 'Manager'] },
        ]
    },
    {
        label: 'Operations',
        items: [
            { path: '/hrm', icon: FiUserCheck, label: 'HRM', roles: ['Admin', 'Manager'] },
            { path: '/attendance', icon: FiClock, label: 'Attendance', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
            { path: '/replacement', icon: FiRefreshCw, label: 'Replacement', roles: ['Admin', 'Manager', 'Staff'] },
        ]
    },
    {
        label: 'Analytics',
        items: [
            { path: '/reports', icon: FiBarChart2, label: 'Reports', roles: ['Admin', 'Manager'] },
            { path: '/stock-summary', icon: FiPackage, label: 'Stock Summary', roles: ['Admin', 'Manager'] },
            { path: '/company-summary', icon: FiBarChart2, label: 'Company Summary', roles: ['Admin', 'Manager'] },
        ]
    },
];

const Sidebar = ({ open, onClose }) => {
    const { currentBrand } = useBrand();
    const { user, logout } = useAuth();
    const location = useLocation();

    const isGreenStar = currentBrand === 'Green Star';

    // Brand-adaptive colors
    const accentColor = isGreenStar ? '#4ade80' : '#2dd4bf';
    const accentBg = isGreenStar ? 'bg-emerald-500' : 'bg-teal-500';
    const accentBgSoft = isGreenStar ? 'bg-emerald-500/10' : 'bg-teal-500/10';
    const accentText = isGreenStar ? 'text-emerald-400' : 'text-teal-400';
    const accentRing = isGreenStar ? 'ring-emerald-500/30' : 'ring-teal-500/30';
    const accentGlow = isGreenStar ? 'shadow-emerald-500/20' : 'shadow-teal-500/20';

    const handleNavClick = () => {
        if (window.innerWidth <= 1024) onClose?.();
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-[1000] w-[260px] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
            style={{
                background: 'linear-gradient(180deg, #0f172a 0%, #131c31 50%, #0f172a 100%)',
                borderRight: '1px solid rgba(51, 65, 85, 0.5)',
            }}
        >
            {/* Brand Header */}
            <div className="px-5 pt-6 pb-5">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center shadow-lg ${accentGlow}`}
                        style={{ boxShadow: `0 8px 24px ${isGreenStar ? 'rgba(74, 222, 128, 0.25)' : 'rgba(45, 212, 191, 0.25)'}` }}
                    >
                        <FiPackage className="text-white" size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className={`text-base font-bold ${accentText} leading-none tracking-tight`}>{currentBrand}</h1>
                        <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-[0.15em] mt-1">Enterprise Core</p>
                    </div>
                </div>
            </div>

            {/* Separator line with glow */}
            <div className="mx-5 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }} />

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
                {menuSections.map((section) => {
                    const visibleItems = section.items.filter(item =>
                        item.roles.includes(user?.role || 'Staff')
                    );
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.label}>
                            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                {section.label}
                            </p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => {
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={handleNavClick}
                                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${isActive
                                                    ? `${accentText} ${accentBgSoft}`
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                                                }`}
                                        >
                                            {/* Active indicator bar */}
                                            {isActive && (
                                                <div
                                                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${accentBg}`}
                                                    style={{ boxShadow: `0 0 8px ${accentColor}60` }}
                                                />
                                            )}

                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isActive
                                                    ? accentBgSoft
                                                    : 'bg-transparent group-hover:bg-white/[0.04]'
                                                }`}>
                                                <item.icon
                                                    className={`transition-colors duration-200 ${isActive ? accentText : 'text-slate-500 group-hover:text-slate-300'}`}
                                                    size={16}
                                                />
                                            </div>

                                            <span className="flex-1">{item.label}</span>

                                            {isActive && (
                                                <FiChevronRight className={`${accentText} opacity-60`} size={14} />
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Separator */}
            <div className="mx-5 h-px bg-slate-800/60" />

            {/* User Footer */}
            <div className="p-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-slate-800/60 hover:border-slate-700/60 transition-colors">
                    <div
                        className={`w-9 h-9 rounded-lg ${accentBg} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                        style={{ boxShadow: `0 4px 12px ${isGreenStar ? 'rgba(74, 222, 128, 0.2)' : 'rgba(45, 212, 191, 0.2)'}` }}
                    >
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name || 'User'}</p>
                        <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5">{user?.role || 'Staff'}</p>
                    </div>
                    <button
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        onClick={logout}
                        title="Log Out"
                    >
                        <FiLogOut size={15} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
