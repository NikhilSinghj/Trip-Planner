import asyncHandler from "express-async-handler";
import { Review } from "../models/review.model.js";
import Trip from "../models/trip.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

// Helper function to check if a value is null or undefined
const isInvalid = (value) => value === undefined || value === null || value === "";

// Create a review
const createReview = asyncHandler(async (req, res) => {
    const { tripId, rating, comment } = req.body;
    const userId = req.user.id; // Assuming `req.user.id` comes from JWT

    // Validate required fields
    if (isInvalid(tripId) || isInvalid(rating) || isInvalid(comment)) {
        return res.status(400).json({ error: "All fields (tripId, rating, comment) are required and cannot be null or empty" });
    }

    // Check if the user has already submitted a review for this trip
    const existingReview = await Review.findOne({ user: userId, trip: tripId });

    if (existingReview) {
        return res.status(400).json({ error: "You have already Reviewed." });
    }

    // Ensure rating is within valid range
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Validate trip existence
    const trip = await Trip.findById(tripId);
    if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
    }

    // Create a new review
    const newReview = new Review({
        user: userId,
        trip: tripId,
        rating,
        comment,
    });

    await newReview.save();

    return res.status(201).json({
        message: "Review created successfully",
        review: newReview,
    });
});

// Edit a review
const editReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id; // Assuming `req.user.id` comes from JWT

    // Validate at least one field is provided and not null
    if (isInvalid(rating) && isInvalid(comment)) {
        return res.status(400).json({ error: "At least one field (rating or comment) must be provided for update" });
    }

    // Ensure rating is within valid range if provided
    if (!isInvalid(rating) && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Find the review
    const review = await Review.findById(reviewId);

    if (!review) {
        return res.status(404).json({ error: "Review not found" });
    }

    // Check if the review belongs to the user
    if (review.user.toString() !== userId) {
        return res.status(403).json({ error: "Not authorised" });
    }

    // Update the review
    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();

    return res.status(200).json({
        message: "Review updated successfully",
        review,
    });
});

// Delete a review
const deleteReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user.id; // Assuming `req.user.id` comes from JWT

    // Find the review
    const review = await Review.findById(reviewId);

    if (!review) {
        return res.status(404).json({ error: "Review not found" });
    }

    // Check if the review belongs to the user
    if (review.user.toString() !== userId) {
        return res.status(403).json({ error: "Not authorised" });
    }

    // Delete the review
    await review.remove();

    return res.status(200).json({
        message: "Review deleted successfully",
    });
});

const getTripReviews = asyncHandler(async (req, res) => {
    try {
        const { tripId } = req.params;

        // Validate trip ID
        if (!mongoose.Types.ObjectId.isValid(tripId)) {
            return res.status(400).json({ error: "Invalid trip ID" });
        }

        // Check if the trip exists
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({ error: "Trip not found" });
        }

        // Fetch all reviews for this trip with user details
        const reviews = await Review.find({ trip: tripId })
            .populate({
                path: "user",
                select: "fullName avatar", // Fetch user's name and avatar
            })
            .sort({ createdAt: -1 }); // Sort by latest reviews first

        // Calculate average rating
        const avgRatingResult = await Review.aggregate([
            { $match: { trip: new mongoose.Types.ObjectId(tripId) } },
            {
                $group: {
                    _id: "$trip",
                    averageRating: { $avg: "$rating" },
                },
            },
        ]);

        const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].averageRating.toFixed(2) : "N/A";

        // Format response
        const formattedReviews = reviews.map((review) => ({
            id: review._id,
            user: {
                id: review.user._id,
                fullName: review.user.fullName,
                avatar: review.user.avatar,
            },
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
        }));

        return res.json({
            trip: {
                id: trip._id,
                name: trip.name,
                averageRating: avgRating,
            },
            totalReviews: reviews.length,
            reviews: formattedReviews,
        });

    } catch (error) {
        console.error("Error fetching trip reviews:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export { 
    createReview, 
    editReview, 
    deleteReview, 
    getTripReviews,
};
