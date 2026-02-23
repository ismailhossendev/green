import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { inventoryAPI } from '../../services/api';
import { formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import AdvancedFilter from '../../components/ui/AdvancedFilter';
import './ProductList.css';

const ProductList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();

    // State
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        stockStatus: '',
        minPrice: '',
        maxPrice: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteUsage, setDeleteUsage] = useState(null); // { activeReplacements, stockTotal }

    // Query
    const { data, isLoading } = useQuery({
        queryKey: ['products', currentBrand, filters, page, limit],
        queryFn: () => inventoryAPI.getProducts({
            brand: currentBrand,
            ...filters,
            page,
            limit
        }),
    });

    const products = data?.data?.products || [];
    const pagination = data?.data?.pagination || {};

    // Filter Definitions
    const filterDefs = [
        {
            name: 'type',
            label: 'Type',
            type: 'select',
            placeholder: 'All Types',
            options: BrandingConfig.productTypes.map(t => ({ value: t, label: t }))
        },
        {
            name: 'stockStatus',
            label: 'Stock Status',
            type: 'select',
            placeholder: 'All Status',
            options: [
                { value: 'in-stock', label: 'In Stock' },
                { value: 'low-stock', label: 'Low Stock (<5)' },
                { value: 'out-of-stock', label: 'Out of Stock' }
            ]
        },
        {
            name: 'sortBy',
            label: 'Sort By',
            type: 'select',
            options: [
                { value: 'createdAt', label: 'Date Added' },
                { value: 'modelName', label: 'Name' },
                { value: 'salesPrice', label: 'Price' },
                { value: 'stock.goodQty', label: 'Quantity' }
            ],
            defaultValue: 'createdAt'
        },
        {
            name: 'minPrice',
            label: 'Min Price',
            type: 'number',
            placeholder: 'Min'
        },
        {
            name: 'maxPrice',
            label: 'Max Price',
            type: 'number',
            placeholder: 'Max'
        }
    ];

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1); // Reset to page 1 on filter change
    };

    const handleEdit = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const handleAdd = () => {
        setSelectedProduct(null);
        setShowModal(true);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPage(newPage);
        }
    };

    const handleDeleteClick = async (product) => {
        setSelectedProduct(product);
        try {
            const res = await inventoryAPI.getUsage(product._id);
            setDeleteUsage(res.data);
        } catch (error) {
            console.error("Usage check failed", error);
            setDeleteUsage(null); // Fallback to null (unknown usage)
        }
        setShowDeleteModal(true); // Open modal regardless of check result
    };

    return (
        <div className="product-list">
            {/* ... component structure ... */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">Manage {currentBrand} products</p>
                </div>
                <button className="btn btn-primary" onClick={handleAdd}>
                    <FiPlus /> Add Product
                </button>
            </div>

            {/* Advanced Filters */}
            <div className="card mb-4">
                <AdvancedFilter
                    filters={filterDefs}
                    onFilterChange={handleFilterChange}
                    searchPlaceholder="Search by model or description..."
                />
            </div>

            {/* Products Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Model Name</th>
                                <th>Type</th>
                                <th>Purchase Price</th>
                                <th>Sales Price</th>
                                <th>Good Qty</th>
                                <th>Damage</th>
                                <th>Repair</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : products.length > 0 ? (
                                products.map((product) => (
                                    <tr key={product._id}>
                                        <td>
                                            <div className="product-name">
                                                <FiPackage className="product-icon" />
                                                {product.modelName}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${product.type === 'Product' ? 'greentel' : 'greenstar'}`}>
                                                {product.type}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(product.purchasePrice)}</td>
                                        <td>{formatCurrency(product.salesPrice)}</td>
                                        <td className="text-success font-semibold">{product.stock?.goodQty || 0}</td>
                                        <td className="text-warning">{product.stock?.damageQty || 0}</td>
                                        <td className="text-info">{product.stock?.repairQty || 0}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn btn-icon btn-secondary" onClick={() => handleEdit(product)}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="btn btn-icon btn-danger text-red-500 hover:bg-red-50" onClick={() => handleDeleteClick(product)}>
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && pagination.pages > 1 && (
                    <div className="pagination">
                        <span className="text-sm text-muted">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page === 1}
                                onClick={() => handlePageChange(page - 1)}
                            >
                                <FiChevronLeft /> Previous
                            </button>
                            <span className="pagination-page">
                                Page {page} of {pagination.pages}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page === pagination.pages}
                                onClick={() => handlePageChange(page + 1)}
                            >
                                Next <FiChevronRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <ProductModal
                    product={selectedProduct}
                    brand={currentBrand}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedProduct && (
                <DeleteConfirmationModal
                    product={selectedProduct}
                    usage={deleteUsage}
                    onClose={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ product, usage, onClose }) => {
    const queryClient = useQueryClient();
    const [confirmText, setConfirmText] = useState('');
    const usageUnknown = usage === null;
    const hasIssues = usageUnknown || (usage?.activeReplacements > 0) || (usage?.stockTotal > 0);

    const deleteMutation = useMutation({
        mutationFn: () => inventoryAPI.deleteProduct(product._id),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            toast.success('Product deleted successfully');
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Delete failed')
    });

    const isMatch = confirmText === product.modelName;

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="text-red-600 font-bold">Delete Product?</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body space-y-4">
                    <p className="text-gray-700">
                        Are you sure you want to delete <strong>{product.modelName}</strong>?
                    </p>

                    {/* Pending Work Warning */}
                    {hasIssues && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                            <strong>Warning: Pending Work Found</strong>
                            <ul className="list-disc pl-5 mt-1">
                                {usageUnknown && <li>Could not verify active usage (Network/Server Error). Deleting might be unsafe.</li>}
                                {usage?.activeReplacements > 0 && <li>Product has <strong>{usage.activeReplacements} active replacements</strong>.</li>}
                                {usage?.stockTotal > 0 && <li>Product has <strong>{usage.stockTotal} active stock</strong>.</li>}
                            </ul>
                            <p className="mt-2 text-xs">Deleting this product might cause issues in active workflows.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Type <span className="font-mono bg-gray-100 px-1">{product.modelName}</span> to confirm:
                        </label>
                        <input
                            type="text"
                            className="input w-full border-red-300 focus:border-red-500 focus:ring-red-200"
                            placeholder={product.modelName}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-danger bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isMatch || deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate()}
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'I understand, delete this product'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Product Modal Component
const ProductModal = ({ product, brand, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        modelName: product?.modelName || '',
        type: product?.type || 'Product',
        purchasePrice: product?.purchasePrice || '',
        salesPrice: product?.salesPrice || '',
        packetPrice: product?.packetPrice || '',
        brand: brand,
    });

    const mutation = useMutation({
        mutationFn: (data) =>
            product
                ? inventoryAPI.updateProduct(product._id, data)
                : inventoryAPI.createProduct(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            toast.success(product ? 'Product updated!' : 'Product added!');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{product ? 'Edit Product' : 'Add New Product'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label">Model Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.modelName}
                                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Type</label>
                            <select
                                className="input select"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                {BrandingConfig.productTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2">
                            <div className="input-group">
                                <label className="input-label">Purchase Price</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.purchasePrice}
                                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Sales Price</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.salesPrice}
                                    onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductList;
