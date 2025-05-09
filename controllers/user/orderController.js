const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const order = require("../../models/orderSchema");
const pdfService = require('../../services/invoice')


const orders = async (req, res) => {
    try {
      
      const page = parseInt(req.query.page) || 1;
      const limit = 5; 
      const skip = (page - 1) * limit;

      const userEmail = req.session.email
      const userVer = await usercollection.findOne({ email: userEmail })
      const name = userVer.name
      const userId = userVer._id
      const wishlistCount = await wishlist.countDocuments({ userId: userVer._id });
      const cartCount = await cart.countDocuments({ userId: userVer._id });
      const totalOrders = await order.countDocuments({ userId: userId });
      const totalPages = Math.ceil(totalOrders / limit);
      const orders = await order.find({ userId: userId })
        .sort({ createdAt: -1 }) // Sort by date (newest first)
        .skip(skip)
        .limit(limit);
      
      
      res.render('order', {
        userVer,
        name,
        wishlistCount,
        cartCount,
        orders: orders,
        pagination: {
          page: page,
          limit: limit,
          totalPages: totalPages,
          totalItems: totalOrders,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).render('error', { 
        message: 'Failed to fetch orders. Please try again later.' 
      });
    }
  };


  const userOrderView = async (req, res) => {
    try {
      const orderId = req.params.id
      const userEmail = req.session.email
      const userVer = await usercollection.findOne({ email: userEmail })
      const name = userVer.name
      const orderData = await order.findById({ _id: orderId })
      if(orderData.userId.toString()==userVer._id.toString()){
        for(let i=0;i<orderData.products.length;i++){
          const productDetails = await product.findOne({_id:orderData.products[i].productId})
          orderData.products[i].img = productDetails.productImage1
        }
        return res.render('order-detail', { orderData, userVer, name })
      } else {
        return res.redirect("/orders")
      }
    
    } catch (error) {
      console.log(error)
      
    }
  }


  const downloadInvoice = async (req, res) => {
    try {
      const orderId = req.params.id
      const orderData = await order.findById({ _id: orderId })
      const pdfPath = await pdfService.generateInvoice(orderData)
      res.download(pdfPath)
    } catch (error) {
      console.log(error)
    }
  }
  
module.exports = {
    orders,
    userOrderView,
    downloadInvoice
}