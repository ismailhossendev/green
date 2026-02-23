const mongoose = require('mongoose');

const SalesTargetSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    targetAmount: {
        type: Number,
        required: true,
        default: 0
    },
    targetQty: {
        type: Number,
        default: 0
    },
    achievedAmount: {
        type: Number,
        default: 0
    },
    achievedQty: {
        type: Number,
        default: 0
    },
    collectionTarget: {
        type: Number,
        default: 0
    },
    achievedCollection: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for unique target per employee per month
SalesTargetSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

// Virtual for achievement percentage
SalesTargetSchema.virtual('achievementPercent').get(function () {
    if (this.targetAmount === 0) return 0;
    return ((this.achievedAmount / this.targetAmount) * 100).toFixed(2);
});

module.exports = mongoose.model('SalesTarget', SalesTargetSchema);
