import { useQuery } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { purchaseAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useState } from 'react';

const PurchaseList = () => {
    const { currentBrand } = useBrand();
    const [search, setSearch] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['purchases', currentBrand],
        queryFn: () => purchaseAPI.getPurchases({ brand: currentBrand }),
    });

    const purchases = data?.data?.purchases || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Purchase</h1>
                    <p className="page-subtitle">{currentBrand} purchases</p>
                </div>
                <button className="btn btn-primary">
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
        </div>
    );
};

export default PurchaseList;
