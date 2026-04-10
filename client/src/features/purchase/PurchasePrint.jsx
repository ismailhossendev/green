import { useRef } from 'react';
import { formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPrinter, FiX } from 'react-icons/fi';
import './PurchasePrint.css';
import { printHTML } from '../../utils/printHelper';

const PurchasePrint = ({ purchase, brand, onClose }) => {
    const printRef = useRef();

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

    const handlePrint = () => {
        const printContent = printRef.current;
        printHTML(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Voucher - ${purchase.purchaseNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 10mm;
              color: #000;
              font-size: 10px;
              line-height: 1.2;
            }
            .purchase-print { max-width: 800px; margin: 0 auto; }
            
            .header-top { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
            }
            .brand-name { font-size: 20px; font-weight: 700; text-transform: uppercase; }
            .brand-details { font-size: 9px; margin-top: 2px; }
            .voucher-title { font-size: 22px; font-weight: 700; text-align: right; }
            
            .info-section { 
              display: grid; 
              grid-template-columns: 1.5fr 1fr; 
              gap: 20px; 
              margin-bottom: 15px; 
            }
            .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #000; margin-bottom: 4px; }
            .info-item { margin-bottom: 2px; }
            .info-val { font-weight: 600; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
            th, td { 
              border: 1px solid #000; 
              padding: 4px 6px; 
              font-size: 10px;
              vertical-align: middle;
            }
            th { background: #f2f2f2; font-weight: 700; text-transform: uppercase; font-size: 9px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .summary-table { width: 100%; border-collapse: collapse; }
            .summary-table td { border: none; padding: 2px 0; font-size: 10px; border-bottom: 1px dotted #ccc; }
            .summary-table .total-row td { border-bottom: 2px solid #000; font-weight: 700; font-size: 12px; padding-top: 5px; }
            
            .words-section { 
              font-size: 9px; 
              margin-top: 10px; 
              padding: 5px; 
              border: 1px solid #000;
            }
            .words-label { font-weight: 700; text-transform: uppercase; font-size: 8px; color: #333; }

            .signature-area { 
              margin-top: 50px; 
              display: flex; 
              justify-content: space-between;
              padding: 0 20px;
            }
            .signature-box { border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 5px; font-size: 9px; }
            
            @media print {
              @page { size: A4; margin: 0; }
              body { padding: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="purchase-print-modal" onClick={(e) => e.stopPropagation()}>
                <div className="purchase-print-header">
                    <h3>Purchase Voucher Preview</h3>
                    <div className="purchase-print-actions">
                        <button className="btn btn-primary" onClick={handlePrint}>
                            <FiPrinter /> Print
                        </button>
                        <button className="btn btn-secondary" onClick={onClose}>
                            <FiX /> Close
                        </button>
                    </div>
                </div>

                <div className="purchase-print-body" ref={printRef}>
                    <div className="purchase-print">
                        {/* Header */}
                        <div className="header-top">
                            <div>
                                <div className="brand-name">{brand}</div>
                                <div className="brand-details">
                                    {BrandingConfig.contact.address}<br />
                                    Phone: {BrandingConfig.contact.phone}
                                </div>
                            </div>
                            <div>
                                <div className="voucher-title">PURCHASE VOUCHER</div>
                                <div className="text-right">
                                    <strong>No:</strong> {purchase.purchaseNo}<br />
                                    <strong>Date:</strong> {new Date(purchase.date).toLocaleDateString('en-GB')}
                                </div>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="info-section">
                            <div>
                                <div className="section-label">Supplier Info</div>
                                <div className="info-item">
                                    <span className="info-val" style={{ fontSize: '12px' }}>
                                        {purchase.supplier?.name}
                                    </span>
                                </div>
                                <div className="info-item">Phone: {purchase.supplier?.phone}</div>
                                <div className="info-item">Address: {purchase.supplier?.address || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="section-label">Summary</div>
                                <div className="info-item flex justify-between">
                                    <span>Total Items:</span>
                                    <span className="info-val">{purchase.items?.length}</span>
                                </div>
                                <div className="info-item flex justify-between">
                                    <span>Total Qty:</span>
                                    <span className="info-val">{purchase.totalQty}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }} className="text-center">SL</th>
                                    <th>Item Description</th>
                                    <th style={{ width: '80px' }} className="text-center">Type</th>
                                    <th style={{ width: '60px' }} className="text-center">Qty</th>
                                    <th style={{ width: '100px' }} className="text-right">Rate</th>
                                    <th style={{ width: '120px' }} className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchase.items?.map((item, index) => (
                                    <tr key={index}>
                                        <td className="text-center">{index + 1}</td>
                                        <td>{item.productName}</td>
                                        <td className="text-center">{item.type}</td>
                                        <td className="text-center" style={{ fontWeight: 600 }}>{item.qty}</td>
                                        <td className="text-right">{formatCurrency(item.price)}</td>
                                        <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                            <div style={{ flex: 1, marginRight: '40px' }}>
                                <div className="words-section">
                                    <div className="words-label">Amount in Words:</div>
                                    <div style={{ fontStyle: 'italic' }}>{numberToWords(purchase.totalAmount)}</div>
                                </div>
                                {purchase.note && (
                                    <div className="note" style={{ marginTop: '15px' }}>
                                        <strong>Note:</strong> {purchase.note}
                                    </div>
                                )}
                            </div>

                            <div style={{ width: '250px' }}>
                                <table className="summary-table">
                                    <tbody>
                                        <tr>
                                            <td>Total Amount:</td>
                                            <td className="text-right">{formatCurrency(purchase.totalAmount)}</td>
                                        </tr>
                                        <tr>
                                            <td>Paid Amount:</td>
                                            <td className="text-right">{formatCurrency(purchase.paidAmount)}</td>
                                        </tr>
                                        <tr className="total-row">
                                            <td>Due Balance:</td>
                                            <td className="text-right">{formatCurrency(purchase.dues)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="signature-area">
                            <div className="signature-box">Receiver's Signature</div>
                            <div className="signature-box">Supplier's Signature</div>
                            <div className="signature-box">Authorized Signature</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchasePrint;
