import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useBrand } from '../../App';
import { ledgerAPI, customerAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiDownload, FiPrinter, FiDollarSign, FiShare2 } from 'react-icons/fi';
import { printHTML, exportToPDF, shareToWhatsApp } from '../../utils/printHelper';
import CustomerPaymentModal from '../customers/CustomerPaymentModal';

const LedgerView = () => {
    const { currentBrand } = useBrand();
    const [searchParams] = useSearchParams();
    const [selectedCustomer, setSelectedCustomer] = useState(searchParams.get('customer') || '');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

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
                totalQty: '', amount: '', payment: '',
                adjustment: '', dues: runningDues, remarks: ''
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
                adjustment: '', dues: runningDues, remarks: entry.description || 'Sales'
            });

            // If there was a payment at time of sale, add separate Payment row
            if (entry.credit > 0) {
                sl++;
                runningDues -= entry.credit;
                rows.push({
                    sl, date: '', invoiceNo: '', type: 'Pay',
                    totalQty: '', amount: '', payment: entry.credit,
                    adjustment: '', dues: runningDues, remarks: entry.description || 'Pay'
                });
            }
        } else if (entry.type === 'Payment') {
            runningDues -= entry.credit;
            rows.push({
                sl, date, invoiceNo: '', type: 'Pay',
                totalQty: '', amount: '', payment: entry.credit,
                adjustment: '', dues: runningDues, remarks: entry.description || 'Pay'
            });
        } else if (entry.type === 'Replacement') {
            runningDues -= entry.credit;
            rows.push({
                sl, date, invoiceNo: entry.referenceNo || '', type: 'RPL',
                totalQty: '', amount: '', payment: '',
                adjustment: entry.credit, dues: runningDues, 
                remarks: (entry.description ? entry.description + ' ' : '') + `(Repl Qty: ${entry.totalQty || 0})`
            });
        } else if (entry.type === 'Return') {
            runningDues -= entry.credit;
            rows.push({
                sl, date, invoiceNo: entry.referenceNo || '', type: 'RTN',
                totalQty: '', amount: '', payment: '',
                adjustment: entry.credit, dues: runningDues, remarks: entry.description || 'RTN'
            });
        } else if (entry.type === 'Adjustment') {
            if (entry.credit > 0) {
                runningDues -= entry.credit;
                rows.push({
                    sl, date, invoiceNo: '', type: 'REB',
                    totalQty: '', amount: '', payment: '',
                    adjustment: entry.credit, dues: runningDues, remarks: entry.description || 'REB'
                });
            } else {
                runningDues += entry.debit;
                rows.push({
                    sl, date, invoiceNo: '', type: 'ADJ',
                    totalQty: '', amount: entry.debit, payment: '',
                    adjustment: '', dues: runningDues, remarks: entry.description || 'ADJ'
                });
            }
        }
    });

    // Totals
    const totals = rows.reduce((acc, r) => ({
        totalQty: acc.totalQty + (parseInt(r.totalQty) || 0),
        amount: acc.amount + (r.amount || 0),
        payment: acc.payment + (r.payment || 0),
        adjustment: acc.adjustment + (parseFloat(r.adjustment) || 0)
    }), { totalQty: 0, amount: 0, payment: 0, adjustment: 0 });

    // Number to words converter
    const numberToWords = (num) => {
        if (num === 0) return 'Zero Taka Only';
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const convert = (n) => {
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
            if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
            if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
            return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
        };

        const rounded = Math.abs(Math.round(num));
        return convert(rounded) + ' Taka Only';
    };

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
                return '<tr><td></td><td colspan="2" style="font-weight:600;font-style:italic;padding:3px 6px;border:1px solid #000;color:#000 !important">Opening Balance</td><td colspan="6" style="border:1px solid #000"></td><td style="text-align:right;font-weight:600;border:1px solid #000;padding:3px 6px;color:#000 !important">' + formatCurrency(r.dues) + '</td><td style="border:1px solid #000"></td></tr>';
            }
            return '<tr>' +
                '<td style="text-align:center;border:1px solid #000;padding:2px;color:#000 !important">' + r.sl + '</td>' +
                '<td style="border:1px solid #000;padding:2px 4px;color:#000 !important">' + r.date + '</td>' +
                '<td style="text-align:center;border:1px solid #000;padding:2px;color:#000 !important">' + r.invoiceNo + '</td>' +
                '<td style="border:1px solid #000;padding:2px 4px;font-weight:500;color:#000 !important">' + r.type + '</td>' +
                '<td style="text-align:center;border:1px solid #000;padding:2px;color:#000 !important">' + (r.totalQty || '') + '</td>' +
                '<td style="text-align:right;border:1px solid #000;padding:2px 4px;color:#000 !important">' + (r.amount ? formatCurrency(r.amount) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #000;padding:2px 4px;color:#000 !important">' + (r.payment ? formatCurrency(r.payment) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #000;padding:2px 4px;color:#000 !important">' + (r.adjustment ? formatCurrency(r.adjustment) : '') + '</td>' +
                '<td style="text-align:right;border:1px solid #000;padding:2px 4px;font-weight:600;color:#000 !important">' + formatCurrency(r.dues) + '</td>' +
                '<td style="border:1px solid #000;padding:2px;font-size:7px">' + (r.remarks || '') + '</td>' +
                '</tr>';
        }).join('');

        return '<html><head><title>Party Ledger - ' + dealerName + '</title>' +
            '<style>' +
            '* { margin:0;padding:0;box-sizing:border-box;color:#000 !important; }' +
            'body { font-family:"Segoe UI",Arial,sans-serif;padding:10px;color:#000 !important;font-size:9px;background:#fff !important;line-height:1.2; }' +
            '@page { size:portrait;margin:5mm; }' +
            '@media print { body { padding:0; } table { border:1.5px solid #000; } }' +
            'table { width:100%;border-collapse:collapse;border:1.5px solid #000; }' +
            'th { background:#eee !important;color:#000 !important;padding:3px 2px;font-size:8px;border:1px solid #000;text-transform:capitalize; }' +
            'td { border:1px solid #000;padding:2px 3px; }' +
            '</style></head><body>' +

            '<div style="text-align:center;margin-bottom:10px;color:#000 !important">' +
            '<h1 style="font-size:14px;font-weight:700;color:#000 !important;text-transform:uppercase;margin:0">' + currentBrand + ' Communication</h1>' +
            '<h2 style="font-size:10px;margin-top:2px;font-weight:600;color:#000 !important">Party Ledger</h2>' +
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
            '<th style="width:30px">SL</th>' +
            '<th style="width:65px">Date</th>' +
            '<th style="width:90px">Invoice</th>' +
            '<th style="width:40px">Type</th>' +
            '<th style="width:40px">Qty</th>' +
            '<th style="width:70px;text-align:right">Sales</th>' +
            '<th style="width:70px;text-align:right">Pay</th>' +
            '<th style="width:70px;text-align:right">Return/Adj</th>' +
            '<th style="width:80px;text-align:right">Dues</th>' +
            '<th style="width:65px">Remarks</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHTML +

            '<tr style="font-weight:700;background:#eee !important;color:#000 !important">' +
            '<td colspan="4" style="text-align:right;padding:4px;border:1px solid #000;font-size:9px;color:#000 !important">Total</td>' +
            '<td style="text-align:center;border:1px solid #000;padding:4px;color:#000 !important">' + totals.totalQty + '</td>' +
            '<td style="text-align:right;border:1px solid #000;padding:4px;color:#000 !important">' + formatCurrency(totals.amount) + '</td>' +
            '<td style="text-align:right;border:1px solid #000;padding:4px;color:#000 !important">' + formatCurrency(totals.payment) + '</td>' +
            '<td style="text-align:right;border:1px solid #000;padding:4px;color:#000 !important">' + formatCurrency(totals.adjustment) + '</td>' +
            '<td style="text-align:right;border:1px solid #000;padding:4px;font-size:10px;color:#000 !important">' + formatCurrency(closingBalance) + '</td>' +
            '<td style="border:1px solid #000"></td>' +
            '</tr>' +
            '</tbody></table>' +

            '<div style="margin-top:10px;padding:8px;border:1px solid #bbb;background:#f9f9f9 !important">' +
            '<b style="color:#000 !important">Closing Dues in Words: </b> <i style="color:#000 !important">' + numberToWords(closingBalance) + '</i>' +
            '</div>' +

            '<div style="display:flex;justify-content:space-between;margin-top:40px;padding:0 30px">' +
            '<div style="text-align:center;border-top:1px solid #333;padding-top:4px;width:150px;font-size:9px;font-weight:600;color:#000 !important">Dealer Signature</div>' +
            '<div style="text-align:center;border-top:1px solid #333;padding-top:4px;width:150px;font-size:9px;font-weight:600;color:#000 !important">Authorized Signature</div>' +
            '</div>' +

            '</body></html>';
    };

    // Export as PDF
    const handleExport = () => {
        if (!customerInfo || entries.length === 0) return;
        const html = buildLedgerHTML();
        exportToPDF(html, `Ledger_${customerInfo.companyName || customerInfo.name}`);
    };

    // Share to WhatsApp
    const handleShare = () => {
        if (!customerInfo || entries.length === 0) return;
        const html = buildLedgerHTML();
        const text = `*Party Ledger: ${customerInfo.companyName || customerInfo.name}*\nBalance: ${formatCurrency(closingBalance)}\nShared via ${currentBrand} System.`;
        shareToWhatsApp(html, `Ledger_${customerInfo.companyName || customerInfo.name}`, text);
    };

    // Print (auto-trigger print and close)
    const handlePrint = () => {
        if (!customerInfo || entries.length === 0) return;
        const html = buildLedgerHTML();
        printHTML(html);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Party Ledger</h1>
                    <p className="page-subtitle">{currentBrand} Communication</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)} disabled={!customerInfo}>
                        <FiDollarSign /> Receive Payment
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport} disabled={!customerInfo || entries.length === 0}>
                        <FiDownload /> PDF
                    </button>
                    <button className="btn btn-success" onClick={handleShare} disabled={!customerInfo || entries.length === 0}>
                        <FiShare2 /> WhatsApp
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
                <div className="card" style={{ background: '#f8fafc', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ lineHeight: 1.7, fontSize: '0.875rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#000' }}>
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
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000' }}>
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
                                <th style={{ width: '100px', textAlign: 'center' }}>Invoice</th>
                                <th style={{ width: '60px' }}>Type</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Sales</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Pay</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Return/Adj</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Dues</th>
                                <th style={{ width: '100px' }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!selectedCustomer ? (
                                <tr>
                                    <td colSpan="10" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        Please select a dealer to view party ledger
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan="10" className="text-center" style={{ padding: '3rem' }}>
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
                                                    <td colSpan="6"></td>
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
                                                        background: '#f0f0f0',
                                                        color: '#000'
                                                    }}>
                                                        {row.type}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{row.totalQty || ''}</td>
                                                <td style={{ textAlign: 'right', color: row.amount ? '#333' : '#ccc' }}>
                                                    {row.amount ? formatCurrency(row.amount) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right', color: row.payment ? '#000' : '#ccc', fontWeight: row.payment ? 600 : 400 }}>
                                                    {row.payment ? formatCurrency(row.payment) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>{row.adjustment ? formatCurrency(row.adjustment) : ''}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(row.dues)}</td>
                                                <td>{row.remarks}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Totals Row */}
                                    <tr style={{ background: '#f5f5f5', fontWeight: 700, fontSize: '11px' }}>
                                        <td colSpan="4" style={{ textAlign: 'right', padding: '10px 12px' }}>Total</td>
                                        <td style={{ textAlign: 'center' }}>{totals.totalQty || ''}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(totals.amount)}</td>
                                        <td style={{ textAlign: 'right', color: '#000' }}>{formatCurrency(totals.payment)}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(totals.adjustment)}</td>
                                        <td style={{ textAlign: 'right', color: '#000', fontSize: '12px' }}>{formatCurrency(closingBalance)}</td>
                                        <td></td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="10" className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No ledger entries found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Amount in Words Card */}
            {selectedCustomer && entries.length > 0 && (
                <div className="card" style={{ background: '#f8fafc', color: '#000' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Closing Dues in Words: <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{numberToWords(closingBalance)}</span>
                    </div>
                </div>
            )}
            {/* Payment Modal */}
            <CustomerPaymentModal
                isOpen={showPaymentModal}
                customer={customerInfo ? { ...customerInfo, _id: selectedCustomer } : null}
                onClose={() => setShowPaymentModal(false)}
            />
        </div>
    );
};

export default LedgerView;
