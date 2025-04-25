const express = require("express");
const router = express.Router();
const passport = require("passport");
const userAuth = require('../middlewares/userAuth');
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController")
const shopController = require('../controllers/user/shopController')
const profileController = require("../controllers/user/profileController");
const wishlistController = require("../controllers/user/wishlistController");
const cartController = require("../controllers/user/cartController");


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
router.post("/logout", userController.logout)
router.get("/about",userController.about)
router.get("/contact",userController.contact)
router.get("/profile",profileController.profile)
router.get("/blocked",userController.blockedUser)
router.get("/shop",shopController.loadShopping);
router.get('/product/:id',productController.singleProductView)
router.get("/forgotPassword",userController.forgotPassword) 
router.post("/forgotPassword", userController.forgotPasswordPost)
router.get("/verifyOtpGet",userController.verifyOtpGet)
 
router.post("/verifyOtppost", userController.verifyOtppost)
router.get("/resendForgotOtp",userController.resendForgotOtp)
router.get("/resetPassword", userController.resetPasswordPage)
router.post("/resetPassword", userController.resetPasswordPost)
router.post("/resendForgotOtp", userController.resendForgotOtp)

router.patch("/changePassword",userAuth,profileController.changePassword) 
router.get('/address', userAuth, profileController.addressPage)
router.get('/address/:id', userAuth, profileController.getAddressById)
router.post('/addAddress', userAuth, profileController.addAddressPost)
router.put('/address/:id', userAuth, profileController.editAddressPut)
router.delete('/deleteAddress/:id', userAuth, profileController.deleteAddress)
router.patch('/editProfile', userAuth, profileController.editProfile)
router.patch('/address/:id/default', userAuth, profileController.setDefaultAddress)

// wishlist
router.get('/wishlist', userAuth,wishlistController.wishlistPage)
router.post('/wishlist', userAuth, wishlistController.editWishlist);
router.delete('/removeWishlist',userAuth,wishlistController.deleteProduct)
router.post('/addAlltocart', userAuth, wishlistController.addAlltoCart)

// cart 
router.get('/cart', userAuth,cartController.cartView);
router.post('/cartAdd', userAuth,cartController.addToCart);
router.delete('/cartRemove/:id', userAuth,cartController.removeItem);
router.put('/cartUpdate/:id', userAuth,cartController.updateQuantity);





module.exports = router; 
