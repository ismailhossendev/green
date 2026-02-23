const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Manager', 'Staff', 'Sales', 'Dealer', 'Customer'],
        default: 'Staff'
    },
    designation: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    area: {
        type: String,
        trim: true
    },
    joiningDate: {
        type: Date,
        default: Date.now
    },
    salary: {
        type: Number,
        default: 0
    },
    taDA: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Terminated', 'Resigned'],
        default: 'Active'
    },
    salesTarget: {
        type: Number,
        default: 0
    },
    loanBalance: {
        type: Number,
        default: 0
    },
    avatar: {
        type: String
    }
}, {
    timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
