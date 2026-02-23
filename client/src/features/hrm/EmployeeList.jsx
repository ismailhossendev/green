import { useQuery } from '@tanstack/react-query';
import { hrmAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiUser, FiMapPin, FiCalendar } from 'react-icons/fi';
import { useState } from 'react';

const EmployeeList = () => {
    const [status, setStatus] = useState('Active');
    const [search, setSearch] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['employees', status],
        queryFn: () => hrmAPI.getEmployees({ status }),
    });

    const employees = data?.data?.employees || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">HRM</h1>
                    <p className="page-subtitle">Human Resource Management</p>
                </div>
                <button className="btn btn-primary">
                    <FiPlus /> Add Employee
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['Active', 'Terminated', 'Resigned'].map((s) => (
                    <button
                        key={s}
                        className={`btn ${status === s ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setStatus(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Employee Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {isLoading ? (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner"></div>
                    </div>
                ) : employees.length > 0 ? (
                    employees.map((employee) => (
                        <div key={employee._id} className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'var(--greentel-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.25rem',
                                    fontWeight: 600
                                }}>
                                    {employee.name?.charAt(0) || 'E'}
                                </div>
                                <div>
                                    <h4 style={{ fontWeight: 600 }}>{employee.name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {employee.designation}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <FiMapPin size={14} />
                                    {employee.area || 'Not assigned'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <FiCalendar size={14} />
                                    Joined: {new Date(employee.joiningDate).toLocaleDateString()}
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Salary</span>
                                    <p style={{ fontWeight: 600 }}>{formatCurrency(employee.salary)}</p>
                                </div>
                                <span className={`badge badge-${employee.status === 'Active' ? 'success' : 'danger'}`}>
                                    {employee.status}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No employees found
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeList;
