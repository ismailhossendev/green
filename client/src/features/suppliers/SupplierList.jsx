import { useQuery } from '@tanstack/react-query';
import { supplierAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiTruck } from 'react-icons/fi';
import { useState } from 'react';

const SupplierList = () => {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['suppliers', search, typeFilter],
        queryFn: () => supplierAPI.getSuppliers({ search, type: typeFilter }),
    });

    const suppliers = data?.data?.suppliers || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Suppliers</h1>
                    <p className="page-subtitle">Manage suppliers</p>
                </div>
                <button className="btn btn-primary">
                    <FiPlus /> Add Supplier
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>

                <select
                    className="input select"
                    style={{ width: '150px' }}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="Product">Product</option>
                    <option value="Packet">Packet</option>
                    <option value="Others">Others</option>
                </select>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Type</th>
                                <th>Total Purchase</th>
                                <th>Total Payment</th>
                                <th>Total Dues</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : suppliers.length > 0 ? (
                                suppliers.map((supplier) => (
                                    <tr key={supplier._id}>
                                        <td className="font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <FiTruck style={{ color: 'var(--greentel-primary)' }} />
                                                {supplier.name}
                                            </div>
                                        </td>
                                        <td>{supplier.phone}</td>
                                        <td>
                                            <span className="badge badge-info">{supplier.type}</span>
                                        </td>
                                        <td>{formatCurrency(supplier.totalPurchaseAmount)}</td>
                                        <td className="text-success">{formatCurrency(supplier.totalPayment)}</td>
                                        <td className={supplier.totalDues > 0 ? 'text-danger font-semibold' : ''}>
                                            {formatCurrency(supplier.totalDues)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No suppliers found
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

export default SupplierList;
