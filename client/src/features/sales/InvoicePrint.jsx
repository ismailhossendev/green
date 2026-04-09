import { useRef } from 'react';
import { getBrandLogo, getBrandTheme, formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPrinter, FiX, FiDownload } from 'react-icons/fi';
import './InvoicePrint.css';

const InvoicePrint = ({ invoice, brand, onClose }) => {
    const printRef = useRef();

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
              font-family: 'Arial', sans-serif; 
              padding: 10mm;
              color: #000;
              font-size: 10px;
              line-height: 1.2;
            }
            .invoice-print { max-width: 800px; margin: 0 auto; }
            
            .header-top { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
            }
            .brand-name { font-size: 20px; font-weight: 700; text-transform: uppercase; }
            .brand-details { font-size: 9px; margin-top: 2px; }
            .invoice-title { font-size: 22px; font-weight: 700; text-align: right; }
            
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
              padding: 3px 5px; 
              font-size: 10px;
              vertical-align: middle;
            }
            th { background: #f2f2f2; font-weight: 700; text-transform: uppercase; font-size: 9px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .footer-grid { 
              display: grid; 
              grid-template-columns: 1.5fr 1fr; 
              gap: 20px;
              margin-top: 10px;
            }
            
            .summary-table { width: 100%; border-collapse: collapse; }
            .summary-table td { border: none; padding: 2px 0; font-size: 10px; border-bottom: 1px dotted #ccc; }
            .summary-table .total-row td { border-bottom: 2px solid #000; font-weight: 700; font-size: 12px; padding-top: 5px; }
            
            .words-section { 
              font-size: 9px; 
              margin-top: 10px; 
              padding: 5px; 
              border: 1px solid #000;
            }
            .words-item { margin-bottom: 4px; }
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
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);

        printWindow.document.close();
    };

    const netPayable = invoice.dues + (invoice.previousDues || 0);

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
                        <div className="header-top">
                            <div>
                                <div className="brand-name">{brand}</div>
                                <div className="brand-details">
                                    {BrandingConfig.contact.address}<br />
                                    Phone: {BrandingConfig.contact.phone}
                                </div>
                            </div>
                            <div>
                                <div className="invoice-title">INVOICE</div>
                                <div className="text-right">
                                    <strong>No:</strong> {invoice.invoiceNo}<br />
                                    <strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-GB')}
                                </div>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="info-section">
                            <div>
                                <div className="section-label">Bill To</div>
                                <div className="info-item">
                                    <span className="info-val" style={{ fontSize: '12px' }}>
                                        {invoice.customer?.companyName || invoice.customer?.name}
                                    </span>
                                </div>
                                {invoice.customer?.companyName && (
                                    <div className="info-item">Prop: {invoice.customer.name}</div>
                                )}
                                <div className="info-item">
                                    {invoice.customer?.address && <>{invoice.customer.address}, </>}
                                    {invoice.customer?.district && <>{invoice.customer.district}</>}
                                </div>
                                <div className="info-item">Phone: {invoice.customer?.phone}</div>
                            </div>
                            <div>
                                <div className="section-label">Account Summary</div>
                                <div className="summary-table">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                        <span>Previous Dues:</span>
                                        <span className="info-val">{formatCurrency(invoice.previousDues || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                        <span>Last Activity:</span>
                                        <span>{invoice.customer?.lastInvoiceDate ? new Date(invoice.customer.lastInvoiceDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '30px' }}>SL</th>
                                    <th>Description / Items</th>
                                    <th style={{ width: '60px' }}>Type</th>
                                    <th style={{ width: '50px' }} className="text-center">Qty</th>
                                    <th style={{ width: '80px' }} className="text-right">Rate</th>
                                    <th style={{ width: '90px' }} className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items?.map((item, index) => (
                                    <tr key={index}>
                                        <td className="text-center">{index + 1}</td>
                                        <td>
                                            {item.productName}
                                            {item.isCombined && <span style={{ fontStyle: 'italic', fontSize: '9px' }}> (Combined)</span>}
                                        </td>
                                        <td className="text-center">{item.type}</td>
                                        <td className="text-center" style={{ fontWeight: 600 }}>{item.qty}</td>
                                        <td className="text-right">{formatCurrency(item.price)}</td>
                                        <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                                {/* Empty rows to fill space if needed, though high density means we don't need many */}
                            </tbody>
                        </table>

                        {/* Footer Section */}
                        <div className="footer-grid">
                            <div>
                                <div className="words-section">
                                    <div className="words-item">
                                        <div className="words-label">Invoice Amount in Words:</div>
                                        <div style={{ fontStyle: 'italic' }}>{numberToWords(invoice.grandTotal)}</div>
                                    </div>
                                    {netPayable > 0 && (
                                        <div className="words-item" style={{ marginTop: '5px', borderTop: '1px solid #eee', paddingTop: '3px' }}>
                                            <div className="words-label">Total Net Payable in Words:</div>
                                            <div style={{ fontStyle: 'italic', fontWeight: 600 }}>{numberToWords(netPayable)}</div>
                                        </div>
                                    )}
                                </div>
                                {invoice.note && (
                                    <div style={{ marginTop: '10px', fontSize: '9px' }}>
                                        <strong>Note:</strong> {invoice.note}
                                    </div>
                                )}
                            </div>

                            <div>
                                <table className="summary-table">
                                    <tr>
                                        <td>Total Quantity:</td>
                                        <td className="text-right">{invoice.totalQty}</td>
                                    </tr>
                                    <tr>
                                        <td>Sub Total:</td>
                                        <td className="text-right">{formatCurrency(invoice.subTotal)}</td>
                                    </tr>
                                    {invoice.discount > 0 && (
                                        <tr>
                                            <td>Discount ({invoice.discountPercent || 0}%):</td>
                                            <td className="text-right">- {formatCurrency(invoice.discount)}</td>
                                        </tr>
                                    )}
                                    {invoice.rebate > 0 && (
                                        <tr>
                                            <td>Rebate:</td>
                                            <td className="text-right">- {formatCurrency(invoice.rebate)}</td>
                                        </tr>
                                    )}
                                    <tr className="total-row">
                                        <td>Grand Total:</td>
                                        <td className="text-right">{formatCurrency(invoice.grandTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td>Paid Amount:</td>
                                        <td className="text-right">{formatCurrency(invoice.paidAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td>Current Due:</td>
                                        <td className="text-right">{formatCurrency(invoice.dues)}</td>
                                    </tr>
                                    {(invoice.previousDues || 0) > 0 && (
                                        <>
                                            <tr>
                                                <td>Previous Dues:</td>
                                                <td className="text-right">{formatCurrency(invoice.previousDues)}</td>
                                            </tr>
                                            <tr style={{ background: '#eee', fontWeight: 700 }}>
                                                <td style={{ padding: '4px' }}>Net Payable:</td>
                                                <td className="text-right" style={{ padding: '4px' }}>{formatCurrency(netPayable)}</td>
                                            </tr>
                                        </>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="signature-area">
                            <div className="signature-box">Customer Signature</div>
                            <div className="signature-box">Authorized Signature</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrint;
