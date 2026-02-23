import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { salesAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiEye, FiPrinter, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AdvancedFilter from '../../components/ui/AdvancedFilter';
import toast from 'react-hot-toast';

import InvoicePrint from './InvoicePrint';

const InvoiceList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();

    // State
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [printInvoice, setPrintInvoice] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: ''
    });
    const [sortBy, setSortBy] = useState('createdAt');

    // Query
    const { data, isLoading } = useQuery({
        queryKey: ['invoices', currentBrand, filters, page, limit, sortBy],
        queryFn: () => salesAPI.getInvoices({
            brand: currentBrand,
            ...filters,
            page,
            limit,
            sortBy
        }),
    });

    const invoices = data?.data?.invoices || [];
    const pagination = data?.data?.pagination || {};
    const totals = data?.data?.totals || {};

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => salesAPI.deleteInvoice(id),
        onSuccess: () => {
            toast.success('Invoice deleted successfully');
            queryClient.invalidateQueries(['invoices']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete invoice');
        }
    });

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone and will rollback stock.')) {
            deleteMutation.mutate(id);
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPage(newPage);
        }
    };

    const filterDefs = [
        {
            name: 'search',
            label: 'Search',
            type: 'text',
            placeholder: 'Search invoice no or customer...'
        },
        {
            name: 'dateRange',
            label: 'Date Range',
            type: 'dateRange'
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales / Invoices</h1>
                    <p className="page-subtitle">{currentBrand} sales invoices</p>
                </div>
                <Link to="/sales/new" className="btn btn-primary">
                    <FiPlus /> New Invoice
                </Link>
            </div>

            {/* Stats Summary */}
            {!isLoading && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="card text-center p-4">
                        <h4 className="text-gray-500 text-sm">Total Quantity</h4>
                        <p className="text-2xl font-bold">{totals.totalQty || 0}</p>
                    </div>
                    <div className="card text-center p-4">
                        <h4 className="text-gray-500 text-sm">Total Sales</h4>
                        <p className="text-2xl font-bold text-success">{formatCurrency(totals.totalAmount || 0)}</p>
                    </div>
                    <div className="card text-center p-4">
                        <h4 className="text-gray-500 text-sm">Total Paid</h4>
                        <p className="text-2xl font-bold">{formatCurrency(totals.totalPaid || 0)}</p>
                    </div>
                    <div className="card text-center p-4">
                        <h4 className="text-gray-500 text-sm">Total Due</h4>
                        <p className="text-2xl font-bold text-danger">{formatCurrency(totals.totalDues || 0)}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <AdvancedFilter
                            filters={filterDefs}
                            onFilterChange={(vals) => {
                                // Handle date range specifically
                                if (vals.dateRange) {
                                    handleFilterChange({
                                        search: vals.search,
                                        startDate: vals.dateRange.from,
                                        endDate: vals.dateRange.to
                                    });
                                } else {
                                    handleFilterChange(vals);
                                }
                            }}
                            showSearch={false} // Using custom search in filters def
                        />
                    </div>
                    <div style={{ minWidth: '160px' }}>
                        <select
                            className="input select text-sm"
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            style={{ padding: '0.5rem' }}
                        >
                            <option value="createdAt">Latest First</option>
                            <option value="invoiceNo">Invoice No</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Total Qty</th>
                                <th>Amount</th>
                                <th>Discount</th>
                                <th>Paid</th>
                                <th>Due</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <tr key={invoice._id}>
                                        <td className="font-medium">{invoice.invoiceNo}</td>
                                        <td>{new Date(invoice.date).toLocaleDateString()}</td>
                                        <td>
                                            <div>
                                                {invoice.customer?.companyName && <div style={{ fontWeight: 600 }}>{invoice.customer.companyName}</div>}
                                                <div style={{ fontSize: invoice.customer?.companyName ? '0.85em' : '1em', color: invoice.customer?.companyName ? '#999' : 'inherit' }}>{invoice.customer?.name || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td>{invoice.totalQty}</td>
                                        <td>{formatCurrency(invoice.grandTotal)}</td>
                                        <td>{formatCurrency(invoice.discount)}</td>
                                        <td className="text-success">{formatCurrency(invoice.paidAmount)}</td>
                                        <td className={invoice.dues > 0 ? 'text-danger font-semibold' : ''}>
                                            {formatCurrency(invoice.dues)}
                                        </td>
                                        <td>
                                            <span className={`badge ${invoice.dues > 0 ? 'badge-warning' : 'badge-success'}`}>
                                                {invoice.dues > 0 ? 'Due' : 'Paid'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {/* <button className="btn btn-icon btn-secondary">
                                                    <FiEye />
                                                </button> */}
                                                <button
                                                    className="btn btn-icon btn-secondary"
                                                    onClick={() => setPrintInvoice(invoice)}
                                                    title="Print Invoice"
                                                >
                                                    <FiPrinter />
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-danger"
                                                    onClick={() => handleDelete(invoice._id)}
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
                                    <td colSpan="10" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No invoices found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && pagination.pages > 1 && (
                    <div className="pagination">
                        <span className="text-sm text-muted">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page === 1}
                                onClick={() => handlePageChange(page - 1)}
                            >
                                <FiChevronLeft /> Previous
                            </button>
                            <span className="pagination-page">
                                Page {page} of {pagination.pages}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page === pagination.pages}
                                onClick={() => handlePageChange(page + 1)}
                            >
                                Next <FiChevronRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Modal */}
            {printInvoice && (
                <InvoicePrint
                    invoice={printInvoice}
                    brand={currentBrand}
                    onClose={() => setPrintInvoice(null)}
                />
            )}
        </div>
    );
};

export default InvoiceList;
