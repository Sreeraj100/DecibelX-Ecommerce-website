const cart = require("../../models/cartSchema");
const usercollection = require("../../models/userSchema");
const address = require("../../models/addressSchema");
const product = require("../../models/productSchema");
const AppError = require('../../middlewares/errorHandling');
const order = require("../../models/orderSchema");
const fs = require("fs");

// Helper function to generate order ID
function generateOrderID() {
  let randomLetters = "";
  for (let i = 0; i < 3; i++) {
    randomLetters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `${randomLetters}-${datePart}-${randomPart}`;
}

// Checkout Step 1 - GET (Shipping Address)
const checkoutPageOne = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const addressCollection = await address.find({ userId: userVer._id });

    const cartItems = await cart.find({ userId: userVer._id });
    if (!cartItems || cartItems.length === 0) {
      return res.redirect("/cart");
    }
    return res.render("checkout_1", {
      userVer,
      addresses: addressCollection,
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

// Checkout Step 1 - POST (Process Address Selection)
const checkoutOnePost = async (req, res, next) => {
  try {
   
    req.session.addressId = req.body.address;
    req.session.name = req.body.name;
    req.session.phone = req.body.phone;
    
    return res.redirect("/payment");
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

// Checkout Step 2 - GET (Payment Method)
const paymentPage = async (req, res,next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);

    // Add .populate('productId') to get product details
    const cartItems = await cart
      .find({ userId: userVer._id })
      .populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.redirect("/cart");
    }

    // Calculate total amount
    let subtotal = 0;
    cartItems.forEach((item) => {
      // Now item.productId will be the full product document
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });

    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    req.session.cartTotal = total;

    return res.render("checkout_2", {
      user: userVer,
      address: selectedAddress,
      allowCOD: total <= 10000,
      cartTotal: total, 
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

// Checkout Step 2 - POST (Process Payment Method)
const paymentMethod = async (req, res,next) => {
  try {
    const { payment } = req.body;

    // Check if COD is selected for order > ₹10,000
    if (payment === "Cash on delivery" && req.session.cartTotal > 10000) {
      return res.status(400).json({
        success: false,
        message: "Cash on Delivery not available for orders above ₹10,000",
      });
    }

    req.session.paymentMethod = payment;
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

// Checkout Step 3 - GET (Order Review)
const finalReview = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);
    const cartItems = await cart
      .find({ userId: userVer._id })
      .populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.redirect("/cart");
    }

    // Calculate totals
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    return res.render("checkout_3", {
      user: userVer,
      address: selectedAddress,
      paymentMethod: req.session.paymentMethod,
      cartItems,
      subtotal,
      tax,
      total,
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

// Checkout Step 3 - POST (Place Order)
const placeOrder = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);
    const cartItems = await cart
      .find({ userId: userVer._id })
      .populate("productId");

    // Prepare order details
    const orderId = generateOrderID();
    const products = cartItems.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      productPrice: item.productId.productOfferPrice,
      quantity: item.productQuantity,
    }));

    // Calculate totals
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    // Create new order
    const newOrder = new order({
      userId: userVer._id,
      fullName: req.session.name,
      phone: req.session.phone,
      email: req.session.email,
      orderId,
      address: {
        doorNo: selectedAddress.doorNo,
        street: selectedAddress.street,
        city: selectedAddress.city,
        district: selectedAddress.district,
        pinCode: selectedAddress.pinCode,
      },
      paymentMethod: req.session.paymentMethod,
      products,
      priceDetails: {
        subtotal,
        tax,
        total,
      },
      status: "Ordered",
    });

    // Save order and clear cart
    await newOrder.save();
    await cart.deleteMany({ userId: userVer._id });

    // Update product stocks
    for (const item of cartItems) {
      await product.findByIdAndUpdate(item.productId._id, {
        $inc: { productStock: -item.productQuantity },
      });
    }

    // Clear session data
    req.session.orderId = newOrder.orderId;
    req.session.addressId = null;
    req.session.paymentMethod = null;

    return res.json({ success: true, orderId: newOrder.orderId });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

// Order Confirmation Page
const confirmPage = async (req, res, next) => {
  try {
    if (req.session.orderId) {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      const orderDetails = await order.findOne({
        orderId: req.session.orderId,
      });
      const name = userVer.name;
      return res.render("orderConfirmation", {
        user: userVer,
        name,
        order: orderDetails,
      });
    } else {
      return res.redirect("/shop");
    }
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

module.exports = {
  checkoutPageOne,
  checkoutOnePost,
  paymentPage,
  paymentMethod,
  finalReview,
  placeOrder,
  confirmPage,
};
