const mongoose = require('mongoose');

const ReplacementSchema = new mongoose.Schema({
    replacementNo: { type: String, unique: true },
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    brand: { type: String, enum: ['Green Tel', 'Green Star'], required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        claimedQty: { type: Number, required: true },
        goodQty: { type: Number, default: 0 },
        repairableQty: { type: Number, default: 0 },
        badQty: { type: Number, default: 0 },
        damageQty: { type: Number, default: 0 },
        rejectedQty: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 }
    }],
    totalClaimed: { type: Number, default: 0 },
    totalGood: { type: Number, default: 0 },
    totalRepairable: { type: Number, default: 0 },
    totalBad: { type: Number, default: 0 },
    totalDamage: { type: Number, default: 0 },
    totalRejected: { type: Number, default: 0 },
    repairDetails: {
        sentDate: Date,
        receivedDate: Date,
        highCostQty: { type: Number, default: 0 },
        lowCostQty: { type: Number, default: 0 },
        totalRepairCost: { type: Number, default: 0 },
        repairNote: String
    },
    status: { type: String, enum: ['Pending', 'Checked', 'Sent to Factory', 'Repaired', 'Closed'], default: 'Pending' },
    isLedgerAdjusted: { type: Boolean, default: false },
    isStockAdded: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ReplacementSchema.pre('save', async function (next) {
    if (!this.replacementNo) {
        const count = await mongoose.model('Replacement').countDocuments();
        const prefix = this.brand === 'Green Tel' ? 'GT-RPL' : 'GS-RPL';
        this.replacementNo = `${prefix}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

ReplacementSchema.index({ dealer: 1 });
ReplacementSchema.index({ brand: 1 });
ReplacementSchema.index({ status: 1 });
ReplacementSchema.index({ replacementNo: 1 });

module.exports = mongoose.model('Replacement', ReplacementSchema);
