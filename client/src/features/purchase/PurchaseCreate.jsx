import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseAPI, supplierAPI, inventoryAPI } from '../../services/api';
import { useBrand } from '../../App';
import { formatCurrency } from '../../config/brandingConfig';
import { FiX, FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import SearchableSelect from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';

const PurchaseCreate = ({ onClose }) => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState([]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const subTotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const grandTotal = subTotal;
    const dues = grandTotal - paidAmount;

    const loadSuppliers = async (query) => {
        const response = await supplierAPI.getSuppliers({ search: query, limit: 20 });
        return response.data.suppliers.map(s => ({
            ...s,
            label: s.name,
            subLabel: `${s.phone} • ${s.type}`
        }));
    };

    const loadProducts = async (query) => {
        const response = await inventoryAPI.getProducts({ brand: currentBrand, search: query, limit: 20 });
        return response.data.products.map(p => ({
            ...p,
            label: p.modelName,
            subLabel: `[${p.type}] Stock: ${p.stock.goodQty} • Buy: ${formatCurrency(p.purchasePrice)}`,
            className: p.type === 'Packet' ? 'packet-option' : ''
        }));
    };

    const handleProductSelect = (product) => {
        if (!product) return;
        const existingItem = items.find(item => item.productId === product._id);
        if (existingItem) {
            setItems(items.map(item =>
                item.productId === product._id ? { ...item, qty: item.qty + 1 } : item
            ));
        } else {
            setItems([...items, {
                productId: product._id,
                productName: product.modelName,
                qty: 1,
                price: product.purchasePrice || 0,
                type: product.type
            }]);
        }
    };

    const updateItem = (productId, field, value) => {
        setItems(items.map(item =>
            item.productId === productId ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (productId) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    const mutation = useMutation({
        mutationFn: (data) => purchaseAPI.createPurchase(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['purchases']);
            queryClient.invalidateQueries(['products']);
            toast.success('Purchase recorded successfully');
            onClose();
        },
        onError: (error) => {
            setIsSubmitting(false);
            toast.error(error.response?.data?.message || 'Failed to record purchase');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedSupplier) return toast.error('Please select a supplier');
        if (items.length === 0) return toast.error('Please add at least one item');

        setIsSubmitting(true);
        mutation.mutate({
            supplier: selectedSupplier._id,
            brand: currentBrand,
            date,
            items,
            totalAmount: grandTotal,
            paidAmount: parseFloat(paidAmount) || 0,
            note
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">New Purchase</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <SearchableSelect
                                label="Supplier *"
                                placeholder="Search supplier..."
                                loadOptions={loadSuppliers}
                                onChange={setSelectedSupplier}
                                labelKey="label"
                            />
                            <div className="input-group">
                                <label className="input-label">Date *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group mb-4">
                            <label className="input-label">Add Product</label>
                            <SearchableSelect
                                placeholder="Search product by model name..."
                                loadOptions={loadProducts}
                                onChange={handleProductSelect}
                                labelKey="label"
                                resetOnSelect={true}
                            />
                        </div>

                        <div className="table-container mb-4" style={{ maxHeight: '300px' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th style={{ width: '100px' }}>Qty</th>
                                        <th style={{ width: '150px' }}>Buy Price</th>
                                        <th style={{ width: '150px' }}>Total</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.productId}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {item.productName}
                                                    {item.type === 'Packet' && (
                                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200">Packet</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input p-1 text-center"
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(item.productId, 'qty', parseInt(e.target.value) || 0)}
                                                    min="1"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input p-1 text-right"
                                                    value={item.price}
                                                    onChange={(e) => updateItem(item.productId, 'price', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="text-right">{formatCurrency(item.qty * item.price)}</td>
                                            <td>
                                                <button type="button" className="text-danger" onClick={() => removeItem(item.productId)}>
                                                    <FiTrash2 />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center p-4 text-muted">No products added</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="input-group">
                                <label className="input-label">Note</label>
                                <textarea
                                    className="input"
                                    rows="3"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Purchase details..."
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between font-medium">
                                    <span>Sub Total:</span>
                                    <span>{formatCurrency(subTotal)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Grand Total:</span>
                                    <span>{formatCurrency(grandTotal)}</span>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Paid Amount</label>
                                    <input
                                        type="number"
                                        className="input text-right font-bold text-success"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-between font-bold text-danger">
                                    <span>Due Amount:</span>
                                    <span>{formatCurrency(dues)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending || isSubmitting}>
                            <FiSave /> {mutation.isPending || isSubmitting ? 'Processing...' : 'Save Purchase'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseCreate;
