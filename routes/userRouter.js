const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const {userAuth,adminAuth}=require("../middlewares/auth");

router.get("/pageNotFound", userController.pageNotFound);
router.get("/", userController.loadHomepage);
router.get("/shop",userController.loadShopping);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login?message=User is blocked by admin",
  }),
  (req, res) => {
    req.session.user = req.user;
    res.redirect("/");
  }
);


//login
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get('/logout', userController.logout);


module.exports = router;
