
import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
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
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },
        comment: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

export const Review = mongoose.model("Review", reviewSchema);
