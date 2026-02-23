const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Personal', 'Office', 'Bank', 'Employee'],
        required: [true, 'Loan type is required']
    },
    borrower: {
        type: String,
        required: [true, 'Borrower name is required'],
        trim: true
    },
    borrowerRef: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'borrowerRefModel'
    },
    borrowerRefModel: {
        type: String,
        enum: ['User', 'Customer', null]
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    remainingAmount: {
        type: Number,
        default: 0
    },
    interestRate: {
        type: Number,
        default: 0
    },
    conditions: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Paid', 'Defaulted'],
        default: 'Active'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Calculate remaining amount
LoanSchema.pre('save', function (next) {
    this.remainingAmount = this.amount - this.paidAmount;
    if (this.remainingAmount <= 0) {
        this.status = 'Paid';
    }
    next();
});

// Indexes
LoanSchema.index({ type: 1 });
LoanSchema.index({ status: 1 });

module.exports = mongoose.model('Loan', LoanSchema);
