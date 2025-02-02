import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        trip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true
        },
        bookingDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled"],
            default: "pending"
        },
        totalPrice: {
            type: Number,
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending"
        }
    },
    { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
