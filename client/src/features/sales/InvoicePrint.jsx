import { useRef } from 'react';
import { getBrandLogo, getBrandTheme, formatCurrency, BrandingConfig } from '../../config/brandingConfig';
import { FiPrinter, FiX, FiDownload, FiShare2 } from 'react-icons/fi';
import './InvoicePrint.css';
import { printHTML, exportToPDF, shareToWhatsApp } from '../../utils/printHelper';

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

    const buildInvoiceHTML = () => {
        const customerName = invoice.customer?.companyName || invoice.customer?.name || '';
        const propName = invoice.customer?.companyName ? invoice.customer.name : '';
        const address = [invoice.customer?.address, invoice.customer?.district].filter(Boolean).join(', ') || 'N/A';
        const phone = invoice.customer?.phone || 'N/A';
        const prevDues = invoice.previousDues || 0;
        const lastActivity = invoice.customer?.lastInvoiceDate ? new Date(invoice.customer.lastInvoiceDate).toLocaleDateString('en-GB') : 'N/A';
        const netPay = invoice.dues + prevDues;

        const itemsHTML = (invoice.items || []).map((item, i) =>
            '<tr>' +
            '<td style="text-align:center">' + (i + 1) + '</td>' +
            '<td>' + item.productName + (item.isCombined ? ' <i style="font-size:8px">(Combined)</i>' : '') + '</td>' +
            '<td style="text-align:center">' + (item.type || '') + '</td>' +
            '<td style="text-align:center;font-weight:600">' + item.qty + '</td>' +
            '<td style="text-align:right">' + formatCurrency(item.price) + '</td>' +
            '<td style="text-align:right;font-weight:600">' + formatCurrency(item.total) + '</td>' +
            '</tr>'
        ).join('');

        let summaryRows =
            '<tr><td>Total Quantity:</td><td style="text-align:right">' + invoice.totalQty + '</td></tr>' +
            '<tr><td>Sub Total:</td><td style="text-align:right">' + formatCurrency(invoice.subTotal) + '</td></tr>';

        if (invoice.discount > 0) {
            summaryRows += '<tr><td>Discount (' + (invoice.discountPercent || 0) + '%):</td><td style="text-align:right">- ' + formatCurrency(invoice.discount) + '</td></tr>';
        }
        if (invoice.rebate > 0) {
            summaryRows += '<tr><td>Rebate:</td><td style="text-align:right">- ' + formatCurrency(invoice.rebate) + '</td></tr>';
        }

        summaryRows +=
            '<tr class="grand-total"><td>Grand Total:</td><td style="text-align:right">' + formatCurrency(invoice.grandTotal) + '</td></tr>' +
            '<tr><td>Paid Amount:</td><td style="text-align:right">' + formatCurrency(invoice.paidAmount) + '</td></tr>' +
            '<tr><td>Current Due:</td><td style="text-align:right">' + formatCurrency(invoice.dues) + '</td></tr>';

        if (prevDues !== 0) {
            summaryRows +=
                '<tr><td>Previous Dues:</td><td style="text-align:right">' + formatCurrency(prevDues) + '</td></tr>' +
                '<tr class="net-payable"><td>Net Payable:</td><td style="text-align:right">' + formatCurrency(netPay) + '</td></tr>';
        }

        return '<html><head><title>Invoice - ' + invoice.invoiceNo + '</title>' +
            '<style>' +
            '* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
            'body { font-family:Arial,sans-serif; padding:10mm; color:#000; font-size:10px; line-height:1.3; background:#fff; }' +
            '@page { size:A4; margin:0; }' +
            '.clear { clear:both; }' +

            '.header { overflow:hidden; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:15px; }' +
            '.header-l { float:left; width:55%; }' +
            '.header-r { float:right; width:40%; text-align:right; }' +
            '.bname { font-size:18px; font-weight:700; text-transform:uppercase; }' +
            '.bdetails { font-size:9px; margin-top:2px; color:#333; }' +
            '.inv-title { font-size:20px; font-weight:700; margin-bottom:2px; }' +

            '.info { overflow:hidden; margin-bottom:12px; }' +
            '.info-l { float:left; width:55%; }' +
            '.info-r { float:right; width:40%; }' +
            '.slabel { font-size:9px; font-weight:700; text-transform:uppercase; border-bottom:1px solid #000; margin-bottom:4px; padding-bottom:2px; }' +
            '.sitem { margin-bottom:2px; font-size:10px; }' +
            '.sval { font-weight:600; }' +

            'table.items { width:100%; border-collapse:collapse; margin-bottom:8px; border:1.5px solid #000; }' +
            'table.items th { background:#f2f2f2 !important; font-weight:700; text-transform:uppercase; font-size:9px; padding:4px 5px; border:1px solid #000; }' +
            'table.items td { padding:4px 5px; font-size:10px; border:1px solid #000; }' +

            '.footer { overflow:hidden; margin-top:8px; }' +
            '.footer-l { float:left; width:52%; }' +
            '.footer-r { float:right; width:44%; }' +

            'table.summary { width:100%; border-collapse:collapse; }' +
            'table.summary td { padding:3px 4px; font-size:10px; border:none; border-bottom:1px dotted #ccc; }' +
            'table.summary .grand-total td { border-top:1px solid #000; border-bottom:2px solid #000; font-weight:700; font-size:11px; padding:5px 4px; }' +
            'table.summary .net-payable td { background:#f0f0f0 !important; font-weight:700; font-size:11px; padding:5px 4px; border:1px solid #000; }' +

            '.words { font-size:9px; padding:6px; border:1px solid #000; margin-top:8px; }' +
            '.words b { font-size:8px; text-transform:uppercase; }' +

            '.sigs { overflow:hidden; margin-top:55px; padding:0 15px; }' +
            '.sig-l { float:left; border-top:1px solid #000; width:140px; text-align:center; padding-top:5px; font-size:9px; }' +
            '.sig-r { float:right; border-top:1px solid #000; width:140px; text-align:center; padding-top:5px; font-size:9px; }' +

            'table.accsumm { width:100%; border-collapse:collapse; }' +
            'table.accsumm td { padding:2px 0; font-size:10px; border:none; border-bottom:1px dotted #ccc; }' +
            '</style></head><body>' +

            // HEADER
            '<div class="header">' +
            '<div class="header-l">' +
            '<div class="bname">' + brand + '</div>' +
            '<div class="bdetails">' + BrandingConfig.contact.address + '<br/>Phone: ' + BrandingConfig.contact.phone + '</div>' +
            '</div>' +
            '<div class="header-r">' +
            '<div class="inv-title">INVOICE</div>' +
            '<div><b>No:</b> ' + invoice.invoiceNo + '</div>' +
            '<div><b>Date:</b> ' + new Date(invoice.date).toLocaleDateString('en-GB') + '</div>' +
            '</div>' +
            '</div><div class="clear"></div>' +

            // INFO SECTION
            '<div class="info">' +
            '<div class="info-l">' +
            '<div class="slabel">Bill To</div>' +
            '<div class="sitem"><span class="sval" style="font-size:12px">' + customerName + '</span></div>' +
            (propName ? '<div class="sitem">Prop: ' + propName + '</div>' : '') +
            '<div class="sitem">' + address + '</div>' +
            '<div class="sitem">Phone: ' + phone + '</div>' +
            '</div>' +
            '<div class="info-r">' +
            '<div class="slabel">Account Summary</div>' +
            '<table class="accsumm"><tbody>' +
            '<tr><td>Previous Dues:</td><td style="text-align:right"><b>' + formatCurrency(prevDues) + '</b></td></tr>' +
            '<tr><td>Last Activity:</td><td style="text-align:right">' + lastActivity + '</td></tr>' +
            '</tbody></table>' +
            '</div>' +
            '</div><div class="clear"></div>' +

            // ITEMS TABLE
            '<table class="items">' +
            '<thead><tr>' +
            '<th style="width:25px">SL</th>' +
            '<th>Description / Items</th>' +
            '<th style="width:50px">Type</th>' +
            '<th style="width:40px;text-align:center">Qty</th>' +
            '<th style="width:70px;text-align:right">Rate</th>' +
            '<th style="width:80px;text-align:right">Amount</th>' +
            '</tr></thead>' +
            '<tbody>' + itemsHTML + '</tbody>' +
            '</table>' +

            // FOOTER
            '<div class="footer">' +
            '<div class="footer-l">' +
            '<div class="words">' +
            '<div><b>Invoice Amount in Words:</b><br/><i>' + numberToWords(invoice.grandTotal) + '</i></div>' +
            (netPay > 0 ? '<div style="margin-top:4px;border-top:1px solid #eee;padding-top:3px"><b>Total Net Payable in Words:</b><br/><i style="font-weight:600">' + numberToWords(netPay) + '</i></div>' : '') +
            '</div>' +
            (invoice.note ? '<div style="margin-top:8px;font-size:9px"><b>Note:</b> ' + invoice.note + '</div>' : '') +
            '</div>' +
            '<div class="footer-r">' +
            '<table class="summary"><tbody>' + summaryRows + '</tbody></table>' +
            '</div>' +
            '</div><div class="clear"></div>' +

            // SIGNATURES
            '<div class="sigs">' +
            '<div class="sig-l">Customer Signature</div>' +
            '<div class="sig-r">Authorized Signature</div>' +
            '</div>' +

            '</body></html>';
    };

    const getInvoiceHTML = () => buildInvoiceHTML();


    const handlePrint = () => {
        printHTML(getInvoiceHTML());
    };

    const handleExport = () => {
        exportToPDF(getInvoiceHTML(), `Invoice_${invoice.invoiceNo}`);
    };

    const handleShare = () => {
        const text = `*Invoice No: ${invoice.invoiceNo}*\nAmount: ${formatCurrency(invoice.grandTotal)}\nDate: ${new Date(invoice.date).toLocaleDateString()}\nShared via ${brand} System.`;
        shareToWhatsApp(getInvoiceHTML(), `Invoice_${invoice.invoiceNo}`, text);
    };

    const netPayable = invoice.dues + (invoice.previousDues || 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="invoice-print-modal" onClick={(e) => e.stopPropagation()}>
                <div className="invoice-print-header">
                    <h3>Invoice Preview</h3>
                    <div className="invoice-print-actions">
                        <button className="btn btn-secondary" onClick={handleExport}>
                            <FiDownload /> PDF
                        </button>
                        <button className="btn btn-success" onClick={handleShare}>
                            <FiShare2 /> WhatsApp
                        </button>
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
                            <div className="header-left">
                                <div className="brand-name">{brand}</div>
                                <div className="brand-details">
                                    {BrandingConfig.contact.address}<br />
                                    Phone: {BrandingConfig.contact.phone}
                                </div>
                            </div>
                            <div className="header-right">
                                <div className="invoice-title">INVOICE</div>
                                <div>
                                    <strong>No:</strong> {invoice.invoiceNo}<br />
                                    <strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-GB')}
                                </div>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="info-section">
                            <div className="info-bill-to">
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
                            <div className="info-summary">
                                <div className="section-label">Account Summary</div>
                                <table className="summary-table">
                                    <tbody>
                                        <tr>
                                            <td>Previous Dues:</td>
                                            <td className="text-right"><span className="info-val">{formatCurrency(invoice.previousDues || 0)}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Last Activity:</td>
                                            <td className="text-right"><span>{invoice.customer?.lastInvoiceDate ? new Date(invoice.customer.lastInvoiceDate).toLocaleDateString('en-GB') : 'N/A'}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
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
                            <div className="footer-left">
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

                            <div className="footer-right">
                                <table className="summary-table">
                                    <tbody>
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
                                        {(invoice.previousDues || 0) !== 0 && (
                                            <>
                                                <tr>
                                                    <td>Previous Dues:</td>
                                                    <td className="text-right">{formatCurrency(invoice.previousDues)}</td>
                                                </tr>
                                                <tr className="net-payable-row">
                                                    <td style={{ padding: '4px' }}>Net Payable:</td>
                                                    <td className="text-right" style={{ padding: '4px' }}>{formatCurrency(netPayable)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="signature-area">
                            <div className="signature-box">Customer Signature</div>
                            <div className="signature-box-right">Authorized Signature</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrint;
