const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    companyName: { type: String, trim: true },
    name: { type: String, required: [true, 'Customer name is required'], trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    district: { type: String, trim: true },
    brand: { type: String, enum: ['Green Tel', 'Green Star', 'Both'], default: 'Both' },
    type: { type: String, enum: ['Retail', 'Dealer', 'Ecommerce'], default: 'Retail' },
    totalSalesQty: { type: Number, default: 0 },
    totalSalesAmount: { type: Number, default: 0 },
    totalPayment: { type: Number, default: 0 },
    totalAdjust: { type: Number, default: 0 },
    totalDues: { type: Number, default: 0 },
    lastInvoiceNo: String,
    lastInvoiceQty: Number,
    lastInvoiceAmount: Number,
    lastInvoiceDate: Date,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

CustomerSchema.index({ district: 1 });
CustomerSchema.index({ brand: 1 });
CustomerSchema.index({ type: 1 });
CustomerSchema.index({ name: 'text' });

module.exports = mongoose.model('Customer', CustomerSchema);
