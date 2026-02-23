const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    type: { type: String, enum: ['Product', 'Packet', 'Others'] },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    total: { type: Number, required: true }
});

const PurchaseSchema = new mongoose.Schema({
    purchaseNo: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    brand: { type: String, enum: ['Green Tel', 'Green Star'], required: true },
    items: [PurchaseItemSchema],
    totalQty: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dues: { type: Number, default: 0 },
    note: { type: String, trim: true },
    status: { type: String, enum: ['Pending', 'Received', 'Cancelled'], default: 'Received' },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

PurchaseSchema.pre('save', async function (next) {
    if (!this.purchaseNo) {
        const prefix = this.brand === 'Green Tel' ? 'PGT' : 'PGS';
        const count = await this.constructor.countDocuments({ brand: this.brand });
        this.purchaseNo = `${prefix}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

PurchaseSchema.index({ supplier: 1 });
PurchaseSchema.index({ brand: 1 });
PurchaseSchema.index({ date: -1 });

module.exports = mongoose.model('Purchase', PurchaseSchema);
