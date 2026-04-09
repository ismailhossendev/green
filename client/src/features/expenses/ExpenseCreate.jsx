import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseAPI } from '../../services/api';
import { BrandingConfig } from '../../config/brandingConfig';
import { FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ExpenseCreate = ({ onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: BrandingConfig.expenseCategories[0],
        description: '',
        amount: '',
        reference: ''
    });

    const mutation = useMutation({
        mutationFn: (data) => expenseAPI.createExpense(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['expenses']);
            toast.success('Expense added successfully');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to add expense');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.description) {
            toast.error('Please fill in required fields');
            return;
        }
        mutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount) || 0
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Add New Expense</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="input-label">Date *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Category *</label>
                                <select
                                    className="input select"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    {BrandingConfig.expenseCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Amount *</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="Enter amount"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Description *</label>
                            <textarea
                                className="input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter what this expense is for"
                                rows="3"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Reference (Optional)</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="E.g. Invoice #, Bill #"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                            <FiSave /> {mutation.isPending ? 'Saving...' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseCreate;
