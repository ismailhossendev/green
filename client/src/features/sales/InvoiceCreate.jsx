import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../../App';
import { getBrandLogo, BrandingConfig, formatCurrency } from '../../config/brandingConfig';
import { customerAPI, inventoryAPI, salesAPI } from '../../services/api';
import { FiPlus, FiTrash2, FiSave, FiAlertCircle } from 'react-icons/fi';
import SearchableSelect from '../../components/ui/SearchableSelect';
import StockEditModal from '../inventory/StockEditModal';
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
    const [productSearchKey, setProductSearchKey] = useState(0);
    const [stockEditProduct, setStockEditProduct] = useState(null);

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
            subLabel: `${c.companyName ? '(' + c.name + ') • ' : ''}${c.phone} • ${c.type}`
        }));
    };

    // Load Products
    const loadProducts = async (query) => {
        const response = await inventoryAPI.getProducts({
            brand: currentBrand,
            search: query,
            type: 'Product',
            stockStatus: 'in-stock',
            limit: 20
        });
        return response.data.products.map(p => ({
            ...p,
            label: p.modelName,
            subLabel: `[${p.type}] Stock: ${p.stock.goodQty} • ${formatCurrency(p.salesPrice)}`,
            className: p.type === 'Packet' ? 'packet-option' : ''
        }));
    };

    const handleProductSelect = (product) => {
        if (!product) return;

        setItems(prevItems => {
            const existingItem = prevItems.find(item => item.product._id === product._id);

            if (existingItem) {
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
                const price = priceType === 'Dealer' && product.dealerPrice > 0
                    ? product.dealerPrice
                    : product.salesPrice;

                return [
                    ...prevItems,
                    {
                        id: Date.now(),
                        product: product,
                        type: product.type,
                        qty: 1,
                        price: price,
                        isCombined: false
                    }
                ];
            }
        });

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
            </div>

            <div className="invoice-grid">
                {/* Left - Work Area */}
                <div className="invoice-form">

                    {/* Customer & Date */}
                    <div className="card">
                        <div className="customer-section">
                            <div>
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
                            <div className="input-group" style={{ marginBottom: 0 }}>
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

                    {/* Cart / POS */}
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>🛒 Cart</h3>
                            <span className={`badge ${priceType === 'Dealer' ? 'badge-info' : 'badge-greenstar'}`}>
                                {priceType} Price
                            </span>
                        </div>

                        {/* Product Search */}
                        <div className="pos-search-area" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <SearchableSelect
                                    key={productSearchKey}
                                    placeholder="🔍 Scan or Search Product..."
                                    loadOptions={loadProducts}
                                    onChange={handleProductSelect}
                                    labelKey="label"
                                    defaultOptions={false}
                                    className="pos-search-bar"
                                />
                            </div>
                            <button 
                                className="btn btn-secondary" 
                                style={{ height: '42px', padding: '0 12px' }}
                                title="Quick Stock Edit"
                                onClick={() => {
                                    // If items in cart, allow editing the last one or show search
                                    if (items.length > 0) {
                                        setStockEditProduct(items[items.length - 1].product);
                                    } else {
                                        toast.info('Search and select a product first to edit stock');
                                    }
                                }}
                            >
                                📦
                            </button>
                        </div>

                        {/* Item List */}
                        <div style={{ padding: '0.75rem' }}>
                            {/* Desktop table header */}
                            <div className="items-header">
                                <span style={{ flex: 3 }}>Item Name</span>
                                <span style={{ flex: 1 }}>Stock</span>
                                <span style={{ flex: 1 }}>Qty</span>
                                <span style={{ flex: 1.5 }}>Price</span>
                                <span style={{ flex: 1.5 }}>Total</span>
                                <span style={{ width: '36px' }}></span>
                            </div>

                            <div className="items-list">
                                {items.length === 0 ? (
                                    <div className="empty-cart">
                                        <FiAlertCircle />
                                        <p>Cart is empty. Search products above.</p>
                                    </div>
                                ) : (
                                    items.map((item) => (
                                        <div key={item.id} className="item-row">
                                            {/* Left: Name + price formula */}
                                            <div className="item-info">
                                                <div className="item-name">
                                                    {item.product.modelName}
                                                    {item.type === 'Packet' && (
                                                        <span className="packet-badge" style={{ marginLeft: '0.4rem' }}>Packet</span>
                                                    )}
                                                </div>
                                                <div className="item-formula">
                                                    {item.qty} × {formatCurrency(item.price)} = {formatCurrency(item.qty * item.price)}
                                                </div>
                                                {/* Price editable inline on tap */}
                                                <div className="item-price-edit">
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Price: </span>
                                                    <input
                                                        type="number"
                                                        className="item-price-input"
                                                        value={item.price}
                                                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                        onFocus={(e) => e.target.select()}
                                                    />
                                                </div>
                                            </div>

                                            {/* Right: - qty + delete */}
                                            <div className="item-qty-controls">
                                                <button
                                                    className="qty-btn"
                                                    onClick={() => updateItem(item.id, 'qty', item.qty - 1 <= 0 ? 1 : item.qty - 1)}
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    className="qty-input"
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    min="1"
                                                />
                                                <button
                                                    className="qty-btn"
                                                    onClick={() => updateItem(item.id, 'qty', item.qty + 1)}
                                                >
                                                    +
                                                </button>
                                                <button
                                                    className="item-remove-btn"
                                                    onClick={() => removeItem(item.id)}
                                                    title="Remove"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="card">
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

                {/* Right / Bottom - Summary */}
                <div className="invoice-summary">
                    <div className="card summary-card">
                        {/* Grand Total */}
                        <div className="summary-total-display">
                            <div className="summary-total-amount">{formatCurrency(grandTotal)}</div>
                            <div className="summary-total-label">Grand Total</div>
                        </div>

                        <div className="summary-divider"></div>

                        {/* Quick Stats */}
                        <div className="summary-stats">
                            <span>Total Items</span>
                            <span>{items.length}</span>
                        </div>
                        <div className="summary-stats">
                            <span>Total Qty</span>
                            <span>{items.reduce((acc, i) => acc + (i.qty || 0), 0)}</span>
                        </div>
                        <div className="summary-stats" style={{ fontWeight: 600 }}>
                            <span>Sub Total</span>
                            <span>{formatCurrency(subTotal)}</span>
                        </div>

                        <div className="summary-divider"></div>

                        {/* Discount & Rebate */}
                        <div className="summary-inputs-grid">
                            <div className="summary-input-group">
                                <label>Discount (%)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="0"
                                    max="100"
                                />
                                {discountPercent > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                        = {formatCurrency(discountAmount)}
                                    </div>
                                )}
                            </div>
                            <div className="summary-input-group">
                                <label>Rebate (৳)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={rebate}
                                    onChange={(e) => setRebate(parseFloat(e.target.value) || 0)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="summary-input-group">
                            <label>Payment Method</label>
                            <select
                                className="input select"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="Cash">Cash</option>
                                <option value="Bank">Bank Transfer</option>
                                <option value="Mobile Banking">Mobile Banking</option>
                                <option value="Due">Full Due</option>
                            </select>
                        </div>

                        {/* Paid Amount */}
                        <div className="summary-input-group">
                            <label>Paid Amount (৳)</label>
                            <input
                                type="number"
                                className="input summary-paid-input"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>

                        {/* Change / Due */}
                        {returnAmount > 0 ? (
                            <div className="status-box change">
                                <span className="label">🔄 Change Return</span>
                                <span className="amount">{formatCurrency(returnAmount)}</span>
                            </div>
                        ) : (
                            <div className="status-box due">
                                <span className="label">⚠️ Current Due</span>
                                <span className="amount">{formatCurrency(totalDues - previousDues)}</span>
                            </div>
                        )}

                        {/* Previous & Net Payable */}
                        <div className="prev-dues-row">
                            <span>Previous Dues</span>
                            <span>{formatCurrency(previousDues)}</span>
                        </div>
                        <div className="net-payable-row">
                            <span className="label">Net Payable</span>
                            <span className="amount">{formatCurrency(totalDues)}</span>
                        </div>

                        <div className="summary-divider"></div>

                        {/* Save Button */}
                        <button
                            className="save-invoice-btn"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : (
                                <>
                                    <FiSave /> Save Invoice
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {stockEditProduct && (
                <StockEditModal 
                    product={stockEditProduct} 
                    onClose={() => setStockEditProduct(null)} 
                />
            )}
        </div>
    );
};

export default InvoiceCreate;
