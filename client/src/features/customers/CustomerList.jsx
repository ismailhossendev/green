import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { customerAPI } from '../../services/api';
import { formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiUsers, FiMapPin, FiEdit2, FiTrash2, FiDollarSign, FiBook, FiPhone, FiTrendingUp, FiArrowRight, FiFilter } from 'react-icons/fi';
import CrudModal from '../../components/ui/CrudModal';
import CustomerPaymentModal from './CustomerPaymentModal';
import toast from 'react-hot-toast';

const CustomerList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [district, setDistrict] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDuesOnly, setShowDuesOnly] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [modalMode, setModalMode] = useState('add');

    const { data, isLoading } = useQuery({
        queryKey: ['customers', currentBrand, search, district],
        queryFn: () => customerAPI.getCustomers({ brand: currentBrand, search, district, limit: 1000 }),
    });

    let customers = data?.data?.customers || [];
    if (showDuesOnly) {
        customers = customers.filter(c => c.totalDues > 0);
    }

    const totalDues = customers.reduce((acc, c) => acc + (c.totalDues || 0), 0);
    const dealerCount = customers.filter(c => c.type === 'Dealer').length;

    // Fields for CrudModal
    const fields = [
        { name: 'companyName', label: 'Company Name', type: 'text' },
        { name: 'name', label: 'Customer Name', type: 'text', required: true },
        { name: 'phone', label: 'Phone Number', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'district', label: 'District', type: 'select', options: BrandingConfig.districts, required: true },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'type', label: 'Type', type: 'select', options: ['Retail', 'Dealer', 'Ecommerce'], required: true },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Green Tel', 'Green Star', 'Both'], required: true, defaultValue: currentBrand },
        // Only show opening dues when adding a new customer
        ...(modalMode === 'add' ? [{ name: 'openingDues', label: 'Opening Dues (Optional)', type: 'number', min: '0', step: '0.01' }] : [])
    ];

    const createMutation = useMutation({
        mutationFn: (data) => customerAPI.createCustomer(data),
        onSuccess: () => {
            toast.success('Customer created successfully');
            queryClient.invalidateQueries(['customers']);
            setShowModal(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create customer');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => customerAPI.updateCustomer(selectedCustomer._id, data),
        onSuccess: () => {
            toast.success('Customer updated successfully');
            queryClient.invalidateQueries(['customers']);
            setShowModal(false);
            setSelectedCustomer(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update customer');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => customerAPI.deleteCustomer(id),
        onSuccess: () => {
            toast.success('Customer deleted successfully');
            queryClient.invalidateQueries(['customers']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete customer');
        }
    });

    const handleSubmit = (data) => {
        if (modalMode === 'add') {
            createMutation.mutate(data);
        } else {
            updateMutation.mutate(data);
        }
    };

    const handleEdit = (customer) => {
        setSelectedCustomer(customer);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            deleteMutation.mutate(id);
        }
    };

    const handlePayment = (customer) => {
        setSelectedCustomer(customer);
        setShowPaymentModal(true);
    };

    const handleAdd = () => {
        setSelectedCustomer(null);
        setModalMode('add');
        setShowModal(true);
    };

    return (
        <div className="flex flex-col gap-5 min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                        Customers
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {customers.length} accounts · {currentBrand}
                    </p>
                </div>
                <button
                    className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] shadow-lg shadow-teal-900/30"
                    onClick={handleAdd}
                >
                    <FiPlus size={18} />
                    Add Customer
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl group hover:border-slate-600/50 transition-colors">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-2xl" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Receivables</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-400">{formatCurrency(totalDues)}</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl group hover:border-slate-600/50 transition-colors">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full blur-2xl" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Active Accounts</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{customers.length}</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl group hover:border-slate-600/50 transition-colors">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Dealers</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-400">{dealerCount}</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl group hover:border-slate-600/50 transition-colors">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-2xl" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">With Dues</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-400">{customers.filter(c => c.totalDues > 0).length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, company, or phone..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="w-full sm:w-44 px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                >
                    <option value="">All Districts</option>
                    {BrandingConfig.districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${showDuesOnly
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                            : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600/50'
                        }`}
                    onClick={() => setShowDuesOnly(!showDuesOnly)}
                >
                    <FiFilter size={14} />
                    {showDuesOnly ? 'Showing Dues' : 'Filter Dues'}
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Loading customers...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && customers.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-24">
                    <div className="w-14 h-14 rounded-xl bg-slate-800/60 flex items-center justify-center">
                        <FiUsers size={28} className="text-slate-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-400">No customers found</p>
                        <p className="text-xs text-slate-600 mt-1">Add a new customer to get started</p>
                    </div>
                </div>
            )}

            {/* ========== MOBILE CARDS (visible < lg) ========== */}
            {!isLoading && customers.length > 0 && (
                <div className="lg:hidden flex flex-col gap-3">
                    {customers.map((customer) => (
                        <div
                            key={customer._id}
                            className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden transition-all active:scale-[0.99]"
                        >
                            {/* Card top: Avatar + Name + Balance */}
                            <div className="flex items-start justify-between p-4 pb-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center text-sm font-bold text-teal-400 shrink-0 border border-teal-500/20">
                                        {(customer.companyName || customer.name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate leading-tight">
                                            {customer.companyName || customer.name}
                                        </p>
                                        {customer.companyName && <p className="text-[11px] text-slate-500 truncate mt-0.5">{customer.name}</p>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <p className={`text-lg font-bold tabular-nums leading-tight ${customer.totalDues > 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                        {formatCurrency(customer.totalDues)}
                                    </p>
                                    <p className="text-[9px] font-medium text-slate-600 uppercase tracking-wider mt-0.5">Balance</p>
                                </div>
                            </div>

                            {/* Card middle: Details row */}
                            <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] text-teal-400/80 font-mono">
                                    <FiPhone size={10} className="text-teal-500/60" />
                                    {customer.phone}
                                </span>
                                <span className="text-slate-700">·</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                    <FiMapPin size={10} className="text-slate-500/60" />
                                    {customer.district}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${customer.type === 'Dealer'
                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                                        : 'bg-slate-800/80 text-slate-500 border border-slate-700/40'
                                    }`}>
                                    {customer.type}
                                </span>
                            </div>

                            {/* Card bottom: Actions */}
                            <div className="flex items-center border-t border-slate-700/30 divide-x divide-slate-700/30">
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-semibold transition-all active:bg-emerald-500/20"
                                    onClick={() => {
                                        setSelectedCustomer(customer);
                                        setShowPaymentModal(true);
                                    }}
                                >
                                    <FiDollarSign size={13} /> Pay
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-slate-400 hover:bg-slate-700/30 text-[11px] font-semibold transition-all active:bg-slate-700/50"
                                    onClick={() => navigate(`/ledger?customer=${customer._id}&brand=${currentBrand}`)}
                                >
                                    <FiBook size={13} /> Ledger
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-slate-400 hover:bg-slate-700/30 text-[11px] font-semibold transition-all active:bg-slate-700/50"
                                    onClick={() => handleEdit(customer)}
                                >
                                    <FiEdit2 size={13} /> Edit
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-red-400/70 hover:bg-red-500/10 text-[11px] font-semibold transition-all active:bg-red-500/20"
                                    onClick={() => handleDelete(customer._id)}
                                >
                                    <FiTrash2 size={13} /> Del
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ========== DESKTOP TABLE (visible >= lg) ========== */}
            {!isLoading && customers.length > 0 && (
                <div className="hidden lg:block bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800/80">
                                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                                <th className="px-5 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {customers.map((customer) => (
                                <tr key={customer._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-teal-400 shrink-0 border border-slate-700/50">
                                                {(customer.companyName || customer.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-teal-400 transition-colors">
                                                    {customer.companyName || customer.name}
                                                </p>
                                                {customer.companyName && <p className="text-[11px] text-slate-500 truncate mt-0.5">{customer.name}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm font-mono text-teal-400/90">{customer.phone}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/60 border border-slate-700/40 rounded text-[11px] text-slate-400">
                                                <FiMapPin size={10} className="text-slate-500" />
                                                {customer.district}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${customer.type === 'Dealer'
                                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                                                }`}>
                                                {customer.type}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span className={`text-base font-bold tabular-nums ${customer.totalDues > 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                            {formatCurrency(customer.totalDues)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-md text-[11px] font-semibold transition-all border border-emerald-500/20 hover:border-transparent"
                                                title="Payment"
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setShowPaymentModal(true);
                                                }}
                                            >
                                                <FiDollarSign size={13} /> Pay
                                            </button>
                                            <button
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md text-[11px] font-semibold transition-all border border-slate-700/40"
                                                title="View Ledger"
                                                onClick={() => navigate(`/ledger?customer=${customer._id}&brand=${currentBrand}`)}
                                            >
                                                <FiBook size={13} /> Ledger
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all"
                                                title="Edit"
                                                onClick={() => handleEdit(customer)}
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                                title="Delete"
                                                onClick={() => handleDelete(customer._id)}
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Crud Modal */}
            <CrudModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Customer"
                initialData={selectedCustomer}
                fields={fields}
                onSubmit={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
            />

            {/* Payment Modal */}
            <CustomerPaymentModal
                isOpen={showPaymentModal}
                customer={selectedCustomer}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedCustomer(null);
                }}
            />
        </div>
    );
};

export default CustomerList;
