const cart = require("../../models/cartSchema");
const usercollection = require("../../models/userSchema");
const address = require("../../models/addressSchema");
const product = require("../../models/productSchema");
const order = require("../../models/orderSchema");
const fs = require('fs');


// Helper function to generate order ID
function generateOrderID() {
    let randomLetters = '';
    for (let i = 0; i < 3; i++) {
      randomLetters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    return `${randomLetters}-${datePart}-${randomPart}`;
  }
  
  // Checkout Step 1 - GET (Shipping Address)
  const checkoutPageOne = async (req, res, next) => {
    try {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      const addressCollection = await address.find({ userId: userVer._id });
      
      return res.render('checkout_1', { 
        userVer, 
        addresses: addressCollection 
      });
    } catch (error) {
      console.log(error);
      
    }
  };
  
  // Checkout Step 1 - POST (Process Address Selection)
  const checkoutOnePost = async (req, res, next) => {
    try {
      // If user selected existing address
    //   if (req.body.address !== 'new') {
        req.session.addressId = req.body.address;
        req.session.name = req.body.name
        req.session.phone = req.body.phone
    //   } 
      // If user is adding new address
    //   else {
    //     const userEmail = req.session.email;
    //     const userVer = await usercollection.findOne({ email: userEmail });
    //     const addressCount = await address.countDocuments({ userId: userVer._id });
        
    //     const newAddress = new address({
    //       userId: userVer._id,
    //       addressCount: addressCount + 1,
    //       doorNo: req.body.doorNum,
    //       street: req.body.street,
    //       city: req.body.city,
    //       district: req.body.district,
    //       pinCode: req.body.postcode
    //     });
        
    //     const savedAddress = await newAddress.save();
    //     req.session.addressId = savedAddress._id;
    //   }
      
      return res.redirect('/payment');
    } catch (error) {
      console.log(error);
      
    }
  };
  
  // Checkout Step 2 - GET (Payment Method)
  const paymentPage = async (req, res, next) => {
    try {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      const selectedAddress = await address.findById(req.session.addressId);
      return res.render('checkout_2', { 
        user: userVer,
        address: selectedAddress,
      });
    } catch (error) {
      console.log(error);
      
    }
  };
  
  // Checkout Step 2 - POST (Process Payment Method)
  const paymentMethod = async (req, res, next) => {
    try {
      req.session.paymentMethod = req.body.payment;
      return res.redirect('/review');
    } catch (error) {
      console.log(error);
      
    }
  };
  
  // Checkout Step 3 - GET (Order Review)
  const finalReview = async (req, res, next) => {
    try {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      const selectedAddress = await address.findById(req.session.addressId);
      const cartItems = await cart.find({ userId: userVer._id }).populate('productId');
      
      // Calculate totals
      let subtotal = 0;
      cartItems.forEach(item => {
        subtotal += item.productId.productOfferPrice * item.productQuantity;
      });
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + tax;
      
      return res.render('checkout_3', {
        user: userVer,
        address: selectedAddress,
        paymentMethod: req.session.paymentMethod,
        cartItems,
        subtotal,
        tax,
        total
      });
    } catch (error) {
      console.log(error);
      
    }
  };
  
  // Checkout Step 3 - POST (Place Order)
  const placeOrder = async (req, res, next) => {
    try {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      const selectedAddress = await address.findById(req.session.addressId);
      const cartItems = await cart.find({ userId: userVer._id }).populate('productId');
      
      // Prepare order details
      const orderId = generateOrderID();
      const products = cartItems.map(item => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        productPrice: item.productId.productOfferPrice,
        quantity: item.productQuantity
      }));
      
      // Calculate totals
      let subtotal = 0;
      cartItems.forEach(item => {
        subtotal += item.productId.productOfferPrice * item.productQuantity;
      });
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
      
      // Create new order
      const newOrder = new order({
        userId: userVer._id,
        fullName: req.session.name,
        phone: req.session.phone,
        email:req.session.email,
        orderId,
        address: {
          doorNo: selectedAddress.doorNo,
          street: selectedAddress.street,
          city: selectedAddress.city,
          district: selectedAddress.district,
          pinCode: selectedAddress.pinCode
        },
        paymentMethod: req.session.paymentMethod,
        products,
        priceDetails: {
          subtotal,
          tax,
          total
        },
        status: req.session.paymentMethod === 'Cash on delivery' ? 'Placed' : 'Pending'
      });
      
      // Save order and clear cart
      await newOrder.save();
      await cart.deleteMany({ userId: userVer._id });
      
      // Update product stocks
      for (const item of cartItems) {
        await product.findByIdAndUpdate(
          item.productId._id,
          { $inc: { productStock: -item.productQuantity } }
        );
      }
      
      // Clear session data
      req.session.orderId = newOrder.orderId;
      req.session.addressId = null;
      req.session.paymentMethod = null;
      
      return res.json({ success: true, orderId: newOrder.orderId });
    } catch (error) {
      console.log(error);
      
    }
  };
  
  // Order Confirmation Page
  const confirmPage = async (req, res, next) => {
    try {
      if (req.session.orderId) {
        const userEmail = req.session.email;
        const userVer = await usercollection.findOne({ email: userEmail });
        const orderDetails = await order.findOne({ orderId: req.session.orderId });
        const name=userVer.name
        return res.render('orderConfirmation', {
          user: userVer,
          name,
          order: orderDetails
        });
      } else {
        return res.redirect('/shop');
      }
    } catch (error) {
      console.log(error);
      
    }
  };
  
  module.exports = {
    checkoutPageOne,
    checkoutOnePost,
    paymentPage,
    paymentMethod,
    finalReview,
    placeOrder,
    confirmPage
  };

