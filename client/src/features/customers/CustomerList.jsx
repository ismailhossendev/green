import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { customerAPI } from '../../services/api';
import { formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiUsers, FiMapPin, FiMoreVertical, FiEdit2, FiTrash2, FiDollarSign, FiEye, FiBook } from 'react-icons/fi';
import CrudModal from '../../components/ui/CrudModal';
import CustomerPaymentModal from './CustomerPaymentModal';
import toast from 'react-hot-toast';

const CustomerList = () => {
    const { currentBrand } = useBrand();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [district, setDistrict] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [modalMode, setModalMode] = useState('add');

    const { data, isLoading } = useQuery({
        queryKey: ['customers', currentBrand, search, district],
        queryFn: () => customerAPI.getCustomers({ brand: currentBrand, search, district }),
    });

    const customers = data?.data?.customers || [];

    // Fields for CrudModal
    const fields = [
        { name: 'companyName', label: 'Company Name', type: 'text' },
        { name: 'name', label: 'Customer Name', type: 'text', required: true },
        { name: 'phone', label: 'Phone Number', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'district', label: 'District', type: 'select', options: BrandingConfig.districts, required: true },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'type', label: 'Type', type: 'select', options: ['Retail', 'Dealer', 'Ecommerce'], required: true },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Green Tel', 'Green Star', 'Both'], required: true, defaultValue: currentBrand },
        // Only show opening dues when adding a new customer
        ...(modalMode === 'add' ? [{ name: 'openingDues', label: 'Opening Dues (Optional)', type: 'number', min: '0', step: '0.01' }] : [])
    ];

    const createMutation = useMutation({
        mutationFn: (data) => customerAPI.createCustomer(data),
        onSuccess: () => {
            toast.success('Customer created successfully');
            queryClient.invalidateQueries(['customers']);
            setShowModal(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create customer');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => customerAPI.updateCustomer(selectedCustomer._id, data),
        onSuccess: () => {
            toast.success('Customer updated successfully');
            queryClient.invalidateQueries(['customers']);
            setShowModal(false);
            setSelectedCustomer(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update customer');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => customerAPI.deleteCustomer(id),
        onSuccess: () => {
            toast.success('Customer deleted successfully');
            queryClient.invalidateQueries(['customers']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete customer');
        }
    });

    const handleSubmit = (data) => {
        if (modalMode === 'add') {
            createMutation.mutate(data);
        } else {
            updateMutation.mutate(data);
        }
    };

    const handleEdit = (customer) => {
        setSelectedCustomer(customer);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            deleteMutation.mutate(id);
        }
    };

    const handlePayment = (customer) => {
        setSelectedCustomer(customer);
        setShowPaymentModal(true);
    };

    const handleAdd = () => {
        setSelectedCustomer(null);
        setModalMode('add');
        setShowModal(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">Manage {currentBrand} customers</p>
                </div>
                <button className="btn btn-primary" onClick={handleAdd}>
                    <FiPlus /> Add Customer
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>

                <select
                    className="input select"
                    style={{ width: '180px' }}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                >
                    <option value="">All Districts</option>
                    {BrandingConfig.districts.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>

            {/* Customer List */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Company / Name</th>
                                <th>Phone</th>
                                <th>District</th>
                                <th>Type</th>
                                <th>Total Sales</th>
                                <th>Total Payment</th>
                                <th>Total Dues</th>
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
                            ) : customers.length > 0 ? (
                                customers.map((customer) => (
                                    <tr key={customer._id}>
                                        <td className="font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <FiUsers style={{ color: 'var(--greentel-primary)' }} />
                                                <div>
                                                    {customer.companyName && <div style={{ fontWeight: 600 }}>{customer.companyName}</div>}
                                                    <div style={{ fontSize: customer.companyName ? '0.85em' : '1em', color: customer.companyName ? '#888' : 'inherit' }}>{customer.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{customer.phone}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <FiMapPin size={12} />
                                                {customer.district}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${customer.type === 'Dealer' ? 'greentel' : 'info'}`}>
                                                {customer.type}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(customer.totalSales)}</td>
                                        <td className="text-success font-medium">{formatCurrency(customer.totalPayment)}</td>
                                        <td className={customer.totalDues > 0 ? 'text-danger font-bold' : ''}>
                                            {formatCurrency(customer.totalDues)}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon-sm success"
                                                    title="Receive Payment"
                                                    onClick={() => handlePayment(customer)}
                                                >
                                                    <FiDollarSign />
                                                </button>
                                                <button
                                                    className="btn-icon-sm"
                                                    title="View Ledger"
                                                    onClick={() => navigate(`/ledger?customer=${customer._id}&brand=${currentBrand}`)}
                                                >
                                                    <FiBook />
                                                </button>
                                                <button
                                                    className="btn-icon-sm"
                                                    title="Edit"
                                                    onClick={() => handleEdit(customer)}
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="btn-icon-sm danger"
                                                    title="Delete"
                                                    onClick={() => handleDelete(customer._id)}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No customers found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CRUD Modal */}
            <CrudModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${modalMode === 'add' ? 'Add' : 'Edit'} Customer`}
                fields={fields}
                onSubmit={handleSubmit}
                initialData={selectedCustomer}
                submitLabel={modalMode === 'add' ? 'Create Customer' : 'Update Customer'}
                loading={createMutation.isPending || updateMutation.isPending}
            />

            {/* Payment Modal */}
            <CustomerPaymentModal
                isOpen={showPaymentModal}
                customer={selectedCustomer}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedCustomer(null);
                }}
            />
        </div>
    );
};

export default CustomerList;
