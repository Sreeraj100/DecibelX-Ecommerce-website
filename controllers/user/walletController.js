const usercollection = require("../../models/userSchema");
const wallet = require("../../models/walletSchema");
const AppError = require("../../middlewares/errorHandling");

const walletPage = async (req, res,next) => {
  try {
    const userEmail = req.session.email
    const userVer = await usercollection.findOne({ email: userEmail })
    const name= userVer.name
    let walletData = await wallet.findOne({ userId: userVer._id })
    if(walletData){
    walletData.walletBalance = Math.floor(walletData.walletBalance * 100) / 100
    }
    return res.render('wallet', { userVer, walletData,name })
  } catch (error) {
    console.log(error)
         next(new AppError('Sorry...Something went wrong', 500));

  }
}

module.exports ={
    walletPage,
}