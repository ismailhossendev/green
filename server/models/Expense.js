const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['Green Tel', 'Green Star', 'Courier', 'Repair', 'Stationary', 'Office', 'Staff'],
        required: [true, 'Category is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    reference: {
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
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
