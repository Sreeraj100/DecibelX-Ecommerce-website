const cart = require("../../models/cartSchema");
const usercollection = require("../../models/userSchema");
const address = require("../../models/addressSchema");
const product = require("../../models/productSchema");
const AppError = require('../../middlewares/errorHandling');
const order = require("../../models/orderSchema");
const fs = require("fs");
const env= require('dotenv').config();
const category = require("../../models/categorySchema");
const offer = require("../../models/offerSchema");
const Coupon = require("../../models/couponSchema");
const wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const Razorpay = require('razorpay');
const crypto = require('crypto');
function generateOrderID() {
  let randomLetters = "";
  for (let i = 0; i < 3; i++) {
    randomLetters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `${randomLetters}-${datePart}-${randomPart}`;
}
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function calculatePricesWithOffers(cartItems, coupon = null) {
  const currentDate = new Date();
  

  const listedCategories = await category.find({ isListed: true });
  const listedCategoryIds = listedCategories.map(cat => cat._id);
  const activeOffers = await offer.find({
    startDate: { $lte: currentDate },
    expiryDate: { $gte: currentDate },
    categoryId: { $in: listedCategoryIds }
  });

  let subtotal = 0;
  
  for (const item of cartItems) {
    const product = item.productId;
    const prices = [product.productPrice];
    
    if (product.productOfferPrice > 0) {
      prices.push(product.productOfferPrice);
    }

    const categoryOffer = activeOffers.find(offer => 
      offer.categoryId && 
      offer.categoryId.toString() === product.productCategoryId.toString()
    );

    if (categoryOffer) {
      const discountedPrice = product.productPrice * (1 - categoryOffer.offerPercentage / 100);
      prices.push(Number(discountedPrice.toFixed(2)));
    }

    product.productOfferPrice = Math.min(...prices);
    
    subtotal += product.productOfferPrice * item.productQuantity;
  }

  const taxRate = 0.18;
  const tax = subtotal * taxRate;
  

  let couponDiscount = 0;
  if (coupon) {
    couponDiscount = subtotal * coupon.percentage / 100;
    couponDiscount = Math.min(couponDiscount, subtotal);
  }
  
  const total = subtotal + tax - couponDiscount;

  return { 
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    couponDiscount: parseFloat(couponDiscount.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

// Create Razorpay order
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount provided"
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      payment_capture: 1 // Auto-capture payment
    };

    // Using promises instead of callbacks
    const order = await razorpayInstance.orders.create(options);
    
    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    next(new AppError('Failed to create payment order', 500));
  }
};
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      // Store payment details in session
      req.session.paymentDetails = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paymentMethod: 'Razorpay'
      };
      
      return res.json({ 
        success: true,
        paymentId: razorpay_payment_id
      });
    }

    return res.status(400).json({ 
      success: false,
      message: "Payment verification failed"
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    next(new AppError('Payment verification failed', 500));
  }
};
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
    next(new AppError('Sorry...Something went wrong', 500));
  }
};


