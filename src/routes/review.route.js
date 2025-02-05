import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser,
    createReview,
    editReview, 
    deleteReview, 
    getTripReviews,
  } from "../controllers/review.controller.js";

const router = Router()

router.route("/list/tripId").get(getTripReviews);

//secured routes
router.route("/create").post(verifyJWT, createReview);
router.route("/edit:tripId").put(verifyJWT, editReview);
router.route("/delete:tripId").put(verifyJWT, deleteReview);


export default router