import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI, financeAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiArchive, FiDollarSign, FiActivity } from 'react-icons/fi';
import AssetCreate from './AssetCreate';
import toast from 'react-hot-toast';

const AssetManagement = () => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const { data: assetData, isLoading } = useQuery({
        queryKey: ['asset-report'],
        queryFn: () => reportsAPI.getAssets()
    });

    const report = assetData?.data;

    if (isLoading) return <div className="text-center p-8">Loading assets report...</div>;
    if (!report) return <div className="text-center p-8">No asset data found.</div>;

    const { inventory, market, investments, summary } = report;

    return (
        <div className="asset-management mt-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Asset Management</h2>
                    <p className="text-muted">Detailed view of business assets and liabilities</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <FiPlus /> Record New Asset/Investment
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="stat-card" style={{ borderLeft: '4px solid #10B981' }}>
                    <div className="flex items-center gap-3">
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                            <FiArchive />
                        </div>
                        <div>
                            <span className="stat-label">Total Assets</span>
                            <span className="stat-value">{formatCurrency(summary.totalAssets)}</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #EF4444' }}>
                    <div className="flex items-center gap-3">
                        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                            <FiTrendingDown />
                        </div>
                        <div>
                            <span className="stat-label">Total Liabilities</span>
                            <span className="stat-value">{formatCurrency(summary.totalLiabilities)}</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #00796B', background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-3">
                        <div className="stat-icon" style={{ background: 'rgba(0, 121, 107, 0.2)', color: 'white' }}>
                            <FiTrendingUp />
                        </div>
                        <div>
                            <span className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Net Worth</span>
                            <span className="stat-value" style={{ color: 'white' }}>{formatCurrency(summary.netWorth)}</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #3B82F6' }}>
                    <div className="flex items-center gap-3">
                        <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                            <FiActivity />
                        </div>
                        <div>
                            <span className="stat-label">Inventory Value</span>
                            <span className="stat-value">{formatCurrency(inventory.productValue + inventory.packetValue)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Investment List */}
                <div className="card">
                    <h3 className="card-title mb-4">Fixed Assets & Investments</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th className="text-right">Initial Val</th>
                                    <th className="text-right">Current Val</th>
                                    <th className="text-right">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investments.details.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-4">No investments found</td></tr>
                                ) : (
                                    investments.details.map((inv) => {
                                        const pl = inv.currentValue - inv.amount;
                                        return (
                                            <tr key={inv._id}>
                                                <td>{inv.description}</td>
                                                <td><span className="badge badge-info">{inv.type}</span></td>
                                                <td className="text-right">{formatCurrency(inv.amount)}</td>
                                                <td className="text-right">{formatCurrency(inv.currentValue)}</td>
                                                <td className={`text-right font-semibold ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Liability & Other Assets */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="card-title mb-4">Market Position</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                                        <FiTrendingUp />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Customer Receivables</div>
                                        <div className="text-xs text-muted">Total Dues from Customers</div>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-success">{formatCurrency(market.customerDues)}</div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                                        <FiTrendingDown />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Supplier Payables</div>
                                        <div className="text-xs text-muted">Total Dues to Suppliers</div>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-danger">{formatCurrency(market.supplierDues)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title mb-4">Investment Summary by Type</h3>
                        <div className="space-y-3">
                            {investments.summary.map(s => (
                                <div key={s._id} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{s._id} ({s.count})</span>
                                        <span className="font-bold">{formatCurrency(s.currentValue)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-primary h-full rounded-full" 
                                            style={{ 
                                                width: `${(s.currentValue / investments.summary.reduce((a,b)=>a+b.currentValue,0)) * 100}%`,
                                                backgroundColor: s._id === 'Fixed Asset' ? '#00796B' : '#10B981'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isCreateModalOpen && (
                <AssetCreate onClose={() => setIsCreateModalOpen(false)} />
            )}
        </div>
    );
};

export default AssetManagement;
