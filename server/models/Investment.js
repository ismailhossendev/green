const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Fixed Asset', 'Cash', 'Other'],
        required: [true, 'Investment type is required']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    currentValue: {
        type: Number,
        default: 0
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
InvestmentSchema.index({ type: 1 });
InvestmentSchema.index({ date: -1 });

module.exports = mongoose.model('Investment', InvestmentSchema);
