import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiTruck, FiEdit2, FiTrash2, FiDollarSign, FiMapPin, FiPhone } from 'react-icons/fi';
import CrudModal from '../../components/ui/CrudModal';
import StockEditModal from '../inventory/StockEditModal';
import SupplierPaymentModal from './SupplierPaymentModal';
import toast from 'react-hot-toast';

const SupplierList = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [modalMode, setModalMode] = useState('add');
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payingSupplier, setPayingSupplier] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['suppliers', search, typeFilter],
        queryFn: () => supplierAPI.getSuppliers({ search, type: typeFilter }),
    });

    const suppliers = data?.data?.suppliers || [];
    const totalDues = suppliers.reduce((acc, s) => acc + (s.totalDues || 0), 0);

    // CrudModal fields
    const fields = [
        { name: 'name', label: 'Supplier Name', type: 'text', required: true },
        { name: 'phone', label: 'Phone Number', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'textarea', fullWidth: true },
        { name: 'type', label: 'Type', type: 'select', options: ['Product', 'Packet', 'Others'], required: true },
        ...(modalMode === 'add' ? [{ name: 'openingBalance', label: 'Opening Balance', type: 'number', min: '0', step: '0.01' }] : [])
    ];

    const createMutation = useMutation({
        mutationFn: (data) => supplierAPI.createSupplier(data),
        onSuccess: () => {
            toast.success('Supplier created successfully');
            queryClient.invalidateQueries(['suppliers']);
            setShowModal(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create supplier');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => supplierAPI.updateSupplier(selectedSupplier._id, data),
        onSuccess: () => {
            toast.success('Supplier updated successfully');
            queryClient.invalidateQueries(['suppliers']);
            setShowModal(false);
            setSelectedSupplier(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update supplier');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => supplierAPI.deleteSupplier(id),
        onSuccess: () => {
            toast.success('Supplier deleted successfully');
            queryClient.invalidateQueries(['suppliers']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete supplier');
        }
    });

    const handleSubmit = (data) => {
        if (modalMode === 'add') {
            createMutation.mutate(data);
        } else {
            updateMutation.mutate(data);
        }
    };

    const handleEdit = (supplier) => {
        setSelectedSupplier(supplier);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleAdd = () => {
        setSelectedSupplier(null);
        setModalMode('add');
        setShowModal(true);
    };

    return (
        <div className="flex flex-col gap-5 min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                        Suppliers
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {suppliers.length} suppliers registered
                    </p>
                </div>
                <button
                    className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] shadow-lg shadow-teal-900/30"
                    onClick={handleAdd}
                >
                    <FiPlus size={18} />
                    Add Supplier
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Suppliers</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{suppliers.length}</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Payable</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-400">{formatCurrency(totalDues)}</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 p-4 rounded-xl hidden lg:block">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">With Dues</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-400">{suppliers.filter(s => s.totalDues > 0).length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search suppliers..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="w-full sm:w-40 px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="Product">Product</option>
                    <option value="Packet">Packet</option>
                    <option value="Others">Others</option>
                </select>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Loading suppliers...</p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && suppliers.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-24">
                    <div className="w-14 h-14 rounded-xl bg-slate-800/60 flex items-center justify-center">
                        <FiTruck size={28} className="text-slate-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-400">No suppliers found</p>
                        <p className="text-xs text-slate-600 mt-1">Add a new supplier to get started</p>
                    </div>
                </div>
            )}

            {/* ========== MOBILE CARDS (< lg) ========== */}
            {!isLoading && suppliers.length > 0 && (
                <div className="lg:hidden flex flex-col gap-3">
                    {suppliers.map((supplier) => (
                        <div
                            key={supplier._id}
                            className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden transition-all active:scale-[0.99]"
                        >
                            {/* Card header */}
                            <div className="flex items-start justify-between p-4 pb-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center text-sm font-bold text-orange-400 shrink-0 border border-orange-500/20">
                                        {supplier.name?.charAt(0)?.toUpperCase() || 'S'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate leading-tight">{supplier.name}</p>
                                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                            supplier.type === 'Product' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                                            : supplier.type === 'Packet' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                                            : 'bg-slate-800/80 text-slate-500 border border-slate-700/40'
                                        }`}>{supplier.type}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <p className={`text-lg font-bold tabular-nums leading-tight ${supplier.totalDues > 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                        {formatCurrency(supplier.totalDues)}
                                    </p>
                                    <p className="text-[9px] font-medium text-slate-600 uppercase tracking-wider mt-0.5">Due</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] text-teal-400/80 font-mono">
                                    <FiPhone size={10} className="text-teal-500/60" />
                                    {supplier.phone}
                                </span>
                                <span className="text-slate-700">·</span>
                                <span className="text-[11px] text-slate-500">Purchase: {formatCurrency(supplier.totalPurchaseAmount)}</span>
                                <span className="text-slate-700">·</span>
                                <span className="text-[11px] text-emerald-400/80">Paid: {formatCurrency(supplier.totalPayment)}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center border-t border-slate-700/30 divide-x divide-slate-700/30">
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-slate-400 hover:bg-slate-700/30 text-[11px] font-semibold transition-all active:bg-slate-700/50"
                                    onClick={() => handleEdit(supplier)}
                                >
                                    <FiEdit2 size={13} /> Edit
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-emerald-400/80 hover:bg-emerald-500/10 text-[11px] font-semibold transition-all active:bg-emerald-500/20"
                                    onClick={() => {
                                        setPayingSupplier(supplier);
                                        setPayModalOpen(true);
                                    }}
                                >
                                    <FiDollarSign size={13} /> Pay
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-red-400/70 hover:bg-red-500/10 text-[11px] font-semibold transition-all active:bg-red-500/20"
                                    onClick={() => handleDelete(supplier._id)}
                                >
                                    <FiTrash2 size={13} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ========== DESKTOP TABLE (>= lg) ========== */}
            {!isLoading && suppliers.length > 0 && (
                <div className="hidden lg:block bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800/80">
                                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purchase</th>
                                <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                                <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dues</th>
                                <th className="px-5 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {suppliers.map((supplier) => (
                                <tr key={supplier._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-orange-400 shrink-0 border border-slate-700/50">
                                                {supplier.name?.charAt(0)?.toUpperCase() || 'S'}
                                            </div>
                                            <span className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">
                                                {supplier.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm font-mono text-teal-400/90">{supplier.phone}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                            supplier.type === 'Product' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            : supplier.type === 'Packet' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                                        }`}>{supplier.type}</span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span className="text-sm text-slate-300">{formatCurrency(supplier.totalPurchaseAmount)}</span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span className="text-sm text-emerald-400">{formatCurrency(supplier.totalPayment)}</span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span className={`text-base font-bold tabular-nums ${supplier.totalDues > 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                            {formatCurrency(supplier.totalDues)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                className="p-1.5 text-emerald-500 hover:text-white hover:bg-emerald-600 rounded-md transition-all"
                                                title="Record Payment"
                                                onClick={() => {
                                                    setPayingSupplier(supplier);
                                                    setPayModalOpen(true);
                                                }}
                                            >
                                                <FiDollarSign size={14} />
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all"
                                                title="Edit"
                                                onClick={() => handleEdit(supplier)}
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                                title="Delete"
                                                onClick={() => handleDelete(supplier._id)}
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

            {/* CrudModal for Add/Edit */}
            <CrudModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Supplier"
                initialData={selectedSupplier}
                fields={fields}
                onSubmit={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
            />

            {payModalOpen && payingSupplier && (
                <SupplierPaymentModal 
                    supplier={payingSupplier} 
                    onClose={() => {
                        setPayModalOpen(false);
                        setPayingSupplier(null);
                    }} 
                />
            )}
        </div>
    );
};

export default SupplierList;
