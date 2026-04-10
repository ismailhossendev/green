import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI, customerAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPrinter, FiSearch, FiFilter, FiCalendar, FiUsers, FiTruck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useBrand } from '../../App';
import { printHTML } from '../../utils/printHelper';

const CompanyLedger = () => {
    const { currentBrand } = useBrand();
    const [search, setSearch] = useState('');
    const [district, setDistrict] = useState('');
    const [partyType, setPartyType] = useState('customer');
    const [customerType, setCustomerType] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    const { data: districts } = useQuery({
        queryKey: ['districts'],
        queryFn: () => customerAPI.getDistricts()
    });

    const { data: summaryData, isLoading } = useQuery({
        queryKey: ['party-summary', partyType, currentBrand, dateRange, search, district, customerType],
        queryFn: () => reportsAPI.getPartySummary({
            type: partyType,
            brand: currentBrand,
            customerType: partyType === 'customer' ? customerType : undefined,
            ...dateRange
        }),
    });

    // Filter data localy for search/district since the back-end returns the range-calculated list
    let parties = summaryData?.data || [];
    if (search) {
        parties = parties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (district && partyType === 'customer') {
        parties = parties.filter(p => p.district === district);
    }

    const totals = parties.reduce((acc, p) => ({
        opening: acc.opening + (p.opening || 0),
        sales: acc.sales + (p.sales || p.purchases || 0),
        payment: acc.payment + (p.payments || 0),
        adjust: acc.adjust + (p.returns || 0),
        balance: acc.balance + (p.balance || 0)
    }), { opening: 0, sales: 0, payment: 0, adjust: 0, balance: 0 });

    const handlePrint = () => {
        const dateStr = new Date().toLocaleDateString();
        const rangeText = dateRange.startDate && dateRange.endDate 
            ? `${dateRange.startDate} to ${dateRange.endDate}` 
            : 'Lifetime Summary';
        
        const isCustomer = partyType === 'customer';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${isCustomer ? 'Company' : 'Supplier'} Summary Ledger - ${dateStr}</title>
                <style>
                    @page { size: portrait; margin: 10mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 10px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                    .header p { margin: 2px 0; font-size: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
                    th, td { border: 1px solid #000; padding: 4px 2px; word-wrap: break-word; overflow: hidden; }
                    th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 9px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .totals-row { font-weight: bold; background-color: #eee; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                    .signature-box { border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 5px; font-size: 9px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Green Tel Communication</h1>
                    <p>${isCustomer ? 'Company' : 'Supplier'} Summary Ledger (${currentBrand})</p>
                    <p>Period: ${rangeText}</p>
                    <p>Report Date: ${dateStr}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 30px">SL</th>
                            <th style="width: 140px">Name</th>
                            <th style="width: 80px">${isCustomer ? 'District' : 'Address'}</th>
                            <th style="width: 70px">Opening</th>
                            <th style="width: 70px">${isCustomer ? 'Sales' : 'Purchase'}</th>
                            <th style="width: 70px">Payment</th>
                            ${isCustomer ? '<th style="width: 70px">Return/Adj</th>' : ''}
                            <th style="width: 80px">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parties.map((p, index) => `
                            <tr>
                                <td class="text-center">${index + 1}</td>
                                <td>${p.name}</td>
                                <td>${p.district || p.address || ''}</td>
                                <td class="text-right">${formatCurrency(p.opening || 0)}</td>
                                <td class="text-right">${formatCurrency(p.sales || p.purchases || 0)}</td>
                                <td class="text-right">${formatCurrency(p.payments || 0)}</td>
                                ${isCustomer ? `<td class="text-right">${formatCurrency(p.returns || 0)}</td>` : ''}
                                <td class="text-right" style="font-weight:bold">${formatCurrency(p.balance || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td colspan="3" class="text-right">GRAND TOTAL:</td>
                            <td class="text-right">${formatCurrency(totals.opening)}</td>
                            <td class="text-right">${formatCurrency(totals.sales)}</td>
                            <td class="text-right">${formatCurrency(totals.payment)}</td>
                            ${isCustomer ? `<td class="text-right">${formatCurrency(totals.adjust)}</td>` : ''}
                            <td class="text-right">${formatCurrency(totals.balance)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="footer">
                    <div class="signature-box">Accountant Signature</div>
                    <div class="signature-box">Authorized Signature</div>
                </div>
            </body>
            </html>
        `;

        printHTML(html);
    };

    return (
        <div className="company-ledger">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {partyType === 'customer' ? 'Company' : 'Supplier'} Summary Ledger
                    </h1>
                    <p className="page-subtitle">Range-based summary (${currentBrand})</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="tabs" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
                        <button 
                            className={`btn btn-sm ${partyType === 'customer' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPartyType('customer')}
                        >
                            <FiUsers style={{ marginRight: '0.4rem' }} /> Customers
                        </button>
                        <button 
                            className={`btn btn-sm ${partyType === 'supplier' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPartyType('supplier')}
                        >
                            <FiTruck style={{ marginRight: '0.4rem' }} /> Suppliers
                        </button>
                    </div>
                    <button className="btn btn-secondary" onClick={handlePrint} disabled={parties.length === 0}>
                        <FiPrinter style={{ marginRight: '0.5rem' }} /> Print
                    </button>
                </div>
            </div>

            <div className="card mb-4">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder={`Search ${partyType}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    {partyType === 'customer' && (
                        <>
                            <div>
                                <select 
                                    className="input" 
                                    value={customerType}
                                    onChange={(e) => setCustomerType(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="Dealer">Dealers</option>
                                    <option value="Retail">Companies/Retail</option>
                                    <option value="Ecommerce">Ecommerce</option>
                                </select>
                            </div>
                            <div>
                                <select 
                                    className="input" 
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                >
                                    <option value="">All Districts</option>
                                    {districts?.data?.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div style={{ position: 'relative' }}>
                        <FiCalendar style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                        <input
                            type="date"
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <FiCalendar style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                        <input
                            type="date"
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="card overflow-x-auto" style={{ padding: 0 }}>
                <table className="table table-compact" style={{ fontSize: '0.82rem' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>SL</th>
                            <th>Name</th>
                            <th>{partyType === 'customer' ? 'District' : 'Address'}</th>
                            <th className="text-right">Opening</th>
                            <th className="text-right">{partyType === 'customer' ? 'Sales' : 'Purchase'}</th>
                            <th className="text-right">Payment</th>
                            {partyType === 'customer' && <th className="text-right">Return/Adj</th>}
                            <th className="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="8" className="text-center py-8">Calculating summary...</td></tr>
                        ) : parties.length === 0 ? (
                            <tr><td colSpan="8" className="text-center py-8">No records found for this period</td></tr>
                        ) : (
                            <>
                                {parties.map((p, index) => (
                                    <tr key={p._id}>
                                        <td className="text-muted">{index + 1}</td>
                                        <td className="font-medium text-white">{p.name}</td>
                                        <td>{p.district || p.address}</td>
                                        <td className="text-right">{formatCurrency(p.opening)}</td>
                                        <td className="text-right">{formatCurrency(p.sales || p.purchases)}</td>
                                        <td className="text-right text-success">{formatCurrency(p.payments)}</td>
                                        {partyType === 'customer' && (
                                            <td className="text-right text-warning">{formatCurrency(p.returns)}</td>
                                        )}
                                        <td className="text-right font-bold text-danger">{formatCurrency(p.balance)}</td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                                    <td colSpan="3" className="text-right">GRAND TOTAL</td>
                                    <td className="text-right">{formatCurrency(totals.opening)}</td>
                                    <td className="text-right">{formatCurrency(totals.sales)}</td>
                                    <td className="text-right text-success">{formatCurrency(totals.payment)}</td>
                                    {partyType === 'customer' && (
                                        <td className="text-right text-warning">{formatCurrency(totals.adjust)}</td>
                                    )}
                                    <td className="text-right text-danger">{formatCurrency(totals.balance)}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CompanyLedger;
