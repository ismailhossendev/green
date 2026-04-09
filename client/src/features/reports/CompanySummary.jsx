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

const CompanySummary = () => {
    const { currentBrand } = useBrand();
    const printRef = useRef(null);

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const { data, isLoading } = useQuery({
        queryKey: ['company-summary', currentBrand, month, year],
        queryFn: () => reportsAPI.getCompanySummary({ brand: currentBrand, month, year }),
    });

    const report = data?.data;
    const grouped = report?.grouped || {};

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Company Summary - ${MONTHS[month - 1]}'${year}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; font-size: 10px; color: #000; }
                    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .header h1 { font-size: 16px; font-weight: 800; text-transform: uppercase; }
                    .header p { font-size: 10px; color: #333; }
                    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                    th, td { border: 1px solid #000; padding: 2px 3px; text-align: center; word-wrap: break-word; overflow: hidden; }
                    th { background: #f0f0f0; font-weight: 700; font-size: 8px; }
                    .type-row td { background: #e0e0e0; font-weight: 800; text-align: left; padding-left: 10px; font-size: 11px; }
                    .model-cell { text-align: left; font-weight: 600; font-size: 9px; }
                    .text-right { text-align: right; }
                    .bg-green { background: #e8f5e9; }
                    .bg-blue { background: #e3f2fd; }
                    .bg-orange { background: #fff3e0; }
                    .bg-red { background: #ffebee; }
                    @page { size: A4 landscape; margin: 5mm; }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const typeOrder = ['Charger', 'Cable', 'Others'];
    const sortedTypes = Object.keys(grouped).sort((a, b) => {
        const idxA = typeOrder.indexOf(a);
        const idxB = typeOrder.indexOf(b);
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Company Summary</h1>
                    <p className="page-subtitle">Expert-level product P&L and movement report</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select className="input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select className="input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={handlePrint} disabled={isLoading || !report}>
                        <FiPrinter /> Print A4 Landscape
                    </button>
                </div>
            </div>

            <div className="card" style={{ overflow: 'auto', background: '#fff', color: '#000' }}>
                {isLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner"></div></div>
                ) : !report || report.summary.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <FiCalendar size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p>No data found for {MONTHS[month - 1]} {year}</p>
                    </div>
                ) : (
                    <div ref={printRef}>
                        <div className="header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>{currentBrand.toUpperCase()} COMMUNICATION</h1>
                            <p style={{ fontWeight: 600 }}>Month of: {MONTHS[month - 1]}'{year}</p>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style={{ width: '30px' }}>SL</th>
                                    <th rowSpan="2" style={{ width: '80px' }}>Type</th>
                                    <th rowSpan="2" style={{ width: '150px' }}>Model</th>
                                    <th rowSpan="2" style={{ width: '50px' }}>Packet Buy</th>
                                    <th rowSpan="2" style={{ width: '50px' }}>Product Buy</th>
                                    <th rowSpan="2" style={{ width: '50px' }}>Sales Price</th>
                                    <th rowSpan="2" style={{ width: '40px' }}>Gap</th>
                                    <th colSpan="2" className="bg-blue">Opening</th>
                                    <th colSpan="2" className="bg-orange">Product Receive</th>
                                    <th colSpan="2" className="bg-orange">Packet Receive</th>
                                    <th colSpan="2" className="bg-green">Product Sales</th>
                                    <th colSpan="2" className="bg-red">Return</th>
                                    <th colSpan="2">Closing</th>
                                    <th rowSpan="2" style={{ width: '60px' }}>Profit</th>
                                </tr>
                                <tr>
                                    <th className="bg-blue" style={{ width: '40px' }}>Qty</th>
                                    <th className="bg-blue" style={{ width: '70px' }}>Value</th>
                                    <th className="bg-orange" style={{ width: '40px' }}>Qty</th>
                                    <th className="bg-orange" style={{ width: '70px' }}>Value</th>
                                    <th className="bg-orange" style={{ width: '40px' }}>Qty</th>
                                    <th className="bg-orange" style={{ width: '70px' }}>Value</th>
                                    <th className="bg-green" style={{ width: '40px' }}>Qty</th>
                                    <th className="bg-green" style={{ width: '70px' }}>Value</th>
                                    <th className="bg-red" style={{ width: '40px' }}>Qty</th>
                                    <th className="bg-red" style={{ width: '70px' }}>Value</th>
                                    <th style={{ width: '40px' }}>Qty</th>
                                    <th style={{ width: '70px' }}>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTypes.map((type) => (
                                    <>
                                        <tr className="type-row">
                                            <td colSpan="22">{type}</td>
                                        </tr>
                                        {grouped[type].map((item, idx) => (
                                            <tr key={`${type}-${idx}`}>
                                                <td>{item.sl}</td>
                                                <td style={{ fontSize: '10px' }}>{item.type}</td>
                                                <td className="model-cell">{item.model}</td>
                                                <td>{item.packetBuyPrice || '-'}</td>
                                                <td>{item.productBuyPrice}</td>
                                                <td>{item.salesPrice}</td>
                                                <td style={{ color: item.gap < 0 ? 'red' : 'inherit' }}>{item.gap}</td>
                                                
                                                <td className="bg-blue">{item.openingQty}</td>
                                                <td className="bg-blue text-right">{item.openingValue.toFixed(0)}</td>
                                                
                                                <td className="bg-orange">{!item.isPacket ? item.receiveQty : ''}</td>
                                                <td className="bg-orange text-right">{!item.isPacket ? item.receiveValue.toFixed(0) : ''}</td>
                                                
                                                <td className="bg-orange">{item.isPacket ? item.receiveQty : ''}</td>
                                                <td className="bg-orange text-right">{item.isPacket ? item.receiveValue.toFixed(0) : ''}</td>
                                                
                                                <td className="bg-green">{item.salesQty}</td>
                                                <td className="bg-green text-right">{item.salesValue.toFixed(0)}</td>
                                                
                                                <td className="bg-red">{item.returnQty}</td>
                                                <td className="bg-red text-right">{item.returnValue.toFixed(0)}</td>
                                                
                                                <td style={{ fontWeight: 700 }}>{item.closingQty}</td>
                                                <td style={{ fontWeight: 700 }} className="text-right">{item.closingValue.toFixed(0)}</td>
                                                
                                                <td style={{ fontWeight: 700, color: item.profit < 0 ? 'red' : 'green' }} className="text-right">
                                                    {item.profit.toFixed(0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style jsx>{`
                .model-cell { text-align: left; padding-left: 10px; }
                .text-right { text-align: right; }
                .bg-green { background: #e8f5e9; }
                .bg-blue { background: #e3f2fd; }
                .bg-orange { background: #fff3e0; }
                .bg-red { background: #ffebee; }
            `}</style>
        </div>
    );
};

export default CompanySummary;
