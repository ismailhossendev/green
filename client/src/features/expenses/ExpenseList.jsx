import { useQuery } from '@tanstack/react-query';
import { expenseAPI } from '../../services/api';
import { formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPlus, FiSearch, FiDollarSign } from 'react-icons/fi';
import { useState } from 'react';

const ExpenseList = () => {
    const [category, setCategory] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['expenses', category, startDate, endDate],
        queryFn: () => expenseAPI.getExpenses({ category, startDate, endDate }),
    });

    const expenses = data?.data?.expenses || [];
    const total = data?.data?.total || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Expenses</h1>
                    <p className="page-subtitle">Track business expenses</p>
                </div>
                <button className="btn btn-primary">
                    <FiPlus /> Add Expense
                </button>
            </div>

            <div className="filters-bar">
                <select
                    className="input select"
                    style={{ width: '180px' }}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    {BrandingConfig.expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <input
                    type="date"
                    className="input"
                    style={{ width: '150px' }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />

                <input
                    type="date"
                    className="input"
                    style={{ width: '150px' }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>

            {/* Summary Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--greentel-primary), var(--greentel-secondary))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
                    <div>
                        <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Expenses</span>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(total)}</h2>
                    </div>
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>
                        <FiDollarSign />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Added By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : expenses.length > 0 ? (
                                expenses.map((expense) => (
                                    <tr key={expense._id}>
                                        <td>{new Date(expense.date).toLocaleDateString()}</td>
                                        <td>
                                            <span className="badge badge-warning">{expense.category}</span>
                                        </td>
                                        <td>{expense.description}</td>
                                        <td>{expense.reference || '-'}</td>
                                        <td className="font-semibold text-danger">{formatCurrency(expense.amount)}</td>
                                        <td>{expense.addedBy?.name || 'N/A'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No expenses found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpenseList;
