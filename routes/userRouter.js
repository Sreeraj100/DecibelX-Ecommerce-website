const express = require("express");
const router = express.Router();
const passport = require("passport");
const userAuth = require('../middlewares/userAuth');
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController")
const shopController = require('../controllers/user/shopController')
const profileController = require("../controllers/user/profileController")


router.get("/", userController.loadHome);

// Authentication Routes
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/otp", userController.otpPost);
router.get("/otpsend", userController.otpSend);
router.get("/otp",userController.otpPage)
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }));
router.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "http://localhost:3000/login" }),
  userController.googleCallback
);
router.post("/logout", userController.logout);
router.get("/about",userController.about)
router.get("/contact",userController.contact)
router.get("/profile",profileController.profile)
router.get("/blocked",userController.blockedUser)
router.get("/shop",shopController.loadShopping);
router.get('/product/:id',productController.singleProductView)


module.exports = router;
