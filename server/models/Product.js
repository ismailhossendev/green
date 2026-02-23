const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    modelName: {
        type: String,
        required: [true, 'Model name is required'],
        trim: true
    },
    brand: {
        type: String,
        enum: ['Green Tel', 'Green Star'],
        required: [true, 'Brand is required']
    },
    type: {
        type: String,
        enum: ['Product', 'Packet', 'Others'],
        required: [true, 'Product type is required']
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Purchase price is required'],
        default: 0
    },
    salesPrice: {
        type: Number,
        required: [true, 'Sales price is required'],
        default: 0
    },
    dealerPrice: {
        type: Number,
        default: 0
    },
    stock: {
        goodQty: { type: Number, default: 0 },
        badQty: { type: Number, default: 0 },
        damageQty: { type: Number, default: 0 },
        repairQty: { type: Number, default: 0 }
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual for total stock
ProductSchema.virtual('totalStock').get(function () {
    return this.stock.goodQty + this.stock.badQty + this.stock.damageQty + this.stock.repairQty;
});

// Virtual for stock value
ProductSchema.virtual('stockValue').get(function () {
    return this.stock.goodQty * this.purchasePrice;
});

// Index for better query performance
ProductSchema.index({ brand: 1, type: 1 });
ProductSchema.index({ modelName: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
