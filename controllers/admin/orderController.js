const mongoose = require("mongoose");
const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const order = require("../../models/orderSchema");
const wallet = require("../../models/walletSchema");
const AppError = require('../../middlewares/errorHandling')

const orders = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 10;
    let skip = (page - 1) * limit;
    let searchQuery = req.query.search || "";
    let regexPattern = new RegExp(searchQuery, "i");
    let filter = searchQuery
      ? { $or: [{ orderId: regexPattern }, { fullname: regexPattern }] }
      : {};
    const orders = await order
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const totalUsers = await order.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);
    res.render("orders", { orders, page, totalPages, totalUsers });
  } catch (error) {
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};

const orderView = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const orderData = await order.findById({ _id: orderId });
    if (orderData) {
      return res.render("order-details", { orderData });
    } else {
      return res.redirect("/orders");
    }
  } catch (error) {
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};
const editOrderView = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const orderData = await order.findById({ _id: orderId });
    if (orderData) {
      return res.render("editOrder", { orderData });
    } else {
      return res.redirect("/orders");
    }
  } catch (error) {
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};

const editOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.body.status == "Delivered") {
      // Get the order data first
      const orderData = await order.findById(req.params.id).session(session);
      
      // Update product salesCount for each item in the order
      for (const item of orderData.products) {
        await product.updateOne(
          { _id: item.productId },
          { $inc: { salesCount: item.quantity } },
          { session }
        );
      }

      // Update order status and delivery date
      await order.updateOne(
        { _id: req.params.id },
        { $set: { status: req.body.status, deliveryDate: new Date() } },
        { session }
      );
      
      await session.commitTransaction();
      session.endSession();
    } else {
      
      await order.updateOne(
        { _id: req.params.id },
        { $set: { status: req.body.status } },
        { session }
      );
      
      await session.commitTransaction();
      session.endSession();
    }
    
    return res.json({
      success: true,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};
const returnOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderData = await order.findById(req.body.orderId).session(session);

    if (!orderData) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (req.body.orderStatus == "Returned") {
      const transactionData = {
        transactionDate: new Date(),
        transactionAmount: orderData.priceDetails.total,
        transactionType: "Credit on Return",
        orderId: orderData._id,
      };

      for (const item of orderData.products) {
        await product.updateOne(
          { _id: item.productId },
          { $inc: { productStock: item.quantity } },
          { session }
        );
      }

      const existingWallet = await wallet
        .findOne({ userId: orderData.userId })
        .session(session);

      if (existingWallet) {
        await wallet.updateOne(
          { userId: orderData.userId },
          {
            $inc: { walletBalance: orderData.priceDetails.total },
            $push: { walletTransaction: transactionData },
          },
          { session }
        );
      } else {
        await wallet.create(
          [
            {
              userId: orderData.userId,
              walletBalance: orderData.priceDetails.total,
              walletTransaction: [transactionData],
            },
          ],
          { session }
        );
      }

      // Update order status
      await order.updateOne(
        { _id: req.body.orderId },
        { $set: { status: req.body.orderStatus } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return res.json({
        success: true,
        message: "Order Returned and amount credited to wallet!",
      });
    } else {
      // For other status updates
      await order.updateOne(
        { _id: req.body.orderId },
        { $set: { status: req.body.orderStatus } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return res.json({ success: true, message: "Order Status Updated!" });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};

module.exports = {
  orders,
  orderView,
  editOrderView,
  editOrder,
  returnOrder,
};
