import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { replacementAPI, inventoryAPI, customerAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiRefreshCw, FiPackage, FiCheckCircle, FiX, FiTool, FiDollarSign, FiTrash2, FiEye, FiTruck, FiActivity, FiSearch, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './ReplacementList.css';
import { printHTML } from '../../utils/printHelper';

const ReplacementList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [dealerId, setDealerId] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);

    // Stage Modals
    const [triageItem, setTriageItem] = useState(null); // For Stage 2
    const [factoryItem, setFactoryItem] = useState(null); // For Stage 3 (Receive)
    const [viewItem, setViewItem] = useState(null);

    // Creation Form State (Stage 1)
    const [createForm, setCreateForm] = useState({
        dealer: '',
        items: []
    });
    const [newItem, setNewItem] = useState({
        product: '',
        productName: '',
        claimedQty: 1
    });

    // Triage Form State (Stage 2)
    const [triageData, setTriageData] = useState([]); // [{ product, goodQty, repairableQty, rejectedQty }]

    // Factory Receive Form State (Stage 3)
    const [factoryData, setFactoryData] = useState({
        highCostQty: 0,
        lowCostQty: 0,
        repairNote: ''
    });

    // Fetch replacements
    const { data, isLoading } = useQuery({
        queryKey: ['replacements', currentBrand, status, search, dealerId],
        queryFn: () => replacementAPI.getReplacements({ 
            brand: currentBrand, 
            status, 
            search, 
            dealerId 
        }),
    });

    const { data: dealersData } = useQuery({
        queryKey: ['customers', currentBrand],
        queryFn: () => customerAPI.getCustomers({ brand: currentBrand, limit: 1000 }),
    });

    const { data: productsData } = useQuery({
        queryKey: ['products', currentBrand, 'returnable'],
        queryFn: () => inventoryAPI.getProducts({ brand: currentBrand, type: 'Product', limit: 500 }),
    });

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['replacementStats', currentBrand],
        queryFn: () => replacementAPI.getReplacementStats({ brand: currentBrand }),
        enabled: showStatsModal
    });

    const replacements = data?.data?.replacements || [];
    const dealers = dealersData?.data?.customers || [];
    const products = productsData?.data?.products || [];

    // --- MUTATIONS ---

    // Stage 1: Create
    const createMutation = useMutation({
        mutationFn: (data) => replacementAPI.createReplacement(data),
        onSuccess: () => {
            toast.success('Replacement received successfully');
            queryClient.invalidateQueries(['replacements']);
            setShowCreateModal(false);
            setCreateForm({ dealer: '', items: [] });
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create')
    });

    // Stage 2: Triage (Check)
    const triageMutation = useMutation({
        mutationFn: ({ id, items }) => replacementAPI.submitTriage(id, items),
        onSuccess: () => {
            toast.success('Triage submitted. Stock & Ledger updated.');
            queryClient.invalidateQueries(['replacements']);
            setTriageItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Triage failed')
    });

    // Stage 3a: Send to Factory
    const sendFactoryMutation = useMutation({
        mutationFn: (id) => replacementAPI.sendToFactory(id),
        onSuccess: () => {
            toast.success('Sent to Factory');
            queryClient.invalidateQueries(['replacements']);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to send')
    });

    // Stage 3b: Receive from Factory
    const receiveFactoryMutation = useMutation({
        mutationFn: ({ id, data }) => replacementAPI.receiveFromFactory(id, data),
        onSuccess: () => {
            toast.success('Received from Factory. Stock updated.');
            queryClient.invalidateQueries(['replacements']);
            setFactoryItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to receive')
    });

    // --- HANDLERS ---

    // Create Form Handlers
    const addItem = () => {
        if (!newItem.product) return toast.error('Select a product');
        if (newItem.claimedQty <= 0) return toast.error('Invalid Qty');

        if (createForm.items.some(i => i.product === newItem.product)) {
            return toast.error('Product already added');
        }

        const product = products.find(p => p._id === newItem.product);
        setCreateForm(prev => ({
            ...prev,
            items: [...prev.items, { ...newItem, productName: product?.modelName || 'Unknown' }]
        }));
        setNewItem({ product: '', productName: '', claimedQty: 1 });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (!createForm.dealer) return toast.error('Select Dealer');
        if (createForm.items.length === 0) return toast.error('Add items');

        createMutation.mutate({
            dealer: createForm.dealer,
            brand: currentBrand,
            items: createForm.items
        });
    };

    // Triage Handlers
    const openTriageModal = (item) => {
        setTriageItem(item);
        setTriageData(item.items.map(i => ({
            product: i.product._id,
            productName: i.product.modelName,
            unitPrice: i.product.salesPrice || 0,
            claimedQty: i.claimedQty,
            goodQty: 0,
            repairableQty: 0,
            badQty: 0
        })));
    };

    const handleTriageChange = (index, field, value) => {
        const newData = [...triageData];
        newData[index][field] = parseInt(value) || 0;
        setTriageData(newData);
    };

    const handleTriageSubmit = () => {
        const isValid = triageData.every(i =>
            (i.goodQty + i.repairableQty + i.badQty) === i.claimedQty
        );

        if (!isValid) {
            if (!window.confirm('Some items do not match Claimed Qty. Proceed anyway?')) return;
        }

        triageMutation.mutate({
            id: triageItem._id,
            items: triageData.map(i => ({
                product: i.product,
                goodQty: i.goodQty,
                repairableQty: i.repairableQty,
                badQty: i.badQty
            }))
        });
    };

    // Factory Handlers
    const openFactoryModal = (item) => {
        setFactoryItem(item);
        setFactoryData({ highCostQty: 0, lowCostQty: 0, repairNote: '' });
    };

    const handleFactorySubmit = () => {
        receiveFactoryMutation.mutate({
            id: factoryItem._id,
            data: factoryData
        });
    };

    // --- RENDER HELPERS ---

    const handlePrint = (item) => {
        const dateStr = new Date(item.date).toLocaleDateString('en-GB');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Replacement Receipt - ${item.replacementNo}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Arial', sans-serif; padding: 10mm; color: #000; font-size: 10px; line-height: 1.2; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
                    .brand-name { font-size: 20px; font-weight: 700; text-transform: uppercase; }
                    .invoice-title { font-size: 22px; font-weight: 700; text-align: right; }
                    .info-section { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 15px; }
                    .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #000; margin-bottom: 4px; }
                    .info-val { font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
                    th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; text-align: left; }
                    th { background: #f2f2f2; font-weight: 700; text-transform: uppercase; font-size: 8px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .footer { display: flex; justify-content: space-between; margin-top: 50px; }
                    .signature-box { border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 5px; font-size: 9px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="brand-name">Green Tel Communication</div>
                        <div style="font-size: 9px;">Dealer Replacement Receipt</div>
                    </div>
                    <div>
                        <div class="invoice-title">REPLACEMENT</div>
                        <div class="text-right">No: ${item.replacementNo}<br>Date: ${dateStr}</div>
                    </div>
                </div>

                <div class="info-section">
                    <div>
                        <div class="section-label">Dealer Info</div>
                        <div class="info-val" style="font-size: 12px;">${item.dealer?.companyName || item.dealer?.name}</div>
                        <div>Phone: ${item.dealer?.phone}</div>
                        <div>Address: ${item.dealer?.address || ''}, ${item.dealer?.district || ''}</div>
                    </div>
                    <div>
                        <div class="section-label">Summary</div>
                        <div style="display: flex; justify-content: space-between;"><span>Status:</span> <span class="info-val">${item.status}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Total Claimed:</span> <span class="info-val">${item.totalClaimed}</span></div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 30px">SL</th>
                            <th>Product Name</th>
                            <th style="width: 60px" class="text-center">Claimed</th>
                            ${item.status !== 'Pending' ? `
                                <th style="width: 60px" class="text-center">Good</th>
                                <th style="width: 60px" class="text-center">Repair</th>
                                <th style="width: 60px" class="text-center">Bad</th>
                                <th style="width: 80px" class="text-right">Price</th>
                                <th style="width: 100px" class="text-right">Total</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${item.items.map((it, idx) => `
                            <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td>${it.product?.modelName || it.productName}</td>
                                <td class="text-center">${it.claimedQty}</td>
                                ${item.status !== 'Pending' ? `
                                    <td class="text-center">${it.goodQty || 0}</td>
                                    <td class="text-center">${it.repairableQty || 0}</td>
                                    <td class="text-center">${it.badQty || 0}</td>
                                    <td class="text-right">${formatCurrency(it.unitPrice || 0)}</td>
                                    <td class="text-right">${formatCurrency((it.goodQty + it.repairableQty) * (it.unitPrice || 0))}</td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                    ${item.status !== 'Pending' ? `
                    <tfoot>
                        <tr style="font-weight: bold; background: #eee;">
                            <td colspan="7" class="text-right">Return Total:</td>
                            <td class="text-right">${formatCurrency(item.items.reduce((sum, it) => sum + (it.goodQty + it.repairableQty) * (it.unitPrice || 0), 0))}</td>
                        </tr>
                    </tfoot>
                    ` : ''}
                </table>
                <div class="footer">
                    <div class="signature-box">Dealer Signature</div>
                    <div class="signature-box">Authorized Signature</div>
                </div>
            </body>
            </html>
        `;
        printHTML(html);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'secondary';
            case 'Checked': return 'info';
            case 'Sent to Factory': return 'warning';
            case 'Repaired': return 'success';
            case 'Closed': return 'dark';
            default: return 'secondary';
        }
    };

    return (
        <div className="replacement-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Replacement Management</h1>
                    <p className="page-subtitle">Receive, Triage, Repair, and Stock</p>
                </div>
                <button className="btn btn-secondary mr-2" onClick={() => setShowStatsModal(true)}>
                    <FiActivity /> Factory Info
                </button>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <FiPlus /> Receive Replacement
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gray-100 text-gray-600"><FiRefreshCw size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{replacements.filter(r => r.status === 'Pending').length}</div>
                        <div className="text-sm text-gray-500">Pending Check</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600"><FiActivity size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{replacements.filter(r => r.status === 'Checked').length}</div>
                        <div className="text-sm text-gray-500">To Factory</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100 text-yellow-600"><FiTruck size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{replacements.filter(r => r.status === 'Sent to Factory').length}</div>
                        <div className="text-sm text-gray-500">In Factory</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 text-green-600"><FiCheckCircle size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{replacements.filter(r => r.status === 'Repaired').length}</div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="Search by name, phone, inv..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div>
                        <select className="input w-full" value={dealerId} onChange={e => setDealerId(e.target.value)}>
                            <option value="">All Dealers</option>
                            {dealers.map(d => <option key={d._id} value={d._id}>{d.companyName || d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <select className="input w-full" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending Check</option>
                            <option value="Checked">Checked</option>
                            <option value="Sent to Factory">Sent to Factory</option>
                            <option value="Repaired">Repaired</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date/ID</th>
                                <th>Dealer</th>
                                <th>Stage</th>
                                <th>Items</th>
                                <th>Metrics (C|Good|Rep|Bad)</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" className="text-center p-8">Loading...</td></tr>
                            ) : replacements.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-400">No records found</td></tr>
                            ) : (
                                replacements.map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className="font-medium text-gray-900">{item.replacementNo}</div>
                                            <div className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</div>
                                        </td>
                                        <td>
                                            <div className="font-medium text-gray-900">{item.dealer?.companyName || item.dealer?.name}</div>
                                            {item.dealer?.companyName && <div className="text-xs text-gray-500">{item.dealer?.name}</div>}
                                        </td>
                                        <td>
                                            {item.status === 'Pending' && <span className="text-xs font-bold text-gray-500">Step 1: Receive</span>}
                                            {item.status === 'Checked' && <span className="text-xs font-bold text-blue-500">Step 2: Triage Done</span>}
                                            {item.status === 'Sent to Factory' && <span className="text-xs font-bold text-yellow-600">Step 3: Factory</span>}
                                            {item.status === 'Repaired' && <span className="text-xs font-bold text-green-600">Completed</span>}
                                        </td>
                                        <td>{item.items.length} Products</td>
                                        <td className="font-mono text-xs">
                                            {item.status === 'Pending' ? (
                                                <span className="text-gray-500">{item.totalClaimed} Claimed</span>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <span title="Claimed">C:{item.totalClaimed}</span>
                                                    <span title="Good" className="text-green-600">G:{item.totalGood}</span>
                                                    <span title="Repairable" className="text-yellow-600">R:{item.totalRepairable}</span>
                                                    <span title="Damage" className="text-red-500">D:{item.totalDamage}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {item.status === 'Pending' && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => openTriageModal(item)}
                                                    >
                                                        <FiCheckCircle /> Check
                                                    </button>
                                                )}

                                                {item.status === 'Checked' && item.totalRepairable > 0 && (
                                                    <button
                                                        className="btn btn-sm btn-warning text-white"
                                                        onClick={() => {
                                                            if (window.confirm('Send Repairable items to Factory?'))
                                                                sendFactoryMutation.mutate(item._id)
                                                        }}
                                                    >
                                                        <FiTruck /> To Factory
                                                    </button>
                                                )}

                                                {item.status === 'Sent to Factory' && (
                                                    <button
                                                        className="btn btn-sm btn-success text-white"
                                                        onClick={() => openFactoryModal(item)}
                                                    >
                                                        <FiPackage /> Receive
                                                    </button>
                                                )}

                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setViewItem(item)}
                                                >
                                                    <FiEye />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    style={{ background: '#eee', color: '#000' }}
                                                    onClick={() => handlePrint(item)}
                                                >
                                                    <FiPrinter />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* 1. Receive/Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h3>Receive Replacement</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="modal-body space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Dealer</label>
                                    <select
                                        className="input w-full"
                                        value={createForm.dealer}
                                        onChange={e => setCreateForm({ ...createForm, dealer: e.target.value })}
                                    >
                                        <option value="">Select Dealer</option>
                                        {dealers.map(d => <option key={d._id} value={d._id}>{d.companyName || d.name}</option>)}
                                    </select>
                                </div>

                                <div className="border p-3 rounded-lg bg-gray-50">
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-xs mb-1 block">Product</label>
                                            <select
                                                className="input flex-1"
                                                value={newItem.product}
                                                onChange={e => setNewItem({ ...newItem, product: e.target.value })}
                                            >
                                                <option value="">Select Product...</option>
                                                {products.map(p => (
                                                    <option key={p._id} value={p._id}>{p.modelName} (Price: {formatCurrency(p.salesPrice)})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs mb-1 block">Claim Qty</label>
                                            <input
                                                type="number"
                                                className="input w-full text-sm"
                                                min="1"
                                                value={newItem.claimedQty}
                                                onChange={e => setNewItem({ ...newItem, claimedQty: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <button type="button" className="btn btn-secondary" onClick={addItem}>Add</button>
                                    </div>
                                </div>

                                <div className="max-h-40 overflow-auto">
                                    <table className="table w-full text-sm">
                                        <thead><tr className="bg-gray-100"><th className="p-2">Product</th><th className="p-2">Qty</th></tr></thead>
                                        <tbody>
                                            {createForm.items.map((it, idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="p-2">{it.productName}</td>
                                                    <td className="p-2 font-bold">{it.claimedQty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Triage/Check Modal */}
            {triageItem && (
                <div className="modal-overlay">
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h3>Check Items - {triageItem.replacementNo}</h3>
                            <button className="modal-close" onClick={() => setTriageItem(null)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th style={{ width: '80px' }} className="text-center">Claimed</th>
                                        <th style={{ width: '80px' }} className="text-center">Good</th>
                                        <th style={{ width: '80px' }} className="text-center">Repair</th>
                                        <th style={{ width: '80px' }} className="text-center">Bad</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {triageData.map((row, idx) => (
                                        <tr key={row.product}>
                                            <td className="text-sm">
                                                <div>{row.productName}</div>
                                                <div className="text-xs text-gray-500">Sales: {formatCurrency(row.unitPrice)}</div>
                                            </td>
                                            <td className="font-bold text-center">{row.claimedQty}</td>
                                            <td>
                                                <input
                                                    type="number" className="input w-full p-1 text-center border-green-300"
                                                    value={row.goodQty}
                                                    onChange={e => handleTriageChange(idx, 'goodQty', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number" className="input w-full p-1 text-center border-blue-300"
                                                    value={row.repairableQty}
                                                    onChange={e => handleTriageChange(idx, 'repairableQty', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number" className="input w-full p-1 text-center border-red-300"
                                                    value={row.badQty}
                                                    onChange={e => handleTriageChange(idx, 'badQty', e.target.value)}
                                                />
                                            </td>
                                            <td className="text-right text-gray-600 font-medium">
                                                {formatCurrency(row.unitPrice)}
                                            </td>
                                            <td className="text-right font-bold text-green-700">
                                                {formatCurrency((parseInt(row.goodQty || 0) + parseInt(row.repairableQty || 0)) * row.unitPrice)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 font-bold border-t-2">
                                        <td colSpan="6" className="text-right p-2">Grand Total Return Amount:</td>
                                        <td className="text-right p-2 text-green-800">
                                            {formatCurrency(triageData.reduce((sum, row) => sum + (parseInt(row.goodQty || 0) + parseInt(row.repairableQty || 0)) * row.unitPrice, 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setTriageItem(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleTriageSubmit} disabled={triageMutation.isPending}>
                                Confirm & Update Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Factory Receive Modal */}
            {factoryItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Factory Return - {factoryItem.replacementNo}</h3>
                            <button className="modal-close" onClick={() => setFactoryItem(null)}><FiX /></button>
                        </div>
                        <div className="modal-body space-y-4">
                            <div className="p-3 bg-yellow-50 rounded border text-sm">
                                <strong>Sent for Repair:</strong> {factoryItem.totalRepairable} items
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">High Cost (Major)</label>
                                    <input
                                        type="number" className="input w-full"
                                        value={factoryData.highCostQty}
                                        onChange={e => setFactoryData({ ...factoryData, highCostQty: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Low Cost (Minor)</label>
                                    <input
                                        type="number" className="input w-full"
                                        value={factoryData.lowCostQty}
                                        onChange={e => setFactoryData({ ...factoryData, lowCostQty: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Factory Note</label>
                                <textarea
                                    className="input w-full h-20"
                                    value={factoryData.repairNote}
                                    onChange={e => setFactoryData({ ...factoryData, repairNote: e.target.value })}
                                    placeholder="Enter details..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setFactoryItem(null)}>Cancel</button>
                            <button className="btn btn-success text-white" onClick={handleFactorySubmit} disabled={receiveFactoryMutation.isPending}>
                                Receive & Add to Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewItem && (
                <div className="modal-overlay">
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h3>Details - {viewItem.replacementNo}</h3>
                            <button className="modal-close" onClick={() => setViewItem(null)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <table className="table w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th>#</th>
                                        <th>Product</th>
                                        <th className="text-center">Claimed</th>
                                        <th className="text-center">Good</th>
                                        <th className="text-center">Repair</th>
                                        <th className="text-center">Bad</th>
                                        <th className="text-right">Unit Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewItem.items.map((it, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-2">{idx + 1}</td>
                                            <td className="p-2 font-medium">{it.product?.modelName || it.productName}</td>
                                            <td className="p-2 text-center">{it.claimedQty}</td>
                                            <td className="p-2 text-center text-success font-bold">{it.goodQty || 0}</td>
                                            <td className="p-2 text-center text-info">{it.repairableQty || 0}</td>
                                            <td className="p-2 text-center text-danger">{it.badQty || 0}</td>
                                            <td className="p-2 text-right text-gray-600">{formatCurrency(it.unitPrice)}</td>
                                            <td className="p-2 text-right font-bold text-green-700">
                                                {formatCurrency((it.goodQty + it.repairableQty) * (it.unitPrice || 0))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr className="font-bold">
                                        <td colSpan="7" className="p-2 text-right">Grand Total Return Amount:</td>
                                        <td className="p-2 text-right text-green-800">
                                            {formatCurrency(viewItem.items.reduce((sum, it) => sum + (it.goodQty + it.repairableQty) * (it.unitPrice || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            {viewItem.repairDetails && (
                                <div className="mt-4 p-3 bg-gray-50 text-sm">
                                    <h4 className="font-bold mb-2">Factory Report</h4>
                                    <div className="flex gap-4">
                                        <div>High Cost: {viewItem.repairDetails.highCostQty}</div>
                                        <div>Low Cost: {viewItem.repairDetails.lowCostQty}</div>
                                    </div>
                                    {viewItem.repairDetails.repairNote && <div className="mt-2 italic">"{viewItem.repairDetails.repairNote}"</div>}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setViewItem(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Factory Stats Modal */}
            {showStatsModal && (
                <div className="modal-overlay">
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h3>Factory & Repair Statistics</h3>
                            <button className="modal-close" onClick={() => setShowStatsModal(false)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            {statsLoading ? (
                                <div className="text-center p-8">Loading stats...</div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="text-sm text-yellow-800 font-bold uppercase tracking-wider mb-1">In Factory (Assets)</div>
                                            <div className="flex justify-between items-end">
                                                <div className="text-3xl font-bold text-yellow-900">{statsData?.data?.inFactory?.totalQty || 0} <span className="text-sm font-normal text-gray-500">units</span></div>
                                                <div className="text-xl font-bold text-yellow-700">{formatCurrency(statsData?.data?.inFactory?.totalValue || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="text-sm text-blue-800 font-bold uppercase tracking-wider mb-1">Pending Shipment</div>
                                            <div className="flex justify-between items-end">
                                                <div className="text-3xl font-bold text-blue-900">{statsData?.data?.pending?.totalQty || 0} <span className="text-sm font-normal text-gray-500">units</span></div>
                                                <div className="text-xl font-bold text-blue-700">{formatCurrency(statsData?.data?.pending?.totalValue || 0)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Tables */}
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Products Currently in Factory</h4>
                                        <div className="max-h-60 overflow-y-auto">
                                            <table className="table w-full text-sm">
                                                <thead className="sticky top-0 bg-white">
                                                    <tr className="bg-gray-100 text-left">
                                                        <th className="p-2">Product Name</th>
                                                        <th className="p-2 text-center">Qty</th>
                                                        <th className="p-2 text-right">Unit Cost</th>
                                                        <th className="p-2 text-right">Total Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statsData?.data?.inFactory?.items?.length > 0 ? (
                                                        statsData.data.inFactory.items.map((item) => (
                                                            <tr key={item._id} className="border-b hover:bg-gray-50">
                                                                <td className="p-2">{item.productName}</td>
                                                                <td className="p-2 text-center font-bold">{item.qty}</td>
                                                                <td className="p-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                                                                <td className="p-2 text-right font-medium">{formatCurrency(item.totalValue)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr><td colSpan="4" className="text-center p-4 text-gray-400">No items in factory</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Products Pending Shipment (Checked)</h4>
                                        <div className="max-h-60 overflow-y-auto">
                                            <table className="table w-full text-sm">
                                                <thead className="sticky top-0 bg-white">
                                                    <tr className="bg-gray-100 text-left">
                                                        <th className="p-2">Product Name</th>
                                                        <th className="p-2 text-center">Qty</th>
                                                        <th className="p-2 text-right">Unit Cost</th>
                                                        <th className="p-2 text-right">Total Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statsData?.data?.pending?.items?.length > 0 ? (
                                                        statsData.data.pending.items.map((item) => (
                                                            <tr key={item._id} className="border-b hover:bg-gray-50">
                                                                <td className="p-2">{item.productName}</td>
                                                                <td className="p-2 text-center font-bold">{item.qty}</td>
                                                                <td className="p-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                                                                <td className="p-2 text-right font-medium">{formatCurrency(item.totalValue)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr><td colSpan="4" className="text-center p-4 text-gray-400">No items pending shipment</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowStatsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReplacementList;
