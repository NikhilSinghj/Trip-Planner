import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser,
         loginUser,
         logoutUser,
         uploadAvatar,
       } from "../controllers/user.controller.js";

const router = Router()

router.route("/register").post(registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/profile-picture").put(verifyJWT, upload.single("avatar"), uploadAvatar);


export default router