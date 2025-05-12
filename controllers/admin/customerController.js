const mongoose = require("mongoose");
const userCollection = require("../../models/userSchema");
const AppError = require('../../middlewares/errorHandling')



const customerInfo = async(req,res,next)=>{
  try {
      const users = await userCollection.find({}).sort({ createdAt: -1 });
      return res.render("customers",{users})
  } catch (error) {
      console.log("customerInfo",error)
   next(new AppError('Sorry...Something went wrong', 500))
  }
}
const unListUser = async (req, res, next) => {
  try {
      const userId = req.params.id;
      const ans = await userCollection.updateOne({ _id: userId }, { isActive: false });
      res.json({ success: true, message: 'User Blocked successfully.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to block User.' });
  }
};

const listUser = async (req, res, next) => {
  try {
      const userId = req.params.id;
      const ans = await userCollection.updateOne({ _id: userId }, { isActive: true });
      res.json({ success: true, message: 'User Unblocked successfully.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to block User.' });
  }
};


module.exports = {
  customerInfo,
  listUser,
  unListUser,
};