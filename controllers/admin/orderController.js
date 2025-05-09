const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const order = require("../../models/orderSchema");
const wallet = require("../../models/walletSchema");


const orders = async (req, res) => {
    try {
      let page = parseInt(req.query.page) || 1
      let limit = 10
      let skip = (page - 1) * limit
      let searchQuery = req.query.search || ''
      let regexPattern = new RegExp(searchQuery, 'i')
      let filter = searchQuery
        ? { $or: [{ orderId: regexPattern }, { fullname: regexPattern }] }
        : {}
      const orders = await order
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
      const totalUsers = await order.countDocuments()
      const totalPages = Math.ceil(totalUsers / limit)
      res.render('orders', { orders, page, totalPages,totalUsers })
    } catch (error) {
      console.log(error)
    }
  }

const orderView =async (req, res) => {
  try {
    const orderId = req.params.id
    const orderData = await order.findById({ _id: orderId })
    if (orderData) {
      return res.render('order-details', { orderData })
    } else {
      return res.redirect('/orders')
    }
  } catch (error) {
    console.log(error)
  }
}








  module.exports={
    orders,
    orderView,
  }