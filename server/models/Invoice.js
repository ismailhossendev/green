const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Product', 'Packet', 'Others']
    },
    qty: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    isCombined: {
        type: Boolean,
        default: false
    }
});

const InvoiceSchema = new mongoose.Schema({
    invoiceNo: {
        type: String,
        required: true,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    brand: {
        type: String,
        enum: ['Green Tel', 'Green Star'],
        required: true
    },
    priceType: {
        type: String,
        enum: ['Retail', 'Dealer'],
        default: 'Retail'
    },
    items: [InvoiceItemSchema],
    // Totals
    totalQty: {
        type: Number,
        required: true
    },
    subTotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    discountFixed: {
        type: Number,
        default: 0
    },
    discountPercent: {
        type: Number,
        default: 0
    },
    rebate: {
        type: Number,
        default: 0
    },
    previousDues: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    dues: {
        type: Number,
        default: 0
    },
    note: {
        type: String,
        trim: true
    },
    // Status
    status: {
        type: String,
        enum: ['Draft', 'Confirmed', 'Cancelled'],
        default: 'Confirmed'
    },
    date: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate invoice number
InvoiceSchema.pre('validate', async function (next) {
    if (!this.invoiceNo) {
        const prefix = this.brand === 'Green Tel' ? 'GT' : 'GS';
        const lastInvoice = await this.constructor.findOne({ brand: this.brand })
            .sort({ createdAt: -1 })
            .select('invoiceNo');

        let nextNum = 1;
        if (lastInvoice && lastInvoice.invoiceNo) {
            const match = lastInvoice.invoiceNo.match(/(\d+)$/);
            if (match) {
                nextNum = parseInt(match[1]) + 1;
            }
        }
        this.invoiceNo = `${prefix}-${String(nextNum).padStart(6, '0')}`;
    }
    next();
});

// Indexes
InvoiceSchema.index({ customer: 1 });
InvoiceSchema.index({ brand: 1 });
InvoiceSchema.index({ date: -1 });
InvoiceSchema.index({ invoiceNo: 1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
