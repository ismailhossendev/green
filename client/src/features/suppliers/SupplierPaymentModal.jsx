import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierAPI } from '../../services/api';
import { FiX, FiSave } from 'react-icons/fi';
import { formatCurrency } from '../../config/brandingConfig';
import toast from 'react-hot-toast';

const SupplierPaymentModal = ({ supplier, onClose }) => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mutation = useMutation({
        mutationFn: (data) => supplierAPI.paySupplier(supplier._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
            queryClient.invalidateQueries(['purchases']);
            toast.success('Payment recorded successfully');
            onClose();
        },
        onError: (error) => {
            setIsSubmitting(false);
            toast.error(error.response?.data?.message || 'Failed to record payment');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return toast.error('Please enter a valid amount');
        
        setIsSubmitting(true);
        mutation.mutate({
            amount: parseFloat(amount),
            paymentMethod,
            date,
            description
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Record Payment: {supplier.name}</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center mb-4">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Dues</div>
                                <div className="text-xl font-bold text-danger">{formatCurrency(supplier.totalDues || 0)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Vendor Type</div>
                                <div className="text-sm font-medium">{supplier.type}</div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Payment Amount (৳) *</label>
                            <input
                                type="number"
                                className="input text-lg font-bold text-success"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="input-label">Payment Method</label>
                                <select 
                                    className="input select"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="Mobile Banking">Mobile Banking</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Description / Note</label>
                            <textarea
                                className="input"
                                rows="2"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Payment details... (optional)"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending || isSubmitting}>
                            <FiSave /> {mutation.isPending || isSubmitting ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierPaymentModal;
