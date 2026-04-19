import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI } from '../../services/api';
import { FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const StockEditModal = ({ product, onClose }) => {
    const queryClient = useQueryClient();
    const [stock, setStock] = useState({
        goodQty: product.stock.goodQty || 0,
        badQty: product.stock.badQty || 0,
        damageQty: product.stock.damageQty || 0,
        repairQty: product.stock.repairQty || 0
    });

    const mutation = useMutation({
        mutationFn: (data) => inventoryAPI.updateStock(product._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            toast.success('Stock updated successfully');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update stock');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(stock);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Edit Stock: {product.modelName}</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div className="input-group">
                            <label className="input-label">Good Stock Qty</label>
                            <input
                                type="number"
                                className="input font-bold text-success"
                                value={stock.goodQty}
                                onChange={(e) => setStock({ ...stock, goodQty: parseInt(e.target.value) || 0 })}
                                min="0"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="input-group">
                                <label className="input-label">Bad</label>
                                <input
                                    type="number"
                                    className="input p-1 text-center"
                                    value={stock.badQty}
                                    onChange={(e) => setStock({ ...stock, badQty: parseInt(e.target.value) || 0 })}
                                    min="0"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Damage</label>
                                <input
                                    type="number"
                                    className="input p-1 text-center"
                                    value={stock.damageQty}
                                    onChange={(e) => setStock({ ...stock, damageQty: parseInt(e.target.value) || 0 })}
                                    min="0"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Repair</label>
                                <input
                                    type="number"
                                    className="input p-1 text-center"
                                    value={stock.repairQty}
                                    onChange={(e) => setStock({ ...stock, repairQty: parseInt(e.target.value) || 0 })}
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                            <FiSave /> {mutation.isPending ? 'Updating...' : 'Update Stock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockEditModal;
