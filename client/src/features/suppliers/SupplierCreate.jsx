import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierAPI } from '../../services/api';
import { FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SupplierCreate = ({ onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        type: 'Product',
        openingBalance: 0
    });

    const mutation = useMutation({
        mutationFn: (data) => supplierAPI.createSupplier(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
            toast.success('Supplier added successfully');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to add supplier');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            toast.error('Please fill in required fields');
            return;
        }
        mutation.mutate(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Add New Supplier</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label">Supplier Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter supplier name"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Phone Number *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Enter phone number"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Address</label>
                            <textarea
                                className="input"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Enter address"
                                rows="2"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="input-label">Type</label>
                                <select
                                    className="input select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Product">Product</option>
                                    <option value="Packet">Packet</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Opening Balance</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.openingBalance}
                                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                            <FiSave /> {mutation.isPending ? 'Saving...' : 'Save Supplier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierCreate;
