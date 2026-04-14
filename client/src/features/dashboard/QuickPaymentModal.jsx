import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentAPI, customerAPI } from '../../services/api';
import { useBrand } from '../../App';
import { FiDollarSign, FiUser, FiCreditCard, FiAlignLeft, FiX, FiCheckCircle } from 'react-icons/fi';
import SearchableSelect from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';

const QuickPaymentModal = ({ isOpen, onClose }) => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        customerId: '',
        amount: '',
        paymentMethod: 'Cash',
        description: ''
    });
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const mutation = useMutation({
        mutationFn: (data) => paymentAPI.receiveDealer(data),
        onSuccess: () => {
            toast.success('Payment recorded successfully');
            queryClient.invalidateQueries(['today-stats', currentBrand]);
            queryClient.invalidateQueries(['customer-ledger']);
            handleClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        }
    });

    const handleClose = () => {
        setFormData({
            customerId: '',
            amount: '',
            paymentMethod: 'Cash',
            description: ''
        });
        setSelectedCustomer(null);
        onClose();
    };

    const loadCustomers = async (query) => {
        try {
            const response = await customerAPI.getCustomers({ search: query, limit: 10 });
            return response.data.customers.map(c => ({
                value: c._id,
                label: c.name,
                subLabel: c.companyName || c.phone,
                ...c
            }));
        } catch (error) {
            return [];
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.customerId) return toast.error('Please select a customer');
        if (!formData.amount || formData.amount <= 0) return toast.error('Enter a valid amount');
        mutation.mutate({ ...formData, brand: currentBrand });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
            <div 
                className="bg-[#111827] border border-white/10 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            >
                {/* Header with Background Pattern */}
                <div className="relative px-8 pt-8 pb-6 overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <FiDollarSign size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Quick Payment</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{currentBrand}</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
                    {/* Customer Selection */}
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2 px-1">
                            <FiUser size={14} className="text-emerald-500" /> Customer / Dealer
                        </label>
                        <SearchableSelect
                            loadOptions={loadCustomers}
                            value={selectedCustomer}
                            onChange={(val) => {
                                setSelectedCustomer(val);
                                setFormData(prev => ({ ...prev, customerId: val?.value || '' }));
                            }}
                            placeholder="Find customer..."
                            defaultOptions={true}
                            className="premium-select"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Amount */}
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2 px-1">
                                <FiDollarSign size={14} className="text-emerald-500" /> Amount
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || '' }))}
                                    className="input font-bold text-lg"
                                    style={{ paddingRight: '2.5rem' }}
                                    placeholder="0"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xl">৳</div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2 px-1">
                                <FiCreditCard size={14} className="text-emerald-500" /> Method
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    className="input select font-bold text-sm"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank</option>
                                    <option value="Mobile Banking">Mobile</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <FiCreditCard size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2 px-1">
                            <FiAlignLeft size={14} className="text-emerald-500" /> Payment Remarks
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="input resize-none text-sm font-medium"
                            placeholder="Optional payment notes..."
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-6 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-bold rounded-2xl transition-all border border-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-[1.5] px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            {mutation.isPending ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><FiCheckCircle size={18} /> Record Payment</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickPaymentModal;
