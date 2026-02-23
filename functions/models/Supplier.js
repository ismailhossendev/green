const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Supplier name is required'], trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    type: { type: String, enum: ['Product', 'Packet', 'Others'], default: 'Product' },
    totalPurchaseAmount: { type: Number, default: 0 },
    totalPayment: { type: Number, default: 0 },
    totalDues: { type: Number, default: 0 },
    lastPurchaseNo: String,
    lastPurchaseAmount: Number,
    lastPurchaseDate: Date,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

SupplierSchema.index({ type: 1 });
SupplierSchema.index({ name: 'text' });

module.exports = mongoose.model('Supplier', SupplierSchema);
