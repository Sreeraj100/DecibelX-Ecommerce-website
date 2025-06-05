const usercollection = require("../../models/userSchema");
const wallet = require("../../models/walletSchema");
const AppError = require("../../middlewares/errorHandling");
const walletPage = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name;
    let walletData = await wallet.findOne({ userId: userVer._id });
    
    if (walletData) {
      walletData.walletBalance = Math.floor(walletData.walletBalance * 100) / 100;
    }
    
    return res.render('wallet', { userVer, walletData, name });
  } catch (error) {
    console.log(error);
    next(new AppError('Something went wrong', 500));
  }
};
    
const addMoneyToWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      amount: amount * 100, // Convert to paise
      email: userEmail,
      userId: user._id
    });
  } catch (error) {
    console.error(error);
    next(new AppError('Failed to process request', 500));
  }
};

const verifyWalletPayment = async (req, res, next) => {
  try {
    const { amount, razorpay_payment_id } = req.body;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    // Find or create wallet
    let walletData = await wallet.findOne({ userId: user._id });

    if (!walletData) {
      walletData = new wallet({
        userId: user._id,
        walletBalance: 0,
        walletTransaction: []
      });
    }

    // Update wallet balance
    walletData.walletBalance += parseFloat(amount);

    // Add transaction record
    walletData.walletTransaction.push({
      transactionAmount: parseFloat(amount),
      transactionType: 'Money from Razorpay',
      paymentId: razorpay_payment_id
    });

    await walletData.save();

    res.status(200).json({
      success: true,
      message: 'Wallet updated successfully',
      walletBalance: walletData.walletBalance
    });
  } catch (error) {
    console.error(error);
    next(new AppError('Failed to verify payment', 500));
  }
};

module.exports = {
  walletPage,
  addMoneyToWallet,
  verifyWalletPayment
};