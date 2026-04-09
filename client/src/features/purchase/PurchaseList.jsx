import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { purchaseAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiEye, FiTrash2 } from 'react-icons/fi';
import { useState } from 'react';
import PurchaseCreate from './PurchaseCreate';
import PurchasePrint from './PurchasePrint';
import toast from 'react-hot-toast';

const PurchaseList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['purchases', currentBrand],
        queryFn: () => purchaseAPI.getPurchases({ brand: currentBrand }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => purchaseAPI.deletePurchase(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['purchases']);
            queryClient.invalidateQueries(['products']);
            queryClient.invalidateQueries(['suppliers']);
            toast.success('Purchase deleted and stock rolled back');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete purchase');
        }
    });

    const handleDelete = (purchase) => {
        if (window.confirm(`Are you sure you want to delete purchase ${purchase.purchaseNo}? This will subtract ${purchase.totalQty} items from your stock and update the supplier balance.`)) {
            deleteMutation.mutate(purchase._id);
        }
    };

    const purchases = data?.data?.purchases || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Purchase</h1>
                    <p className="page-subtitle">{currentBrand} purchases</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <FiPlus /> New Purchase
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search purchases..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Purchase No</th>
                                <th>Date</th>
                                <th>Supplier</th>
                                <th>Total Qty</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Due</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : purchases.length > 0 ? (
                                purchases.map((purchase) => (
                                    <tr key={purchase._id}>
                                        <td className="font-medium">{purchase.purchaseNo}</td>
                                        <td>{new Date(purchase.date).toLocaleDateString()}</td>
                                        <td>{purchase.supplier?.name || 'N/A'}</td>
                                        <td>{purchase.totalQty}</td>
                                        <td>{formatCurrency(purchase.totalAmount)}</td>
                                        <td className="text-success">{formatCurrency(purchase.paidAmount)}</td>
                                        <td className={purchase.dues > 0 ? 'text-danger' : ''}>
                                            {formatCurrency(purchase.dues)}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${purchase.status === 'Received' ? 'success' : 'warning'}`}>
                                                {purchase.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    className="btn btn-icon btn-secondary" 
                                                    title="View Purchase"
                                                    onClick={() => setSelectedPurchase(purchase)}
                                                >
                                                    <FiEye />
                                                </button>
                                                <button 
                                                    className="btn btn-icon btn-danger" 
                                                    title="Delete & Rollback"
                                                    onClick={() => handleDelete(purchase)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No purchases found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isCreateModalOpen && (
                <PurchaseCreate onClose={() => setIsCreateModalOpen(false)} />
            )}

            {selectedPurchase && (
                <PurchasePrint 
                    purchase={selectedPurchase} 
                    brand={currentBrand} 
                    onClose={() => setSelectedPurchase(null)} 
                />
            )}
        </div>
    );
};

export default PurchaseList;
