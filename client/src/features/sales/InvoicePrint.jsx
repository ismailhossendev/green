import { useRef } from 'react';
import { getBrandLogo, getBrandTheme, formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPrinter, FiX, FiDownload } from 'react-icons/fi';
import './InvoicePrint.css';

const InvoicePrint = ({ invoice, brand, onClose }) => {
    const printRef = useRef();
    const theme = getBrandTheme(brand);

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

    const handlePrint = () => {
        const printContent = printRef.current;
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', sans-serif; 
              padding: 20px;
              color: #1a1a1a;
            }
            .invoice-print { max-width: 800px; margin: 0 auto; }
            .invoice-header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid ${theme.primary};
            }
            .brand-section { display: flex; gap: 15px; align-items: center; }
            .brand-logo { width: 60px; height: 60px; object-fit: contain; }
            .brand-name { 
              font-size: 24px; 
              font-weight: 700; 
              color: ${theme.primary};
            }
            .brand-address { font-size: 12px; color: #666; margin-top: 5px; }
            .invoice-info { text-align: right; }
            .invoice-title { 
              font-size: 28px; 
              font-weight: 700; 
              color: ${theme.primary};
              margin-bottom: 10px;
            }
            .invoice-no { font-size: 16px; font-weight: 600; }
            .invoice-date { font-size: 14px; color: #666; margin-top: 5px; }
            
            .parties { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin-bottom: 30px;
            }
            .party-box { 
              padding: 15px; 
              background: #f8f9fa; 
              border-radius: 8px;
              border-left: 4px solid ${theme.primary};
            }
            .party-label { 
              font-size: 12px; 
              text-transform: uppercase; 
              color: #666;
              margin-bottom: 8px;
            }
            .party-name { font-size: 16px; font-weight: 600; }
            .party-details { font-size: 13px; color: #555; margin-top: 5px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { 
              background: ${theme.primary}; 
              color: white; 
              padding: 12px 10px; 
              text-align: left;
              font-size: 13px;
              font-weight: 600;
            }
            td { 
              padding: 12px 10px; 
              border-bottom: 1px solid #e0e0e0; 
              font-size: 13px;
            }
            tr:nth-child(even) { background: #fafafa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .summary { 
              display: flex; 
              justify-content: flex-end; 
              margin-top: 20px;
            }
            .summary-table { width: 300px; }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .summary-row.total { 
              font-size: 18px; 
              font-weight: 700; 
              color: ${theme.primary};
              border-bottom: none;
              padding-top: 15px;
            }
            .summary-row.dues { color: #dc3545; }
            
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px dashed #ccc;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
            }
            .signature-box { text-align: center; }
            .signature-line { 
              border-top: 1px solid #333; 
              padding-top: 10px;
              margin-top: 40px;
              font-size: 12px;
            }
            .note { 
              font-size: 12px; 
              color: #666; 
              margin-top: 20px;
              padding: 10px;
              background: #fff8e1;
              border-radius: 4px;
            }
            
            @media print {
              @page { size: A4; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .invoice-print { 
                  margin: 20mm; 
                  max-width: none;
                  width: auto;
                  box-shadow: none;
              }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="invoice-print-modal" onClick={(e) => e.stopPropagation()}>
                <div className="invoice-print-header">
                    <h3>Invoice Preview</h3>
                    <div className="invoice-print-actions">
                        <button className="btn btn-primary" onClick={handlePrint}>
                            <FiPrinter /> Print
                        </button>
                        <button className="btn btn-secondary" onClick={onClose}>
                            <FiX /> Close
                        </button>
                    </div>
                </div>

                <div className="invoice-print-body" ref={printRef}>
                    <div className="invoice-print">
                        {/* Header */}
                        <div className="invoice-header">
                            <div className="brand-section">
                                <img
                                    src={getBrandLogo(brand)}
                                    alt={brand}
                                    className="brand-logo"
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                                <div>
                                    <div className="brand-name">{brand}</div>
                                    <div className="brand-address">
                                        {BrandingConfig.contact.address}<br />
                                        Phone: {BrandingConfig.contact.phone}
                                    </div>
                                </div>
                            </div>
                            <div className="invoice-info">
                                <div className="invoice-title">INVOICE</div>
                                <div className="invoice-no">{invoice.invoiceNo}</div>
                                <div className="invoice-date">
                                    Date: {new Date(invoice.date).toLocaleDateString('en-GB')}
                                </div>
                            </div>
                        </div>

                        {/* Parties */}
                        <div className="parties">
                            <div className="party-box">
                                <div className="party-label">Bill To</div>
                                {invoice.customer?.companyName && (
                                    <div className="party-name">{invoice.customer.companyName}</div>
                                )}
                                <div className={invoice.customer?.companyName ? "party-details" : "party-name"} style={invoice.customer?.companyName ? { fontWeight: 500, fontSize: '14px' } : {}}>
                                    {invoice.customer?.name || 'N/A'}
                                </div>
                                <div className="party-details">
                                    {invoice.customer?.phone && <>Phone: {invoice.customer.phone}<br /></>}
                                    {invoice.customer?.address && <>{invoice.customer.address}<br /></>}
                                    {invoice.customer?.district && <>District: {invoice.customer.district}</>}
                                </div>
                            </div>
                            <div className="party-box">
                                <div className="party-label">Previous Dues</div>
                                <div className="party-name" style={{ color: '#dc3545' }}>
                                    {formatCurrency(invoice.previousDues || 0)}
                                </div>
                                <div className="party-details">
                                    {invoice.customer?.lastInvoiceDate
                                        ? `Last Invoice: ${new Date(invoice.customer.lastInvoiceDate).toLocaleDateString('en-GB')}`
                                        : 'No previous invoices'}
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th>Product</th>
                                    <th style={{ width: '80px' }}>Type</th>
                                    <th style={{ width: '60px' }} className="text-center">Qty</th>
                                    <th style={{ width: '100px' }} className="text-right">Price</th>
                                    <th style={{ width: '120px' }} className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            {item.productName}
                                            {item.isCombined && <span style={{ color: '#666', fontSize: '11px' }}> (Combined)</span>}
                                        </td>
                                        <td>{item.type}</td>
                                        <td className="text-center">{item.qty}</td>
                                        <td className="text-right">{formatCurrency(item.price)}</td>
                                        <td className="text-right">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary */}
                        <div className="summary">
                            <div className="summary-table">
                                <div className="summary-row">
                                    <span>Total Qty:</span>
                                    <span>{invoice.totalQty}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Sub Total:</span>
                                    <span>{formatCurrency(invoice.subTotal)}</span>
                                </div>
                                {invoice.discount > 0 && (
                                    <div className="summary-row">
                                        <span>Discount{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ''}:</span>
                                        <span>- {formatCurrency(invoice.discount)}</span>
                                    </div>
                                )}
                                {invoice.rebate > 0 && (
                                    <div className="summary-row">
                                        <span>Rebate:</span>
                                        <span>- {formatCurrency(invoice.rebate)}</span>
                                    </div>
                                )}
                                <div className="summary-row total">
                                    <span>Grand Total:</span>
                                    <span>{formatCurrency(invoice.grandTotal)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Paid Amount:</span>
                                    <span style={{ color: '#28a745' }}>{formatCurrency(invoice.paidAmount)}</span>
                                </div>
                                {(invoice.previousDues || 0) > 0 && (
                                    <div className="summary-row">
                                        <span>Previous Dues:</span>
                                        <span style={{ color: '#dc3545' }}>{formatCurrency(invoice.previousDues)}</span>
                                    </div>
                                )}
                                {invoice.dues > 0 && (
                                    <div className="summary-row dues">
                                        <span>Current Due:</span>
                                        <span>{formatCurrency(invoice.dues)}</span>
                                    </div>
                                )}
                                {(invoice.previousDues || 0) > 0 && (
                                    <div className="summary-row" style={{ fontWeight: 700, fontSize: '15px', paddingTop: '10px', borderTop: '2px solid #333' }}>
                                        <span>Net Payable:</span>
                                        <span style={{ color: '#dc3545' }}>{formatCurrency(invoice.dues + (invoice.previousDues || 0))}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Amount in Words */}
                        <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f0f4f8', borderRadius: '6px', borderLeft: `4px solid ${theme.primary}` }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#555' }}>In Words: </span>
                            <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#333' }}>{numberToWords(invoice.grandTotal)}</span>
                        </div>

                        {/* Note */}
                        {invoice.note && (
                            <div className="note">
                                <strong>Note:</strong> {invoice.note}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="footer">
                            <div className="signature-box">
                                <div className="signature-line">Customer Signature</div>
                            </div>
                            <div className="signature-box">
                                <div className="signature-line">Authorized Signature</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrint;
