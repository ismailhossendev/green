import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeAPI } from '../../services/api';
import { FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AssetCreate = ({ onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        type: 'Fixed Asset',
        description: '',
        amount: '',
        currentValue: '',
        date: new Date().toISOString().split('T')[0]
    });

    const mutation = useMutation({
        mutationFn: (data) => financeAPI.createInvestment(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['asset-report']);
            toast.success('Asset recorded successfully');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to record asset');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) {
            toast.error('Please fill in required fields');
            return;
        }
        mutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            currentValue: parseFloat(formData.currentValue || formData.amount) || 0
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Record Asset / Investment</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="input-label">Asset Type *</label>
                                <select
                                    className="input select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    required
                                >
                                    <option value="Fixed Asset">Fixed Asset</option>
                                    <option value="Cash">Cash / Security</option>
                                    <option value="Other">Other Investment</option>
                                </select>
                            </div>
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
                        </div>
                        <div className="input-group">
                            <label className="input-label">Description / Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="E.g. Delivery Van, Shop Renovation"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="input-label">Initial Amount / Cost *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Current Fair Value</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.currentValue}
                                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                                    placeholder="Leave blank if same as cost"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted italic mt-2">
                            * Current value can be updated later to track appreciation or depreciation.
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                            <FiSave /> {mutation.isPending ? 'Processing...' : 'Save Asset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssetCreate;
