import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useBrand } from '../../App';
import { ledgerAPI, customerAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiDownload, FiPrinter } from 'react-icons/fi';

const LedgerView = () => {
    const { currentBrand } = useBrand();
    const [searchParams] = useSearchParams();
    const [selectedCustomer, setSelectedCustomer] = useState(searchParams.get('customer') || '');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const customerParam = searchParams.get('customer');
        if (customerParam) setSelectedCustomer(customerParam);
    }, [searchParams]);

    const { data: customersData } = useQuery({
        queryKey: ['customers', currentBrand],
        queryFn: () => customerAPI.getCustomers({ brand: currentBrand, limit: 500 }),
    });
    const customers = customersData?.data?.customers || [];

    const { data: ledgerData, isLoading } = useQuery({
        queryKey: ['ledger', selectedCustomer, currentBrand, startDate, endDate],
        queryFn: () => ledgerAPI.getCustomerLedger(selectedCustomer, { brand: currentBrand, startDate, endDate }),
        enabled: !!selectedCustomer,
    });

    const entries = ledgerData?.data?.entries || [];
    const customerInfo = ledgerData?.data?.customer;
    const closingBalance = ledgerData?.data?.closingBalance || 0;

    // Format entries to match Party Ledger format
    const formatDate = (d) => {
        const dt = new Date(d);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = String(dt.getFullYear()).slice(-2);
        return dd + '.' + mm + '.' + yy;
    };

    const getMonthYear = (d) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dt = new Date(d);
        return months[dt.getMonth()] + "'" + String(dt.getFullYear()).slice(-2);
    };

    // Map entries to Party Ledger rows
    let sl = 0;
    let runningDues = 0;
    const rows = [];
    entries.forEach(entry => {
        if (entry.type === 'Opening') {
            runningDues = entry.debit - entry.credit;
            rows.push({
                sl: '', date: '', invoiceNo: '', type: 'Opening Balance',
                totalQty: '', amount: '', payment: '', replaceAdjust: '',
                returnAdjust: '', rebateAdjust: '', dues: runningDues, remarks: ''
            });
            return;
        }

        sl++;
        const date = formatDate(entry.date);

        if (entry.type === 'Invoice') {
            // Sales amount row
            runningDues += entry.debit;
            rows.push({
                sl, date, invoiceNo: entry.referenceNo || '', type: 'Sales',
                totalQty: entry.totalQty || '', amount: entry.debit, payment: '',
                replaceAdjust: '', returnAdjust: '', rebateAdjust: '',
                dues: runningDues, remarks: ''
            });

            // If there was a payment at time of sale, add separate Payment row
            if (entry.credit > 0) {
                sl++;
                runningDues -= entry.credit;
                rows.push({
                    sl, date: '', invoiceNo: '', type: 'Payment',
                    totalQty: '', amount: '', payment: entry.credit,
                    replaceAdjust: '', returnAdjust: '', rebateAdjust: '',
                    dues: runningDues, remarks: ''
                });
            }
        } else if (entry.type === 'Payment') {
            runningDues -= entry.credit;
            rows.push({
                sl, date, invoiceNo: '', type: 'Payment',
                totalQty: '', amount: '', payment: entry.credit,
                replaceAdjust: '', returnAdjust: '', rebateAdjust: '',
                dues: runningDues, remarks: ''
            });
        } else if (entry.type === 'Replacement') {
            runningDues -= entry.credit;
            rows.push({
                sl, date, invoiceNo: entry.referenceNo || '', type: 'Replace',
                totalQty: '', amount: '', payment: '',
                replaceAdjust: entry.credit, returnAdjust: '', rebateAdjust: '',
                dues: runningDues, remarks: ''
            });
        } else if (entry.type === 'Return') {
            runningDues -= entry.credit;
            rows.push({
                sl, date, invoiceNo: entry.referenceNo || '', type: 'Return',
                totalQty: '', amount: '', payment: '',
                replaceAdjust: '', returnAdjust: entry.credit, rebateAdjust: '',
                dues: runningDues, remarks: ''
            });
        } else if (entry.type === 'Adjustment') {
            if (entry.credit > 0) {
                runningDues -= entry.credit;
                rows.push({
                    sl, date, invoiceNo: '', type: 'Rebate',
                    totalQty: '', amount: '', payment: '',
                    replaceAdjust: '', returnAdjust: '', rebateAdjust: entry.credit,
                    dues: runningDues, remarks: ''
                });
            } else {
                runningDues += entry.debit;
                rows.push({
                    sl, date, invoiceNo: '', type: 'Adjustment',
                    totalQty: '', amount: entry.debit, payment: '',
                    replaceAdjust: '', returnAdjust: '', rebateAdjust: '',
                    dues: runningDues, remarks: ''
                });
            }
        }
    });

    // Totals
    const totals = rows.reduce((acc, r) => ({
        totalQty: acc.totalQty + (parseInt(r.totalQty) || 0),
        amount: acc.amount + (r.amount || 0),
        payment: acc.payment + (r.payment || 0),
        replaceAdjust: acc.replaceAdjust + (r.replaceAdjust || 0),
        returnAdjust: acc.returnAdjust + (r.returnAdjust || 0),
        rebateAdjust: acc.rebateAdjust + (r.rebateAdjust || 0),
    }), { totalQty: 0, amount: 0, payment: 0, replaceAdjust: 0, returnAdjust: 0, rebateAdjust: 0 });

    // Duration text
    const duration = entries.length > 0
        ? getMonthYear(entries[0].date) + ' to ' + getMonthYear(entries[entries.length - 1].date)
        : '';

    // Build the styled HTML for PDF/Print
    const buildLedgerHTML = () => {
        if (!customerInfo || entries.length === 0) return '';

        const dealerName = customerInfo.companyName || customerInfo.name;
        const rowsHTML = rows.map(r => {
            if (r.type === 'Opening Balance') {
                return '<tr><td></td><td colspan="2" style="font-weight:600;font-style:italic;padding:6px 8px;border:1px solid #bbb">Opening Balance</td><td colspan="8" style="border:1px solid #bbb"></td><td style="text-align:right;font-weight:600;border:1px solid #bbb;padding:4px 8px">' + formatCurrency(r.dues) + '</td><td style="border:1px solid #bbb"></td></tr>';
            }
            return '<tr>' +
                '<td style="text-align:center;border:1px solid #bbb;padding:4px 6px">' + r.sl + '</td>' +
                '<td style="border:1px solid #bbb;padding:4px 8px">' + r.date + '</td>' +
                '<td style="text-align:center;border:1px solid #bbb;padding:4px 6px">' + r.invoiceNo + '</td>' +
                '<td style="border:1px solid #bbb;padding:4px 8px;font-weight:500">' + r.type + '</td>' +
                '<td style="text-align:center;border:1px solid #bbb;padding:4px 6px">' + (r.totalQty || '') + '</td>' +
                '<td style="text-align:right;border:1px solid #bbb;padding:4px 8px">' + (r.amount ? formatCurrency(r.amount) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #bbb;padding:4px 8px;color:#10B981">' + (r.payment ? formatCurrency(r.payment) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #bbb;padding:4px 8px">' + (r.replaceAdjust ? formatCurrency(r.replaceAdjust) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #bbb;padding:4px 8px">' + (r.returnAdjust ? formatCurrency(r.returnAdjust) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #bbb;padding:4px 8px">' + (r.rebateAdjust ? formatCurrency(r.rebateAdjust) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #bbb;padding:4px 8px;font-weight:600">' + formatCurrency(r.dues) + '</td>' +
                '<td style="border:1px solid #bbb;padding:4px 6px"></td>' +
                '</tr>';
        }).join('');

        return '<html><head><title>Party Ledger - ' + dealerName + '</title>' +
            '<style>' +
            '* { margin:0;padding:0;box-sizing:border-box; }' +
            'body { font-family:"Segoe UI",Arial,sans-serif;padding:25px;color:#333;font-size:11px; }' +
            '@page { size:landscape;margin:10mm; }' +
            '@media print { body { padding:10px; } }' +
            'table { width:100%;border-collapse:collapse; }' +
            'th { background:#00796B;color:white;padding:8px 6px;font-size:10px;border:1px solid #00695C;text-transform:uppercase;letter-spacing:0.3px; }' +
            '</style></head><body>' +

            '<div style="text-align:center;margin-bottom:8px">' +
            '<h1 style="font-size:18px;font-weight:700;color:#00796B;letter-spacing:2px;text-transform:uppercase">' + currentBrand + ' Communication</h1>' +
            '<h2 style="font-size:14px;margin-top:3px;font-weight:600">Party Ledger</h2>' +
            '</div>' +

            '<div style="margin-bottom:8px;font-size:11px;line-height:1.7">' +
            '<div style="display:flex;justify-content:space-between">' +
            '<span><b>Dealer Name:</b> ' + dealerName + '</span>' +
            '<span><b>Duration:</b> ' + duration + '</span>' +
            '</div>' +
            '<div><b>Address:</b> ' + (customerInfo.address || customerInfo.district || 'N/A') + '</div>' +
            '<div><b>Contact:</b> ' + (customerInfo.phone || 'N/A') + '</div>' +
            '<div><b>Date:</b> ' + formatDate(new Date()) + '</div>' +
            '</div>' +

            '<table>' +
            '<thead><tr>' +
            '<th style="width:35px">SL</th>' +
            '<th style="width:70px">Date</th>' +
            '<th style="width:65px">Invoice No</th>' +
            '<th style="width:65px">Type</th>' +
            '<th style="width:55px">Total Qty</th>' +
            '<th style="width:80px;text-align:right">Amount</th>' +
            '<th style="width:80px;text-align:right">Payment</th>' +
            '<th style="width:75px;text-align:right">Replace Adjust</th>' +
            '<th style="width:70px;text-align:right">Return Adjust</th>' +
            '<th style="width:70px;text-align:right">Rebate Adjust</th>' +
            '<th style="width:80px;text-align:right">Dues</th>' +
            '<th style="width:70px">Remarks</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHTML +

            '<tr style="font-weight:700;background:#E0F2F1">' +
            '<td colspan="4" style="text-align:right;padding:8px;border:1px solid #bbb;font-size:12px">Total</td>' +
            '<td style="text-align:center;border:1px solid #bbb;padding:6px">' + totals.totalQty + '</td>' +
            '<td style="text-align:right;border:1px solid #bbb;padding:6px 8px">' + formatCurrency(totals.amount) + '</td>' +
            '<td style="text-align:right;border:1px solid #bbb;padding:6px 8px;color:#10B981">' + formatCurrency(totals.payment) + '</td>' +
            '<td style="text-align:right;border:1px solid #bbb;padding:6px 8px">' + (totals.replaceAdjust ? formatCurrency(totals.replaceAdjust) : '0') + '</td>' +
            '<td style="text-align:right;border:1px solid #bbb;padding:6px 8px">' + (totals.returnAdjust ? formatCurrency(totals.returnAdjust) : '0') + '</td>' +
            '<td style="text-align:right;border:1px solid #bbb;padding:6px 8px">' + (totals.rebateAdjust ? formatCurrency(totals.rebateAdjust) : '') + '</td>' +
            '<td style="text-align:right;border:1px solid #bbb;padding:6px 8px;font-size:12px;color:#00796B">' + formatCurrency(closingBalance) + '</td>' +
            '<td style="border:1px solid #bbb"></td>' +
            '</tr>' +
            '</tbody></table>' +

            '<div style="display:flex;justify-content:space-between;margin-top:60px;padding:0 40px">' +
            '<div style="text-align:center;border-top:1px solid #333;padding-top:5px;width:180px;font-size:11px;font-weight:600">Dealer Signature</div>' +
            '<div style="text-align:center;border-top:1px solid #333;padding-top:5px;width:180px;font-size:11px;font-weight:600">Authorized Signature</div>' +
            '</div>' +

            '</body></html>';
    };

    // Export as PDF (auto-trigger print dialog)
    const handleExport = () => {
        if (!customerInfo || entries.length === 0) return;
        const html = buildLedgerHTML();
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 400);
    };

    // Print (auto-trigger print and close)
    const handlePrint = () => {
        if (!customerInfo || entries.length === 0) return;
        const html = buildLedgerHTML();
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 400);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Party Ledger</h1>
                    <p className="page-subtitle">{currentBrand} Communication</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handleExport} disabled={!customerInfo || entries.length === 0}>
                        <FiDownload /> Export PDF
                    </button>
                    <button className="btn btn-secondary" onClick={handlePrint} disabled={!customerInfo || entries.length === 0}>
                        <FiPrinter /> Print
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                        <label className="input-label">Select Customer</label>
                        <select className="input select" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                            <option value="">-- Select Dealer --</option>
                            {customers.map(customer => (
                                <option key={customer._id} value={customer._id}>
                                    {customer.companyName || customer.name} ({customer.phone})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Start Date</label>
                        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">End Date</label>
                        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Dealer Info Card */}
            {customerInfo && (
                <div className="card" style={{ background: 'linear-gradient(135deg, #E0F2F1, #B2DFDB)', border: '1px solid #80CBC4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ lineHeight: 1.7, fontSize: '0.875rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#00695C' }}>
                                {customerInfo.companyName || customerInfo.name}
                            </div>
                            {customerInfo.companyName && (
                                <div style={{ color: '#555' }}>{customerInfo.name}</div>
                            )}
                            <div style={{ color: '#666' }}>📍 {customerInfo.address || customerInfo.district || 'N/A'}</div>
                            <div style={{ color: '#666' }}>📞 {customerInfo.phone || 'N/A'}</div>
                            {duration && <div style={{ color: '#888', fontSize: '0.8rem' }}>📅 Duration: {duration}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', letterSpacing: '1px' }}>Closing Dues</span>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00796B' }}>
                                {formatCurrency(closingBalance)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ledger Table */}
            <div className="card" style={{ overflow: 'auto' }}>
                <div className="table-container">
                    <table className="table" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>SL</th>
                                <th style={{ width: '80px' }}>Date</th>
                                <th style={{ width: '70px', textAlign: 'center' }}>Invoice No</th>
                                <th style={{ width: '70px' }}>Type</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Total Qty</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Amount</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Payment</th>
                                <th style={{ width: '80px', textAlign: 'right' }}>Replace Adjust</th>
                                <th style={{ width: '80px', textAlign: 'right' }}>Return Adjust</th>
                                <th style={{ width: '80px', textAlign: 'right' }}>Rebate Adjust</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Dues</th>
                                <th style={{ width: '80px' }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!selectedCustomer ? (
                                <tr>
                                    <td colSpan="12" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        Please select a dealer to view party ledger
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan="12" className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner"></div>
                                    </td>
                                </tr>
                            ) : rows.length > 0 ? (
                                <>
                                    {rows.map((row, index) => {
                                        if (row.type === 'Opening Balance') {
                                            return (
                                                <tr key={index} style={{ background: '#F5F5F5' }}>
                                                    <td></td>
                                                    <td colSpan="2" style={{ fontWeight: 600, fontStyle: 'italic' }}>Opening Balance</td>
                                                    <td colSpan="7"></td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(row.dues)}</td>
                                                    <td></td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <tr key={index}>
                                                <td style={{ textAlign: 'center' }}>{row.sl}</td>
                                                <td>{row.date}</td>
                                                <td style={{ textAlign: 'center' }}>{row.invoiceNo}</td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        background: row.type === 'Sales' ? '#E3F2FD' : row.type === 'Payment' ? '#E8F5E9' : '#FFF3E0',
                                                        color: row.type === 'Sales' ? '#1565C0' : row.type === 'Payment' ? '#2E7D32' : '#E65100'
                                                    }}>
                                                        {row.type}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{row.totalQty}</td>
                                                <td style={{ textAlign: 'right', color: row.amount ? '#333' : '#ccc' }}>
                                                    {row.amount ? formatCurrency(row.amount) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right', color: row.payment ? '#10B981' : '#ccc', fontWeight: row.payment ? 600 : 400 }}>
                                                    {row.payment ? formatCurrency(row.payment) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>{row.replaceAdjust ? formatCurrency(row.replaceAdjust) : ''}</td>
                                                <td style={{ textAlign: 'right' }}>{row.returnAdjust ? formatCurrency(row.returnAdjust) : ''}</td>
                                                <td style={{ textAlign: 'right' }}>{row.rebateAdjust ? formatCurrency(row.rebateAdjust) : ''}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(row.dues)}</td>
                                                <td>{row.remarks}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Totals Row */}
                                    <tr style={{ background: '#E0F2F1', fontWeight: 700, fontSize: '12px' }}>
                                        <td colSpan="4" style={{ textAlign: 'right', padding: '10px 12px' }}>Total</td>
                                        <td style={{ textAlign: 'center' }}>{totals.totalQty || ''}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(totals.amount)}</td>
                                        <td style={{ textAlign: 'right', color: '#10B981' }}>{formatCurrency(totals.payment)}</td>
                                        <td style={{ textAlign: 'right' }}>{totals.replaceAdjust ? formatCurrency(totals.replaceAdjust) : '0'}</td>
                                        <td style={{ textAlign: 'right' }}>{totals.returnAdjust ? formatCurrency(totals.returnAdjust) : '0'}</td>
                                        <td style={{ textAlign: 'right' }}>{totals.rebateAdjust ? formatCurrency(totals.rebateAdjust) : ''}</td>
                                        <td style={{ textAlign: 'right', color: '#00796B', fontSize: '13px' }}>{formatCurrency(closingBalance)}</td>
                                        <td></td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="12" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No ledger entries found
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

export default LedgerView;
