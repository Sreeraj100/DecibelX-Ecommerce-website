const express = require("express");
const router = express.Router();
const passport = require("passport");
const userAuth = require('../middlewares/userAuth');
const userController = require("../controllers/user/userController");
// const productController = require("../controllers/user/productController")
// const shopController = require('../controllers/user/shopController')
const profileController = require("../controllers/user/profileController")


// Error Handling Route-------------------------------
// router.get("/pageNotFound", userController.pageNotFound);

router.get("/", userController.loadHome);
// router.get("/shop", userController.loadShopping);

// Authentication Routes
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/otp", userController.otpPost);
router.get("/otpsend", userController.otpSend);
router.get("/otp",userController.otpPage)
router.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", {failureRedirect: "/login?message=User is blocked by admin",}),(req, res) => {req.session.user = req.user;res.redirect("/");});
router.post("/logout", userController.logout);
router.get("/about",userController.about)
router.get("/profile",profileController.profile)


module.exports = router;