const checkoutOnePost = async (req, res, next) => {
  try {
    req.session.addressId = req.body.address;
    req.session.name = req.body.name;
    req.session.phone = req.body.phone;
    
    return res.redirect("/payment");
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const paymentPage = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);
    const phone =  req.session.phone
    const name = req.session.name
    const cartItems = await cart
      .find({ userId: userVer._id })
      .populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.redirect("/cart");
    }

    const wal = await wallet.findOne({ userId: userVer._id})
    let walBal=0
    if(wal){
      walBal= wal.walletBalance
    }
   
    const couponDetails = req.session.couponDetails || null;
    const { total } = await calculatePricesWithOffers(cartItems, couponDetails);
    req.session.cartTotal = total;

    return res.render("checkout_2", {
      user: userVer,
      walBal,
      name,
      phone,
      address: selectedAddress,
      allowCOD: total <= 10000,
      allowWallet: walBal > total,
      cartTotal: total,
      razorpayKey: process.env.RAZORPAY_KEY_ID // Add your key to .env
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};
const paymentMethod = async (req, res, next) => {
  try {
    const { payment } = req.body;
    
    // if (payment === "Cash on delivery" && req.session.cartTotal > 10000) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cash on Delivery not available for orders above ₹10,000",
    //   });
    // }

    req.session.paymentMethod = payment;
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

// Apply coupon to order
const applyCoupon = async (req, res, next) => {
  try {
    const { couponCode } = req.body;
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const cartItems = await cart.find({ userId: userVer._id }).populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Calculate subtotal with offers
    const { subtotal, tax } = await calculatePricesWithOffers(cartItems);

    // Find valid coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
      $or: [
        { usedBy: { $ne: userVer._id } },
        { usedBy: { $exists: false } }
      ]
    });

    if (!coupon) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired coupon" 
      });
    }

    // Check minimum purchase requirement
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum purchase of ₹${coupon.minPurchase} required for this coupon` 
      });
    }

    // Calculate discount
    const discountAmount = (subtotal * coupon.percentage / 100).toFixed(2);
    const total = (subtotal + tax - discountAmount).toFixed(2);

    // Store coupon details in session
    req.session.couponDetails = {
      code: coupon.code,
      percentage: coupon.percentage,
      discountAmount: parseFloat(discountAmount),
      couponId: coupon._id
    };

    return res.json({
      success: true,
      coupon: req.session.couponDetails,
      priceDetails: {
        subtotal,
        tax,
        couponDiscount: parseFloat(discountAmount),
        total: parseFloat(total)
      }
    });

  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

// Remove coupon from order
const removeCoupon = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const cartItems = await cart.find({ userId: userVer._id }).populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Calculate totals without coupon
    const { subtotal, tax, total } = await calculatePricesWithOffers(cartItems);

    // Remove coupon from session
    delete req.session.couponDetails;

    return res.json({
      success: true,
      priceDetails: {
        subtotal,
        tax,
        couponDiscount: 0,
        total
      }
    });

  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

// Checkout Step 3 - GET (Order Review)
const finalReview = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);
    const phone =  req.session.phone
    const name = req.session.name
    const cartItems = await cart
      .find({ userId: userVer._id })
      .populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.redirect("/cart");
    }

    // Calculate totals with offers and coupon
    const couponDetails = req.session.couponDetails || null;
    const priceDetails = await calculatePricesWithOffers(cartItems, couponDetails);

    return res.render("checkout_3", {
      user: userVer,
      phone,
      name,
      address: selectedAddress,
      paymentMethod: req.session.paymentMethod,
      cartItems,
      coupon: couponDetails,
      priceDetails,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};
const placeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);
    const cartItems = await cart.find({ userId: userVer._id }).populate("productId");

    // Calculate totals with offers and coupon
    const couponDetails = req.session.couponDetails || null;
    const priceDetails = await calculatePricesWithOffers(cartItems, couponDetails);

    // Handle wallet payment deduction
    if (req.session.paymentMethod === 'Wallet') {
      const userWallet = await wallet.findOne({ userId: userVer._id }).session(session);
      
      if (!userWallet || userWallet.walletBalance < priceDetails.total) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: "Insufficient wallet balance" 
        });
      }

      // Deduct from wallet and record transaction
      userWallet.walletBalance -= priceDetails.total;
      userWallet.walletTransaction.push({
        transactionAmount: priceDetails.total,
        transactionType: 'Debit for Order'
      });
      await userWallet.save({ session });
    }

    // Prepare order details with both original and offer prices
    const orderId = generateOrderID();
    const products = cartItems.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      productPrice: item.productId.productOfferPrice, // Discounted price
      originalPrice: item.productId.productPrice,    // Original price before discounts
      quantity: item.productQuantity,
      tax: calculateTax(item.productId.productOfferPrice * item.productQuantity),
      offerApplied: item.productId.offerApplied || null // Store offer details if available
    }));

    // Determine payment status
    const paymentStatus = req.session.paymentMethod === 'Cash on delivery' ? 
      'Pending' : 'Paid';

    // Create new order with detailed price breakdown
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
      paymentStatus,
      paymentDetails: req.session.paymentDetails || null,
      products,
      couponApplied: couponDetails ? {
        code: couponDetails.code,
        percentage: couponDetails.percentage,
        discountAmount: couponDetails.discountAmount,
        couponId: couponDetails.couponId
      } : null,
      priceDetails: {
        subtotal: priceDetails.subtotal,
        originalSubtotal: products.reduce((sum, product) => 
          sum + (product.originalPrice * product.quantity), 0),
        productDiscount: products.reduce((sum, product) => 
          sum + ((product.originalPrice - product.productPrice) * product.quantity), 0),
        tax: priceDetails.tax,
        couponDiscount: priceDetails.couponDiscount,
        total: priceDetails.total,
      },
      status: "Ordered",
    });
// console.log(newOrder);

    // Save order and clear cart
    await newOrder.save({ session });
    await cart.deleteMany({ userId: userVer._id }).session(session);

    // Update product stocks
    const bulkOps = cartItems.map(item => ({
      updateOne: {
        filter: { _id: item.productId._id },
        update: { $inc: { productStock: -item.productQuantity } }
      }
    }));
    
    if (bulkOps.length > 0) {
      await product.bulkWrite(bulkOps, { session });
    }

    // Update coupon usage if applied
    if (couponDetails) {
      await Coupon.findByIdAndUpdate(
        couponDetails.couponId,
        {
          $inc: { usedCount: 1, totalDiscount: couponDetails.discountAmount },
          $addToSet: { usedBy: userVer._id }
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Clear session data
    req.session.orderId = newOrder.orderId;
    delete req.session.addressId;
    delete req.session.paymentMethod;
    delete req.session.couponDetails;
    delete req.session.cartTotal;
    delete req.session.paymentDetails;

    return res.json({ success: true, orderId: newOrder.orderId });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Order placement error:', error);
    next(new AppError('Order placement failed. Please try again.', 500));
  }
};

// Helper function to calculate tax
const calculateTax = (amount) => {
  const taxRate = 0.18; // 18% GST
  return parseFloat((amount * taxRate).toFixed(2));
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
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

// In your checkout controller file
const placeFailedOrder = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const selectedAddress = await address.findById(req.session.addressId);
    const cartItems = await cart
      .find({ userId: userVer._id })
      .populate("productId");

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Calculate totals with offers and coupon
    const couponDetails = req.session.couponDetails || null;
    const priceDetails = await calculatePricesWithOffers(cartItems, couponDetails);

    // Prepare order details
    const orderId = generateOrderID();
    const products = cartItems.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      productPrice: item.productId.productOfferPrice, 
      quantity: item.productQuantity,
    }));

    // Create new order with failed payment status
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
      paymentStatus: 'Failed',
      paymentDetails: req.body.paymentDetails || null, 
      products,
      couponApplied: couponDetails ? {
        code: couponDetails.code,
        percentage: couponDetails.percentage,
        discountAmount: couponDetails.discountAmount,
        couponId: couponDetails.couponId
      } : null,
      priceDetails: {
        subtotal: priceDetails.subtotal,
        tax: priceDetails.tax,
        couponDiscount: priceDetails.couponDiscount,
        total: priceDetails.total,
      },
      status: "Payment Pending",
    });

    await newOrder.save();

    await cart.deleteMany({ userId: userVer._id });

    // Update product stocks
    for (const item of cartItems) {
      await product.findByIdAndUpdate(item.productId._id, {
        $inc: { productStock: -item.productQuantity },
      });
    }

    // Update coupon usage if applied
    if (couponDetails) {
      await Coupon.findByIdAndUpdate(
        couponDetails.couponId,
        {
          $inc: { usedCount: 1, totalDiscount: couponDetails.discountAmount },
          $addToSet: { usedBy: userVer._id }
        }
      );
    }

    // Store order ID in session for the failure page
    req.session.pendingOrderId = newOrder.orderId;

    return res.json({ 
      success: true, 
      orderId: newOrder.orderId,
      paymentStatus: 'Failed',
      orderStatus: 'Payment Pending'
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Failed to process your order with pending payment', 500));
  }
};
const paymentFailedPage = async (req, res, next) => {
  try {
    if (!req.session.pendingOrderId) {
      return res.redirect('/orders');
    }

    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name
    const orderDetails = await order.findOne({
      orderId: req.session.pendingOrderId,
      userId: userVer._id
    });

    if (!orderDetails) {
      return res.redirect('/orders');
    }

    // Clear the pending order ID from session
    delete req.session.pendingOrderId;

    res.render('paymentFailed', {
      name,
      user: userVer,
      order: orderDetails,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const updatePaymentStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { orderId } = req.params;
    const { paymentId, orderId: razorpayOrderId, signature } = req.body;
    
    // Find the order
    const existingOrder = await order.findById(orderId).session(session);
    
    if (!existingOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }
    
    // Update order details
    existingOrder.paymentStatus = 'Paid';
    existingOrder.status = 'Ordered';
    existingOrder.paymentDetails = {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    };
    
    await existingOrder.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    return res.json({ 
      success: true,
      message: "Order payment status updated successfully"
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Update payment status error:', error);
    next(new AppError('Failed to update payment status', 500));
  }
};

module.exports = {
  checkoutPageOne,
  checkoutOnePost,
  paymentPage,
  paymentMethod,
  applyCoupon,
  removeCoupon,
  finalReview,
  placeOrder,
  confirmPage,
  createRazorpayOrder,
  verifyPayment,
  placeFailedOrder, 
  paymentFailedPage,
  updatePaymentStatus
};