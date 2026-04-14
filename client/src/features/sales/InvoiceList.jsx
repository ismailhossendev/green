import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand, useAuth } from '../../App';
import { salesAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiEye, FiPrinter, FiTrash2, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AdvancedFilter from '../../components/ui/AdvancedFilter';
import toast from 'react-hot-toast';

import InvoicePrint from './InvoicePrint';
import './InvoiceList.css';

const filterDefs = [
    {
        name: 'dateRange',
        label: 'Date Range',
        type: 'dateRange'
    }
];

const InvoiceList = () => {
    const { currentBrand } = useBrand();
    const { user } = useAuth();
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
    const [expandedRows, setExpandedRows] = useState(new Set());

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
            setExpandedRows(new Set()); // Clear expansion on page change
        }
    };

    const toggleRow = (id, e) => {
        // Don't toggle if clicking a button
        if (e.target.closest('button') || e.target.closest('a')) return;
        
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    return (
        <div className="flex flex-col gap-4">
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
                <div className="flex flex-col gap-2">
                    <h3 className="section-title text-sm uppercase tracking-wider text-slate-500 font-bold px-1">Overview</h3>
                    <div className="invoice-stats-grid">
                    <div className="card text-center" style={{ padding: '0.75rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Qty</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totals.totalQty || 0}</p>
                    </div>
                    <div className="card text-center" style={{ padding: '0.75rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Sales</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totals.totalAmount || 0)}</p>
                    </div>
                    <div className="card text-center" style={{ padding: '0.75rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Paid</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(totals.totalPaid || 0)}</p>
                    </div>
                    <div className="card text-center" style={{ padding: '0.75rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Due</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(totals.totalDues || 0)}</p>
                    </div>
                    {['Admin', 'Manager'].includes(user?.role) && (
                        <div className="card text-center" style={{ padding: '0.75rem', gridColumn: '1 / -1' }}>
                            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Profit</h4>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--greentel-primary)' }}>
                                {formatCurrency(totals.totalProfit || 0)}
                            </p>
                        </div>
                    )}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card">
                <div className="filter-header-row">
                    <div>
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
                            showSearch={true}
                            searchPlaceholder="Search invoices..."
                        />
                    </div>
                    <div>
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
            <div className="card invoice-table-card">
                <div className="table-container">
                    <table className="table table-responsive-cards">
                        <thead>
                            <tr>
                                <th>Invoice No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Total Qty</th>
                                <th>Amount</th>
                                {['Admin', 'Manager'].includes(user?.role) && <th>Profit</th>}
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
                                    <td colSpan={['Admin', 'Manager'].includes(user?.role) ? "11" : "10"} className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <tr 
                                        key={invoice._id}
                                        className={`invoice-row ${expandedRows.has(invoice._id) ? 'is-expanded' : ''}`}
                                        onClick={(e) => toggleRow(invoice._id, e)}
                                    >
                                        <td data-label="Invoice No" className="font-medium invoice-no-cell">
                                            <div className="flex items-center gap-2">
                                                <span className="mobile-chevron">
                                                    {expandedRows.has(invoice._id) ? <FiChevronUp /> : <FiChevronDown />}
                                                </span>
                                                {invoice.invoiceNo}
                                            </div>
                                        </td>
                                        <td data-label="Date">{new Date(invoice.date).toLocaleDateString()}</td>
                                        <td data-label="Customer">
                                            <div className="customer-cell">
                                                {invoice.customer?.companyName && <div style={{ fontWeight: 600 }}>{invoice.customer.companyName}</div>}
                                                <div style={{ fontSize: invoice.customer?.companyName ? '0.85em' : '1em', color: invoice.customer?.companyName ? '#999' : 'inherit' }}>{invoice.customer?.name || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td data-label="Total Qty">{invoice.totalQty}</td>
                                        <td data-label="Amount">{formatCurrency(invoice.grandTotal)}</td>
                                        {['Admin', 'Manager'].includes(user?.role) && (
                                            <td data-label="Profit" style={{ color: 'var(--greentel-primary)', fontWeight: 'bold' }}>
                                                {formatCurrency(invoice.profit || 0)}
                                            </td>
                                        )}
                                        <td data-label="Discount">{formatCurrency(invoice.discount)}</td>
                                        <td data-label="Paid" className="text-success">{formatCurrency(invoice.paidAmount)}</td>
                                        <td data-label="Due" className={invoice.dues > 0 ? 'text-danger font-semibold' : ''}>
                                            {formatCurrency(invoice.dues)}
                                        </td>
                                        <td data-label="Status">
                                            <span className={`badge ${invoice.dues > 0 ? 'badge-warning' : 'badge-success'}`}>
                                                {invoice.dues > 0 ? 'Due' : 'Paid'}
                                            </span>
                                        </td>
                                        <td data-label="Actions">
                                            <div className="action-buttons">
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
                                    <td colSpan={['Admin', 'Manager'].includes(user?.role) ? "11" : "10"} className="text-center text-muted" style={{ padding: '3rem' }}>
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
