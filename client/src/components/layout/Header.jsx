import { useBrand, useAuth } from '../../App';
import { FiSearch, FiBell, FiMenu } from 'react-icons/fi';
import './Header.css';

const Header = ({ onMenuToggle }) => {
    const { currentBrand, setCurrentBrand } = useBrand();
    const { user } = useAuth();

    return (
        <header className="header">
            <div className="header-left">
                <button className="header-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
                    <FiMenu />
                </button>

                <div className="header-search">
                    <FiSearch className="header-search-icon" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="header-search-input"
                    />
                </div>
            </div>

            <div className="header-right">
                {/* Brand Switcher */}
                <div className="brand-switcher">
                    <button
                        className={`${currentBrand === 'Green Tel' ? 'active greentel' : ''}`}
                        onClick={() => setCurrentBrand('Green Tel')}
                    >
                        Green Tel
                    </button>
                    <button
                        className={`${currentBrand === 'Green Star' ? 'active greenstar' : ''}`}
                        onClick={() => setCurrentBrand('Green Star')}
                    >
                        Green Star
                    </button>
                </div>

                {/* Notifications */}
                <button className="header-icon-btn">
                    <FiBell />
                    <span className="header-notification-badge">3</span>
                </button>

                {/* User Info */}
                <div className="header-user">
                    <span className="header-user-name">{user?.name || 'User'}</span>
                    <div className="header-user-avatar">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
