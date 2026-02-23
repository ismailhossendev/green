import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBrand } from '../../App';
import { reportsAPI } from '../../services/api';
import { formatCurrency } from '../../config/brandingConfig';
import { FiPrinter, FiCalendar } from 'react-icons/fi';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const StockSummary = () => {
    const { currentBrand } = useBrand();
    const printRef = useRef(null);

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const { data, isLoading } = useQuery({
        queryKey: ['stock-summary', currentBrand, month, year],
        queryFn: () => reportsAPI.getStockSummary({ brand: currentBrand, month, year }),
    });

    const report = data?.data;
    const grouped = report?.grouped || {};
    const typeTotals = report?.typeTotals || {};
    const grandTotals = report?.grandTotals || {};

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Stock Summary - ${MONTHS[month - 1]}'${year}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; font-size: 11px; }
                    .header { text-align: center; margin-bottom: 15px; }
                    .header h1 { font-size: 18px; font-weight: 700; color: #00796B; }
                    .header h2 { font-size: 14px; font-weight: 600; margin-top: 4px; }
                    .header h3 { font-size: 12px; font-weight: 500; color: #666; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
                    th { background: #00796B; color: white; font-weight: 600; font-size: 9px; }
                    .type-header td { background: #E0F2F1; font-weight: 700; font-size: 11px; text-align: left; color: #00796B; }
                    .subtotal td { background: #F5F5F5; font-weight: 600; }
                    .grand-total td { background: #00796B; color: white; font-weight: 700; font-size: 11px; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    @page { size: landscape; margin: 10mm; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    };

    const typeOrder = ['Product', 'Packet', 'Others'];
    const sortedTypes = Object.keys(grouped).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stock Summary</h1>
                    <p className="page-subtitle">Monthly stock movement report</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                        className="input"
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        style={{ width: '140px' }}
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        className="input"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        style={{ width: '100px' }}
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={handlePrint} disabled={isLoading || !report}>
                        <FiPrinter /> Print
                    </button>
                </div>
            </div>

            <div className="card" style={{ overflow: 'auto' }}>
                {isLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner"></div></div>
                ) : !report || report.summary.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <FiCalendar size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p>No stock data found for {MONTHS[month - 1]} {year}</p>
                    </div>
                ) : (
                    <div ref={printRef}>
                        <div className="header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#00796B' }}>
                                {currentBrand} Communication
                            </h1>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                                Stock Summary {year}
                            </h2>
                            <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#999', marginTop: '2px' }}>
                                Month of: {MONTHS[month - 1]}'{year}
                            </h3>
                        </div>

                        <table className="table" style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style={{ width: '40px', background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>SL</th>
                                    <th rowSpan="2" style={{ width: '70px', background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Type</th>
                                    <th rowSpan="2" style={{ background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px', textAlign: 'left' }}>Model</th>
                                    <th rowSpan="2" style={{ width: '80px', background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Buy Price</th>
                                    <th colSpan="2" style={{ background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Opening</th>
                                    <th colSpan="2" style={{ background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Receive</th>
                                    <th colSpan="2" style={{ background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Sales</th>
                                    <th colSpan="2" style={{ background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Return</th>
                                    <th colSpan="2" style={{ background: '#00796B', color: 'white', border: '1px solid #00695C', padding: '6px 4px' }}>Closing</th>
                                </tr>
                                <tr>
                                    <th style={{ width: '55px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Qty</th>
                                    <th style={{ width: '80px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Value</th>
                                    <th style={{ width: '55px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Qty</th>
                                    <th style={{ width: '80px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Value</th>
                                    <th style={{ width: '55px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Qty</th>
                                    <th style={{ width: '80px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Value</th>
                                    <th style={{ width: '55px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Qty</th>
                                    <th style={{ width: '80px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Value</th>
                                    <th style={{ width: '55px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Qty</th>
                                    <th style={{ width: '80px', background: '#009688', color: 'white', border: '1px solid #00695C', padding: '4px', fontSize: '10px' }}>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTypes.map((type) => {
                                    const items = grouped[type];
                                    const totals = typeTotals[type];
                                    return (
                                        <>
                                            {/* Type Header */}
                                            <tr key={`header-${type}`}>
                                                <td colSpan="14" style={{
                                                    background: '#E0F2F1',
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    textAlign: 'left',
                                                    padding: '8px 12px',
                                                    color: '#00796B',
                                                    border: '1px solid #B2DFDB'
                                                }}>
                                                    {type}
                                                </td>
                                            </tr>

                                            {/* Product Rows */}
                                            {items.map((item, idx) => (
                                                <tr key={`${type}-${idx}`} style={{ fontSize: '11px' }}>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px' }}>{item.sl}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', fontSize: '10px', color: '#999' }}>{item.type}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>{item.model}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{formatCurrency(item.buyPrice)}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px' }}>{item.openingQty}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{formatCurrency(item.openingValue)}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', color: item.receiveQty > 0 ? '#2196F3' : 'inherit' }}>{item.receiveQty}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right', color: item.receiveQty > 0 ? '#2196F3' : 'inherit' }}>{formatCurrency(item.receiveValue)}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', color: item.salesQty > 0 ? '#4CAF50' : 'inherit' }}>{item.salesQty}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right', color: item.salesQty > 0 ? '#4CAF50' : 'inherit' }}>{formatCurrency(item.salesValue)}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', color: item.returnQty > 0 ? '#F44336' : 'inherit' }}>{item.returnQty}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right', color: item.returnQty > 0 ? '#F44336' : 'inherit' }}>{formatCurrency(item.returnValue)}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', fontWeight: 600 }}>{item.closingQty}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.closingValue)}</td>
                                                </tr>
                                            ))}

                                            {/* Type Subtotal */}
                                            {totals && (
                                                <tr key={`subtotal-${type}`} style={{ fontSize: '11px' }}>
                                                    <td colSpan="4" style={{ background: '#F5F5F5', fontWeight: 600, textAlign: 'right', padding: '6px 12px', border: '1px solid #ddd' }}>
                                                        {type} Total:
                                                    </td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, border: '1px solid #ddd', padding: '4px' }}>{totals.openingQty}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, textAlign: 'right', border: '1px solid #ddd', padding: '4px' }}>{formatCurrency(totals.openingValue)}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, border: '1px solid #ddd', padding: '4px' }}>{totals.receiveQty}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, textAlign: 'right', border: '1px solid #ddd', padding: '4px' }}>{formatCurrency(totals.receiveValue)}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, border: '1px solid #ddd', padding: '4px' }}>{totals.salesQty}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, textAlign: 'right', border: '1px solid #ddd', padding: '4px' }}>{formatCurrency(totals.salesValue)}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, border: '1px solid #ddd', padding: '4px' }}>{totals.returnQty}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, textAlign: 'right', border: '1px solid #ddd', padding: '4px' }}>{formatCurrency(totals.returnValue)}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, border: '1px solid #ddd', padding: '4px' }}>{totals.closingQty}</td>
                                                    <td style={{ background: '#F5F5F5', fontWeight: 600, textAlign: 'right', border: '1px solid #ddd', padding: '4px' }}>{formatCurrency(totals.closingValue)}</td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}

                                {/* Grand Total */}
                                <tr style={{ fontSize: '12px' }}>
                                    <td colSpan="4" style={{ background: '#00796B', color: 'white', fontWeight: 700, textAlign: 'right', padding: '8px 12px', border: '1px solid #00695C' }}>
                                        Grand Total:
                                    </td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, border: '1px solid #00695C', padding: '6px' }}>{grandTotals.openingQty}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid #00695C', padding: '6px' }}>{formatCurrency(grandTotals.openingValue)}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, border: '1px solid #00695C', padding: '6px' }}>{grandTotals.receiveQty}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid #00695C', padding: '6px' }}>{formatCurrency(grandTotals.receiveValue)}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, border: '1px solid #00695C', padding: '6px' }}>{grandTotals.salesQty}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid #00695C', padding: '6px' }}>{formatCurrency(grandTotals.salesValue)}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, border: '1px solid #00695C', padding: '6px' }}>{grandTotals.returnQty}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid #00695C', padding: '6px' }}>{formatCurrency(grandTotals.returnValue)}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, border: '1px solid #00695C', padding: '6px' }}>{grandTotals.closingQty}</td>
                                    <td style={{ background: '#00796B', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid #00695C', padding: '6px' }}>{formatCurrency(grandTotals.closingValue)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockSummary;
