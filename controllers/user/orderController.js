const mongoose = require("mongoose");
const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const wishlist = require("../../models/wishlistSchema");
const AppError = require("../../middlewares/errorHandling");
const cart = require("../../models/cartSchema");
const order = require("../../models/orderSchema");
const wallet = require("../../models/walletSchema");
const pdfService = require("../../services/invoice");

const orders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name;
    const userId = userVer._id;
    const wishlistCount = await wishlist.countDocuments({
      userId: userVer._id,
    });
    const cartCount = await cart.countDocuments({ userId: userVer._id });
    const totalOrders = await order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit);
    const orders = await order
      .find({ userId: userId })
      .sort({ createdAt: -1 }) // Sort by date (newest first)
      .skip(skip)
      .limit(limit);

    res.render("order", {
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
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};

const userOrderView = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name;
    const orderData = await order.findById({ _id: orderId });
    if (orderData.userId.toString() == userVer._id.toString()) {
      for (let i = 0; i < orderData.products.length; i++) {
        const productDetails = await product.findOne({
          _id: orderData.products[i].productId,
        });
        orderData.products[i].img = productDetails.productImage1;
      }
      return res.render("order-detail", { orderData, userVer, name });
    } else {
      return res.redirect("/orders");
    }
  } catch (error) {
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};
const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const id = req.params.id;
    const orderData = await order.findById(id).session(session);
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail }).session(session);

    // Restore product stock
    for (const item of orderData.products) {
      await product.updateOne(
        { _id: item.productId },
        { $inc: { productStock: item.quantity } },
        { session }
      );
    }

    // Refund to wallet if payment was online or wallet
    if (orderData.paymentMethod !== 'cash on delivery') {
     const transactionData = {
        transactionDate: new Date(),
        transactionAmount: orderData.priceDetails.total,
        transactionType: "Credit on Cancel",
        orderId: orderData._id,
      };

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
    }

    // Update order status
    await order.updateOne(
      { _id: id },
      { $set: { status: "Cancelled" } },
      { session }
    );

    await session.commitTransaction();
    return res.json({ success: true });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res.json({ success: false, error: "Failed to cancel order" });
  } finally {
    session.endSession();
  }
};

const downloadInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const orderData = await order.findById({ _id: orderId });
    const pdfPath = await pdfService.generateInvoice(orderData);
    res.download(pdfPath);
  } catch (error) {
    console.log(error);
    next(new AppError("Sorry...Something went wrong", 500));
  }
};

const returnOrder = async (req, res,next) => {
  try {
    const id = req.params.id;
    const data = await order.updateOne(
      { _id: id },
      { $set: { status: "Return processing", returnReason: req.body.value } }
    );
    if (data) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  } catch (error) {
    console.log(error);
     next(new AppError('Sorry...Something went wrong', 500));
  }
};
module.exports = {
  orders,
  userOrderView,
  downloadInvoice,
  cancelOrder,
  returnOrder,

};
