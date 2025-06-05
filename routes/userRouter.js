const express = require("express");
const router = express.Router();
const passport = require("passport");
const userAuth = require('../middlewares/userAuth');
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const shopController = require("../controllers/user/shopController");
const profileController = require("../controllers/user/profileController");
const wishlistController = require("../controllers/user/wishlistController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const walletController = require("../controllers/user/walletController");



// Public Routes 
router.get("/", userController.loadHome);
router.get("/about", userController.about);
router.get("/contact", userController.contact);
router.get("/shop", shopController.loadShopping);
router.get('/product/:id', productController.singleProductView);
router.get("/blocked", userController.blockedUser);

// Authentication Routes
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.get("/otp", userController.otpPage);
router.post("/otp", userController.otpPost);
router.get("/otpsend", userController.otpSend);
router.post("/logout", userController.logout);

// Google Auth
router.get("/auth/google", passport.authenticate("google", { 
  scope: ["profile", "email"], 
  prompt: "select_account" 
}));
router.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "http://decibelx.shop/login" }),
  userController.googleCallback
);

// email
router.get('/edit-email', userAuth,profileController.editEmail );
router.post('/send-email-otp', userAuth,profileController.sendEmailOTP);
router.post('/verify-email-otp', userAuth,profileController.verifyEmailOTP);
router.get('/verify-email-otp',userAuth,profileController.verifyEmailOtp);

// Password 
router.get("/forgotPassword", userController.forgotPassword);
router.post("/forgotPassword", userController.forgotPasswordPost);
router.get("/verifyOtpGet", userController.verifyOtpGet);
router.post("/verifyOtppost", userController.verifyOtppost);
router.get("/resendForgotOtp", userController.resendForgotOtp);
router.post("/resendForgotOtp", userController.resendForgotOtp);
router.get("/resetPassword", userController.resetPasswordPage);
router.post("/resetPassword", userController.resetPasswordPost);


// Profile 
router.get("/profile", userAuth, profileController.profile);
router.patch("/changePassword", userAuth, profileController.changePassword);
router.patch('/editProfile', userAuth, profileController.editProfile);

// Address 
router.get('/address', userAuth, profileController.addressPage);
router.get('/address/:id', userAuth, profileController.getAddressById);
router.post('/addAddress', userAuth, profileController.addAddressPost);
router.put('/address/:id', userAuth, profileController.editAddressPut);
router.delete('/deleteAddress/:id', userAuth, profileController.deleteAddress);
router.patch('/address/:id/default', userAuth, profileController.setDefaultAddress);

// Wishlist 
router.get('/wishlist', userAuth, wishlistController.wishlistPage);
router.post('/wishlist', userAuth, wishlistController.editWishlist);
router.delete('/removeWishlist', userAuth, wishlistController.deleteProduct);
router.post('/addAlltocart', userAuth, wishlistController.addAlltoCart);

// Cart 
router.get('/cart', userAuth, cartController.cartView);
router.post('/cartAdd', userAuth, cartController.addToCart);
router.delete('/cartRemove/:id', userAuth, cartController.removeItem);
router.put('/cartUpdate/:id', userAuth, cartController.updateQuantity);

// Checkout 
router.get('/checkout', userAuth, checkoutController.checkoutPageOne);
router.post('/checkout', userAuth, checkoutController.checkoutOnePost);
router.get('/payment', userAuth, checkoutController.paymentPage);
router.post('/payment', userAuth, checkoutController.paymentMethod);
router.get('/review', userAuth, checkoutController.finalReview);
router.post('/place-order', userAuth, checkoutController.placeOrder);
router.get('/order-confirmation', userAuth, checkoutController.confirmPage);
router.post('/apply-coupon', userAuth, checkoutController.applyCoupon);
router.post('/remove-coupon', userAuth, checkoutController.removeCoupon);
router.post('/create-razorpay-order', userAuth, checkoutController.createRazorpayOrder);
router.post('/verify-payment', userAuth, checkoutController.verifyPayment);
router.post('/place-failed-order',userAuth, checkoutController.placeFailedOrder);
router.get('/payment-failed',userAuth, checkoutController.paymentFailedPage);

// orders
router.get('/orders', userAuth, orderController.orders)
router.get('/orderview/:id', userAuth, orderController.userOrderView)
router.get('/download-invoice/:id', userAuth, orderController.downloadInvoice)
router.post('/cancelOrder/:id', userAuth, orderController.cancelOrder)
router.post('/returnOrder/:id', userAuth, orderController.returnOrder)
router.post('/update-payment-status/:orderId', checkoutController.updatePaymentStatus);

// wallet
router.get('/wallet', userAuth, walletController.walletPage)
router.post('/add-money', userAuth, walletController.addMoneyToWallet);
router.post('/wallet/verify-payment', userAuth, walletController.verifyWalletPayment);
module.exports = router;