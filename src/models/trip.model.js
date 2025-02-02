import mongoose, { Schema } from "mongoose";

const tripSchema = new Schema(
    {
        place: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        duration: {
            type: Number, // In days
            required: true
        },
        guide: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Reference to Guide
            required: true
        },
        images: [String], // Array of image URLs
        maxPeople: {
            type: Number,
            required: true
        },
        ratings: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Trip = mongoose.model("Trip", tripSchema);
