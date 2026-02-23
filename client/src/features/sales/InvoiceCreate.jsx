import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../../App';
import { getBrandLogo, BrandingConfig, formatCurrency } from '../../config/brandingConfig';
import { customerAPI, inventoryAPI, salesAPI } from '../../services/api';
import { FiPlus, FiTrash2, FiSave, FiAlertCircle } from 'react-icons/fi';
import SearchableSelect from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import './InvoiceCreate.css';

const InvoiceCreate = () => {
    const { currentBrand } = useBrand();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [priceType, setPriceType] = useState('Retail');
    const [items, setItems] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [rebate, setRebate] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [previousDues, setPreviousDues] = useState(0);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // POS Search State
    const [productSearchKey, setProductSearchKey] = useState(0); // To reset search input

    // Update dues when customer selected
    useEffect(() => {
        if (selectedCustomer) {
            setPreviousDues(selectedCustomer.totalDues || 0);
            setPriceType(selectedCustomer.type === 'Dealer' ? 'Dealer' : 'Retail');
        } else {
            setPreviousDues(0);
            setPriceType('Retail');
        }
    }, [selectedCustomer]);

    // Recalculate item prices when price type changes
    useEffect(() => {
        if (items.length > 0) {
            setItems(prevItems => prevItems.map(item => ({
                ...item,
                price: item.product ? (priceType === 'Dealer' && item.product.dealerPrice > 0 ? item.product.dealerPrice : item.product.salesPrice) : 0
            })));
        }
    }, [priceType]);

    // Calculations
    const subTotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const discountAmount = Math.round(subTotal * discountPercent / 100);
    const grandTotal = subTotal - discountAmount - rebate;
    const totalDues = grandTotal - paidAmount + previousDues;
    const returnAmount = paidAmount - grandTotal;

    // Load Customers
    const loadCustomers = async (query) => {
        const response = await customerAPI.getCustomers({
            brand: currentBrand,
            search: query,
            limit: 20
        });
        return response.data.customers.map(c => ({
            ...c,
            label: c.companyName || c.name,
            subLabel: `${c.companyName ? c.name + ' • ' : ''}${c.phone} • ${c.type}`
        }));
    };

    // Load Products
    const loadProducts = async (query) => {
        const response = await inventoryAPI.getProducts({
            brand: currentBrand,
            search: query,
            stockStatus: 'in-stock', // Only show in-stock items
            limit: 20
        });
        return response.data.products.map(p => ({
            ...p,
            label: p.modelName,
            subLabel: `Stock: ${p.stock.goodQty} • ${formatCurrency(p.salesPrice)}`
        }));
    };

    const handleProductSelect = (product) => {
        if (!product) return;

        setItems(prevItems => {
            const existingItem = prevItems.find(item => item.product._id === product._id);

            if (existingItem) {
                // Increment Qty if stock allows
                const newQty = existingItem.qty + 1;
                if (newQty > product.stock.goodQty) {
                    toast.error(`Stock limit reached for ${product.modelName}`);
                    return prevItems;
                }
                return prevItems.map(item =>
                    item.product._id === product._id
                        ? { ...item, qty: newQty }
                        : item
                );
            } else {
                // Add new item
                const price = priceType === 'Dealer' && product.dealerPrice > 0
                    ? product.dealerPrice
                    : product.salesPrice;

                return [
                    {
                        id: Date.now(),
                        product: product,
                        type: 'Product', // Default type
                        qty: 1,
                        price: price,
                        isCombined: false
                    },
                    ...prevItems // Add to top for visibility
                ];
            }
        });

        // Reset search input to allow rapid entry
        setProductSearchKey(prev => prev + 1);
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;

            if (field === 'qty') {
                const qty = parseInt(value) || 0;
                if (qty > item.product.stock.goodQty) {
                    toast.error(`Stock limit reached! Max: ${item.product.stock.goodQty}`);
                    return { ...item, qty: item.product.stock.goodQty };
                }
                return { ...item, qty };
            }
            return { ...item, [field]: value };
        }));
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!selectedCustomer) return toast.error('Please select a customer');
        if (items.length === 0) return toast.error('Cart is empty');

        const validItems = items.filter(i => i.qty > 0);

        setIsSubmitting(true);
        try {
            const invoiceData = {
                customer: selectedCustomer._id,
                brand: currentBrand,
                date: date,
                priceType,
                paymentMethod,
                items: validItems.map(i => ({
                    productId: i.product._id,
                    productName: i.product.modelName,
                    qty: i.qty,
                    price: i.price,
                    type: i.type,
                    isCombined: i.isCombined
                })),
                discount: discountAmount,
                discountPercent,
                rebate,
                paidAmount,
                note
            };

            await salesAPI.createInvoice(invoiceData);

            toast.success('Invoice created successfully!');
            queryClient.invalidateQueries(['invoices']);
            queryClient.invalidateQueries(['products']);
            queryClient.invalidateQueries(['customers']);
            navigate('/sales');
        } catch (error) {
            console.error('Failed to create invoice:', error);
            toast.error(error.response?.data?.message || 'Failed to create invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="invoice-create">
            <div className="invoice-header">
                <div>
                    <h1 className="page-title">POS Invoice</h1>
                    <p className="page-subtitle">{currentBrand}</p>
                </div>
                {/* Save button moved to sidebar bottom */}
            </div>

            <div className="invoice-grid">
                {/* Left - Work Area */}
                <div className="invoice-form">

                    {/* Top Section: Customer & Date */}
                    <div className="card mb-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <SearchableSelect
                                    label="Customer (Search by Name/Phone)"
                                    placeholder="Select Customer..."
                                    loadOptions={loadCustomers}
                                    value={selectedCustomer}
                                    onChange={setSelectedCustomer}
                                    labelKey="label"
                                    defaultOptions={true}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* POS Section */}
                    <div className="card">
                        <div className="card-header items-center justify-between">
                            <h3 className="card-title">Cart</h3>
                            <span className={`badge ${priceType === 'Dealer' ? 'badge-info' : 'badge-greenstar'}`}>
                                {priceType} Price
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <SearchableSelect
                                key={productSearchKey} // Force reset on add
                                placeholder="Scan or Search Product to Add..."
                                loadOptions={loadProducts}
                                onChange={handleProductSelect}
                                labelKey="label"
                                defaultOptions={false}
                                className="pos-search-bar"
                            />
                        </div>

                        <div className="items-list">
                            <div className="items-header">
                                <span style={{ flex: 3 }}>Item Name</span>
                                <span style={{ flex: 1 }}>Stock</span>
                                <span style={{ flex: 1 }}>Qty</span>
                                <span style={{ flex: 1.5 }}>Price</span>
                                <span style={{ flex: 1.5 }}>Total</span>
                                <span style={{ width: '40px' }}></span>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center p-8 text-gray-400">
                                    <FiAlertCircle className="inline-block mb-2 text-2xl" />
                                    <p>Cart is empty. Search products above.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="item-row">
                                        <div style={{ flex: 3 }}>
                                            <div className="font-medium text-gray-800">{item.product.modelName}</div>
                                            <div className="text-xs text-gray-500">{item.product.description}</div>
                                        </div>

                                        <div style={{ flex: 1 }} className="flex items-center text-sm text-gray-500">
                                            {item.product.stock.goodQty}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="number"
                                                className="input text-center"
                                                value={item.qty}
                                                onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                min="1"
                                            />
                                        </div>

                                        <div style={{ flex: 1.5 }}>
                                            <input
                                                type="number"
                                                className="input text-right"
                                                value={item.price}
                                                onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>

                                        <span className="item-total" style={{ flex: 1.5 }}>
                                            {formatCurrency(item.qty * item.price)}
                                        </span>

                                        <button
                                            className="btn btn-icon btn-danger"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card mt-4">
                        <div className="input-group mb-0">
                            <label className="input-label">Note / Reference</label>
                            <textarea
                                className="input"
                                rows="2"
                                placeholder="Add optional note..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right - Summary */}
                <div className="invoice-summary">
                    <div className="card summary-card sticky top-4 h-[calc(100vh-100px)] flex flex-col">
                        {/* Header Stats */}
                        <div className="text-center mb-6 pt-2">
                            <div className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{formatCurrency(grandTotal)}</div>
                            <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">Grand Total</div>
                        </div>

                        {/* Middle - Scrollable Content */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Items</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{items.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Qty</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{items.reduce((acc, i) => acc + (i.qty || 0), 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-gray-800 dark:text-gray-200 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                                    <span>Sub Total</span>
                                    <span>{formatCurrency(subTotal)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Discount (%)</label>
                                    <input
                                        type="number"
                                        className="input text-sm p-2"
                                        value={discountPercent}
                                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="0"
                                        max="100"
                                    />
                                    {discountPercent > 0 && (
                                        <div className="text-xs text-gray-400 mt-1">= {formatCurrency(discountAmount)}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Rebate</label>
                                    <input
                                        type="number"
                                        className="input text-sm p-2"
                                        value={rebate}
                                        onChange={(e) => setRebate(parseFloat(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Method</label>
                                <select
                                    className="input select text-sm p-2 w-full"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="Mobile Banking">Mobile Banking</option>
                                    <option value="Due">Full Due</option>
                                </select>
                            </div>

                            <div className="mb-2">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Paid Amount</label>
                                <input
                                    type="number"
                                    className="input text-lg font-bold text-green-600 p-3"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>

                            {/* Change / Due Status */}
                            {returnAmount > 0 ? (
                                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 mb-4">
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Change Return</span>
                                    <span className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(returnAmount)}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 mb-4">
                                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Current Due</span>
                                    <span className="text-lg font-bold text-red-700 dark:text-red-400">{formatCurrency(totalDues - previousDues)}</span>
                                </div>
                            )}

                            {/* Dues Summary */}
                            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Previous Dues</span>
                                    <span>{formatCurrency(previousDues)}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-gray-800 dark:text-gray-100">
                                    <span>Net Payable</span>
                                    <span>{formatCurrency(totalDues)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom - Action Button */}
                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                className="w-full btn btn-primary py-3 text-lg font-bold shadow-lg shadow-green-100 dark:shadow-none hover:shadow-green-200 transition-all transform hover:-translate-y-0.5"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : (
                                    <span className="flex items-center justify-center gap-2">
                                        <FiSave className="text-xl" />
                                        Save Invoice
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceCreate;
