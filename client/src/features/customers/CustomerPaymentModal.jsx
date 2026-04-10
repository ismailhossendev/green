import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentAPI, ledgerAPI } from '../../services/api';
import { FiX, FiDollarSign, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useBrand } from '../../App';
import '../../components/ui/CrudModal.css';

const CustomerPaymentModal = ({ customer, isOpen, onClose }) => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();

    const [transactionType, setTransactionType] = useState('Payment'); // 'Payment' or 'Rebate'
    const [formData, setFormData] = useState({
        amount: '',
        paymentMethod: 'Cash',
        description: ''
    });

    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Animate in
    useEffect(() => {
        if (isOpen && customer) {
            requestAnimationFrame(() => {
                setIsVisible(true);
                setIsClosing(false);
            });
            setFormData(prev => ({
                ...prev,
                description: `${transactionType === 'Payment' ? 'Payment' : 'Rebate'} from ${customer.name}`
            }));
        }
    }, [customer, isOpen, transactionType]);

    // Animated close
    const handleClose = () => {
        setIsClosing(true);
        setIsVisible(false);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    const paymentMutation = useMutation({
        mutationFn: (data) => paymentAPI.receiveDealer(data),
        onSuccess: () => {
            toast.success('Payment received successfully');
            queryClient.invalidateQueries(['customers']);
            queryClient.invalidateQueries(['payments']);
            queryClient.invalidateQueries(['ledger']);
            handleClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        }
    });
    
    const rebateMutation = useMutation({
        mutationFn: (data) => ledgerAPI.recordAdjustment(data),
        onSuccess: () => {
            toast.success('Rebate recorded successfully');
            queryClient.invalidateQueries(['customers']);
            queryClient.invalidateQueries(['payments']);
            queryClient.invalidateQueries(['ledger']);
            handleClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to record rebate');
        }
    });

    const mutationLoading = paymentMutation.isPending || rebateMutation.isPending;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || formData.amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (transactionType === 'Payment') {
            paymentMutation.mutate({
                customerId: customer._id,
                brand: currentBrand,
                amount: parseFloat(formData.amount),
                paymentMethod: formData.paymentMethod,
                description: formData.description
            });
        } else {
            rebateMutation.mutate({
                customerId: customer._id,
                brand: currentBrand,
                amount: parseFloat(formData.amount),
                type: 'credit',
                description: formData.description || 'Customer Rebate'
            });
        }
    };

    if (!isOpen && !isClosing) return null;
    if (!customer) return null;

    const isPayment = transactionType === 'Payment';
    
    return (
        <div
            className={`crud-modal-overlay ${isVisible ? 'crud-modal-overlay--visible' : ''}`}
            onClick={handleClose}
        >
            <div
                className={`crud-modal-container ${isVisible ? 'crud-modal-container--visible' : ''} max-w-[480px]`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative top accent */}
                <div 
                    className="crud-modal-accent" 
                    style={{ 
                        background: isPayment 
                            ? 'linear-gradient(90deg, #14b8a6, #06b6d4, #14b8a6)' 
                            : 'linear-gradient(90deg, #818cf8, #6366f1, #818cf8)' 
                    }}
                />

                {/* Header */}
                <div className="crud-modal-header">
                    <div className="crud-modal-header-left">
                        <div 
                            className="crud-modal-icon"
                            style={{
                                background: isPayment ? 'rgba(20, 184, 166, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                                color: isPayment ? '#2dd4bf' : '#818cf8',
                                border: isPayment ? '1px solid rgba(20, 184, 166, 0.2)' : '1px solid rgba(99, 102, 241, 0.2)'
                            }}
                        >
                            {isPayment ? <FiDollarSign size={16} /> : <FiRefreshCw size={16} />}
                        </div>
                        <div>
                            <h3 className="crud-modal-title">
                                {isPayment ? 'Receive Payment' : 'Record Rebate'}
                            </h3>
                            <p className="crud-modal-subtitle">
                                {isPayment ? 'Record incoming funds' : 'Issue account credit'}
                            </p>
                        </div>
                    </div>
                    <button className="crud-modal-close" onClick={handleClose} type="button">
                        <FiX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="crud-modal-form">
                    <div className="crud-modal-body space-y-6">
                        
                        {/* Transaction Type Toggle */}
                        <div className="flex p-1 bg-slate-900/60 rounded-xl border border-slate-700/60 shadow-inner">
                            <button 
                                type="button"
                                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${
                                    isPayment 
                                        ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30' 
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                                onClick={() => setTransactionType('Payment')}
                            >
                                <FiDollarSign size={14} className={isPayment ? 'text-teal-200' : ''} /> Payment
                            </button>
                            <button 
                                type="button"
                                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${
                                    !isPayment 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                                onClick={() => setTransactionType('Rebate')}
                            >
                                <FiRefreshCw size={14} className={!isPayment ? 'text-indigo-200' : ''} /> Rebate
                            </button>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Target Account</p>
                                    <p className="text-base font-bold text-white leading-tight">{customer.companyName || customer.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Active Dues</p>
                                    <p className={`text-base font-bold tabular-nums ${customer.totalDues > 0 ? 'text-red-400' : 'text-teal-400'}`}>
                                        {customer.totalDues ? customer.totalDues.toLocaleString('en-IN', { style: 'currency', currency: 'BDT' }).replace('BDT', '৳') : '৳0.00'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div className="crud-field crud-field--full">
                                <label className="crud-field-label">
                                    Amount <span className="crud-field-required">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors">
                                        <b className="font-sans text-lg">৳</b>
                                    </div>
                                    <input
                                        type="number"
                                        className="crud-input pl-9"
                                        style={{ fontSize: '1.125rem', fontWeight: 600, padding: '0.75rem 1rem 0.75rem 2.5rem' }}
                                        min="1"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        autoFocus
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {isPayment && (
                                <div className="crud-field crud-field--full">
                                    <label className="crud-field-label">Channel</label>
                                    <div className="crud-select-wrapper">
                                        <select
                                            className="crud-input"
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        >
                                            <option value="Cash">💵 Cold Cash</option>
                                            <option value="Bank">🏦 Bank Transfer</option>
                                            <option value="Mobile Money">📲 Mobile Wallet</option>
                                            <option value="Cheque">📄 Corporate Cheque</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="crud-field crud-field--full">
                                <label className="crud-field-label">Internal Note</label>
                                <textarea
                                    className="crud-input"
                                    rows="2"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add intelligence about this transaction..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="crud-modal-footer">
                        <div className="crud-modal-footer-spacer" />
                        <button
                            type="button"
                            className="crud-btn crud-btn--ghost"
                            onClick={handleClose}
                            disabled={mutationLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="crud-btn"
                            disabled={mutationLoading}
                            style={{
                                background: isPayment 
                                    ? 'linear-gradient(135deg, #0d9488, #14b8a6)' 
                                    : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                color: 'white',
                                boxShadow: isPayment 
                                    ? '0 2px 10px rgba(20, 184, 166, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                                    : '0 2px 10px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            {mutationLoading ? (
                                <>
                                    <span className="crud-spinner" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {isPayment ? <FiDollarSign size={14} /> : <FiRefreshCw size={14} />}
                                    Execute {transactionType}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPaymentModal;
