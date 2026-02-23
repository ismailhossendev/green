const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Purchase', 'Supplier', 'Employee', 'Dealer', 'Customer', 'Loan', 'Others'],
        required: [true, 'Payment type is required']
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['Purchase', 'Supplier', 'User', 'Customer', 'Loan', null]
    },
    referenceName: {
        type: String,
        trim: true
    },
    referenceNo: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank', 'Mobile Banking', 'Cheque', 'Other'],
        default: 'Cash'
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
PaymentSchema.index({ type: 1 });
PaymentSchema.index({ referenceId: 1 });
PaymentSchema.index({ date: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
