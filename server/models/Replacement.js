const mongoose = require('mongoose');

// Item schema for each product in replacement
const ReplacementItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    goodQty: {
        type: Number,
        default: 0
    },
    badQty: {
        type: Number,
        default: 0
    },
    damageQty: {
        type: Number,
        default: 0
    },
    repairQty: {
        type: Number,
        default: 0
    },
    totalQty: {
        type: Number,
        default: 0
    }
});

const ReplacementSchema = new mongoose.Schema({
    replacementNo: {
        type: String,
        unique: true
    },
    dealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    brand: {
        type: String,
        enum: ['Green Tel', 'Green Star'],
        required: true
    },
    // Multiple products
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        // Stage 1: Initial Claim
        claimedQty: {
            type: Number,
            required: true
        },
        // Stage 2: Triage Results
        goodQty: {
            type: Number,
            default: 0
        },
        repairableQty: {
            type: Number,
            default: 0
        },
        badQty: {
            type: Number,
            default: 0
        },
        damageQty: {
            type: Number,
            default: 0
        },
        rejectedQty: { // Kept for legacy/generic rejection if needed, but UI will likely use bad/damage
            type: Number,
            default: 0
        },
        // Snapshot for Ledger
        unitPrice: {
            type: Number,
            default: 0
        }
    }],

    // Totals
    totalClaimed: { type: Number, default: 0 },
    totalGood: { type: Number, default: 0 },
    totalRepairable: { type: Number, default: 0 },
    totalBad: { type: Number, default: 0 },
    totalDamage: { type: Number, default: 0 },
    totalRejected: { type: Number, default: 0 },

    // Factory / Repair Details (Stage 3)
    repairDetails: {
        sentDate: Date,
        receivedDate: Date,
        highCostQty: { type: Number, default: 0 }, // Major repairs (e.g. PCB)
        lowCostQty: { type: Number, default: 0 },  // Minor repairs
        totalRepairCost: { type: Number, default: 0 },
        repairNote: String
    },

    // Status flags
    status: {
        type: String,
        enum: ['Pending', 'Checked', 'Sent to Factory', 'Repaired', 'Closed'],
        default: 'Pending'
    },

    // Flags to prevent double processing
    isLedgerAdjusted: { type: Boolean, default: false }, // Happened at 'Checked' stage
    isStockAdded: { type: Boolean, default: false }, // Happened at 'Checked' (Good) + 'Repaired' (Factory)

    date: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate replacement number before save
ReplacementSchema.pre('save', async function (next) {
    if (!this.replacementNo) {
        const count = await mongoose.model('Replacement').countDocuments();
        const prefix = this.brand === 'Green Tel' ? 'GT-RPL' : 'GS-RPL';
        this.replacementNo = `${prefix}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Indexes
ReplacementSchema.index({ dealer: 1 });
ReplacementSchema.index({ brand: 1 });
ReplacementSchema.index({ status: 1 });
ReplacementSchema.index({ replacementNo: 1 });

module.exports = mongoose.model('Replacement', ReplacementSchema);
