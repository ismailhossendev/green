const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        type: Date
    },
    checkOut: {
        type: Date
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    photoUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Late', 'Leave', 'Half Day'],
        default: 'Present'
    },
    note: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Compound index for unique attendance per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
