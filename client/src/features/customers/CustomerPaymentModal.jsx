import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentAPI } from '../../services/api';
import { FiX, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useBrand } from '../../App';

const CustomerPaymentModal = ({ customer, isOpen, onClose }) => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();

    const [transactionType, setTransactionType] = useState('Payment'); // 'Payment' or 'Rebate'
    const [formData, setFormData] = useState({
        amount: '',
        paymentMethod: 'Cash',
        description: ''
    });

    useEffect(() => {
        if (customer && isOpen) {
            setFormData(prev => ({
                ...prev,
                description: `${transactionType === 'Payment' ? 'Payment' : 'Rebate'} from ${customer.name}`
            }));
        }
    }, [customer, isOpen, transactionType]);

    const paymentMutation = useMutation({
        mutationFn: (data) => paymentAPI.receiveDealer(data),
        onSuccess: () => {
            toast.success('Payment received successfully');
            queryClient.invalidateQueries(['customers']);
            queryClient.invalidateQueries(['payments']);
            queryClient.invalidateQueries(['ledger']);
            onClose();
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
            onClose();
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

    if (!isOpen || !customer) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ 
                    borderBottom: '1px solid #334155' 
                }}>
                    <h3>{transactionType === 'Payment' ? 'Receive Payment' : 'Record Rebate'}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="transaction-type-selector mb-4" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                type="button"
                                className={`btn-sm flex-1 ${transactionType === 'Payment' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setTransactionType('Payment')}
                            >
                                Payment
                            </button>
                            <button 
                                type="button"
                                className={`btn-sm flex-1 ${transactionType === 'Rebate' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ 
                                    backgroundColor: transactionType === 'Rebate' ? '#8b5cf6' : 'transparent',
                                    color: transactionType === 'Rebate' ? '#fff' : 'inherit'
                                }}
                                onClick={() => setTransactionType('Rebate')}
                            >
                                Rebate
                            </button>
                        </div>

                        <div className="payment-info mb-4" style={{ 
                            background: '#1e293b',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #334155'
                        }}>
                            <div className="text-sm text-muted">Customer</div>
                            <div className="font-bold text-lg" style={{ color: '#fff' }}>{customer.name}</div>
                            <div className="text-sm text-muted mt-2">Current Dues</div>
                            <div className="font-bold text-danger">{customer.totalDues}</div>
                        </div>

                        <div className="form-group">
                            <label>Amount <span className="required">*</span></label>
                            <div className="input-icon-wrapper">
                                <FiDollarSign className="input-icon" />
                                <input
                                    type="number"
                                    className="input pl-8"
                                    min="1"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        {transactionType === 'Payment' && (
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select
                                    className="input"
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Note</label>
                            <textarea
                                className="input"
                                rows="2"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional note..."
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn"
                            style={{ 
                                backgroundColor: transactionType === 'Payment' ? 'var(--greentel-primary)' : '#8b5cf6',
                                color: '#fff'
                            }}
                            disabled={mutationLoading}
                        >
                            {mutationLoading ? 'Processing...' : `Confirm ${transactionType}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPaymentModal;
