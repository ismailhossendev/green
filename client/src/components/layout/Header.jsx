import { useBrand, useAuth } from '../../App';
import { FiSearch, FiBell, FiMenu } from 'react-icons/fi';

const Header = ({ onMenuToggle }) => {
    const { currentBrand, setCurrentBrand } = useBrand();
    const { user } = useAuth();

    const isGreenStar = currentBrand === 'Green Star';

    return (
        <header className="h-16 shrink-0 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-[800] px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button 
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl lg:hidden transition-all active:scale-95" 
                    onClick={onMenuToggle} 
                    aria-label="Toggle menu"
                >
                    <FiMenu size={22} />
                </button>

                <div className="hidden sm:flex items-center relative group min-w-[280px]">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Global search..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
                {/* Brand Switcher */}
                <div className="flex p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                    <button
                        className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!isGreenStar ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setCurrentBrand('Green Tel')}
                    >
                        Tel
                    </button>
                    <button
                        className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${isGreenStar ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setCurrentBrand('Green Star')}
                    >
                        Star
                    </button>
                </div>

                {/* Notifications */}
                <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all group">
                    <FiBell size={20} className="group-hover:rotate-12 transition-transform" />
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 border-2 border-[#0F172A] rounded-full text-[8px] font-black text-white flex items-center justify-center">
                        3
                    </span>
                </button>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px h-6 bg-slate-800" />

                {/* User Info */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-xs font-black text-white leading-tight tracking-tight">{user?.name || 'User'}</span>
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter leading-none">Status: Active</span>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${isGreenStar ? 'bg-emerald-600' : 'bg-teal-600'} flex items-center justify-center text-white font-black text-sm shadow-lg shadow-black/20 ring-2 ring-slate-800`}>
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
