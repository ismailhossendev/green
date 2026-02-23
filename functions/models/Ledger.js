const mongoose = require('mongoose');

const LedgerSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    brand: { type: String, enum: ['Green Tel', 'Green Star', 'Ecommerce'], required: true },
    type: { type: String, enum: ['Invoice', 'Payment', 'Adjustment', 'Return', 'Replacement', 'Opening'], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceNo: { type: String, trim: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

LedgerSchema.index({ customer: 1 });
LedgerSchema.index({ brand: 1 });
LedgerSchema.index({ date: -1 });
LedgerSchema.index({ customer: 1, brand: 1, date: -1 });

module.exports = mongoose.model('Ledger', LedgerSchema);
