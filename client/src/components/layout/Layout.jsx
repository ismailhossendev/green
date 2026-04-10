import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#0F172A] flex overflow-hidden">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm lg:hidden" 
                    onClick={() => setSidebarOpen(false)} 
                />
            )}

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
                
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Bottom Navigation Placeholder or Footer if needed */}
                <div className="lg:hidden h-16 shrink-0" />
            </div>
        </div>
    );
};

export default Layout;
