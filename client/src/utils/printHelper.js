export const printHTML = (htmlContent) => {
    const iframe = document.createElement('iframe');
    // Hide iframe but keep it rendering for print
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
    
    // Wait for images/fonts to load, then print
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Remove iframe after print dialog closes
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1000);
    }, 500);
};

// Import dynamically or normally. Since it's installed via npm, let's assume it's available.
import html2pdf from 'html2pdf.js';

export const exportToPDF = (htmlContent, filename) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;
    const opt = {
        margin: 5,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(wrapper).set(opt).save();
};

export const shareToWhatsApp = async (htmlContent, filename, whatsappText) => {
    try {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = htmlContent;
        const opt = {
            margin: 5,
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(wrapper).outputPdf('blob');
        const file = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: filename,
                text: whatsappText,
                files: [file]
            });
        } else {
            // Fallback: Just trigger PDF download and open WhatsApp Web
            exportToPDF(htmlContent, filename);
            setTimeout(() => {
                const encodedText = encodeURIComponent(whatsappText);
                window.open(`https://wa.me/?text=${encodedText}`, '_blank');
            }, 1000);
        }
    } catch (err) {
        console.error('Share failed', err);
        // Deep fallback
        const encodedText = encodeURIComponent(whatsappText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
};
