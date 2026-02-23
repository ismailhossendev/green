import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { replacementAPI, inventoryAPI, customerAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiRefreshCw, FiPackage, FiCheckCircle, FiX, FiTool, FiDollarSign, FiTrash2, FiEye, FiTruck, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './ReplacementList.css';

const ReplacementList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState('');
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
        queryKey: ['replacements', currentBrand, status],
        queryFn: () => replacementAPI.getReplacements({ brand: currentBrand, status }),
    });

    const { data: dealersData } = useQuery({
        queryKey: ['dealers', currentBrand],
        queryFn: () => customerAPI.getCustomers({ brand: currentBrand, type: 'Dealer' }),
    });

    const { data: productsData } = useQuery({
        queryKey: ['products', currentBrand],
        queryFn: () => inventoryAPI.getProducts({ brand: currentBrand }),
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
            items: [...prev.items, { ...newItem, productName: product.modelName }]
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
        // Initialize state with defaults from DB
        setTriageData(item.items.map(i => ({
            product: i.product._id,
            productName: i.product.modelName, // Display name
            claimedQty: i.claimedQty,
            goodQty: 0,
            repairableQty: 0,
            damageQty: 0
        })));
    };

    const handleTriageChange = (index, field, value) => {
        const newData = [...triageData];
        newData[index][field] = parseInt(value) || 0;
        setTriageData(newData);
    };

    const handleTriageSubmit = () => {
        // Validation: Sum check?
        const isValid = triageData.every(i =>
            (i.goodQty + i.repairableQty + i.damageQty) === i.claimedQty
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
                damageQty: i.damageQty
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'secondary';
            case 'Checked': return 'info';
            case 'Sent to Factory': return 'warning';
            case 'Repaired': return 'success'; // Repaired & Stocked
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
                                        <td>{item.dealer?.name}</td>
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
                                                {/* Action Buttons based on Status */}

                                                {/* Level 1: Check/Triage */}
                                                {item.status === 'Pending' && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => openTriageModal(item)}
                                                    >
                                                        <FiCheckCircle /> Check
                                                    </button>
                                                )}

                                                {/* Level 2: Send to Factory */}
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

                                                {/* Level 3: Receive from Factory */}
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
                                        {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="border p-3 rounded-lg bg-gray-50">
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-xs mb-1 block">Product</label>
                                            <select
                                                className="input w-full text-sm"
                                                value={newItem.product}
                                                onChange={e => setNewItem({ ...newItem, product: e.target.value })}
                                            >
                                                <option value="">Select Product...</option>
                                                {products.map(p => <option key={p._id} value={p._id}>{p.modelName}</option>)}
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
                            <div className="alert alert-info mb-4 text-sm">
                                <strong>Note:</strong> Accepted items (Good + Repairable) will be credited to the dealer's ledger immediately.
                            </div>
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th className="w-20">Claimed</th>
                                        <th className="w-24 text-green-700">Good</th>
                                        <th className="w-24 text-yellow-700">Repair</th>
                                        <th className="w-24 text-red-700">Damage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {triageData.map((row, idx) => (
                                        <tr key={row.product}>
                                            <td className="text-sm">{row.productName}</td>
                                            <td className="font-bold">{row.claimedQty}</td>
                                            <td>
                                                <input
                                                    type="number" className="input w-full p-1 text-center border-green-300"
                                                    value={row.goodQty}
                                                    onChange={e => handleTriageChange(idx, 'goodQty', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number" className="input w-full p-1 text-center border-yellow-300"
                                                    value={row.repairableQty}
                                                    onChange={e => handleTriageChange(idx, 'repairableQty', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number" className="input w-full p-1 text-center border-red-300"
                                                    value={row.damageQty}
                                                    onChange={e => handleTriageChange(idx, 'damageQty', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
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
                                    <p className="text-xs text-gray-500 mt-1">e.g. PCB Reset</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Low Cost (Minor)</label>
                                    <input
                                        type="number" className="input w-full"
                                        value={factoryData.lowCostQty}
                                        onChange={e => setFactoryData({ ...factoryData, lowCostQty: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">e.g. Software/Mic</p>
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
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div><strong>Status:</strong> {viewItem.status}</div>
                                <div><strong>Date:</strong> {new Date(viewItem.date).toLocaleDateString()}</div>
                                <div className="col-span-2">
                                    <strong>Ledger Credit:</strong> {viewItem.isLedgerAdjusted ? <span className="text-green-600">Applied</span> : <span className="text-gray-400">Not Applied</span>}
                                </div>
                            </div>
                            <table className="table w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th>Product</th>
                                        <th>Claimed</th>
                                        <th>Good</th>
                                        <th>Repaired</th>
                                        <th>Damage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewItem.items.map(i => (
                                        <tr key={i._id} className="border-b">
                                            <td>{i.product?.modelName || i.productName}</td>
                                            <td>{i.claimedQty}</td>
                                            <td className="text-green-600">{i.goodQty}</td>
                                            <td className="text-yellow-600">{i.repairableQty}</td>
                                            <td className="text-red-600">{i.damageQty}</td>
                                        </tr>
                                    ))}
                                </tbody>
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
