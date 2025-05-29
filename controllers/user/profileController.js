const usercollection = require("../../models/userSchema");
const address = require("../../models/addressSchema");
const wishlist = require("../../models/wishlistSchema");
const AppError = require("../../middlewares/errorHandling");
const cart = require("../../models/cartSchema");
const bcrypt = require("bcrypt");
const sendotp = require("../../helpers/sendOtp");
const passport = require("passport");

async function securePassword(password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

async function comparePassword(enteredPassword, storedPassword) {
  const isMatch = await bcrypt.compare(enteredPassword, storedPassword);
  return isMatch;
}

const profile = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name;
    if (!userVer.isActive) {
      return res.redirect("/blocked");
    } else {
      const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
      const  cartCount = await cart.countDocuments({ userId: userVer._id })
      return res.render("Profile", { userVer, name ,wishlistCount,cartCount});
    }
  } catch (error) {
    console.log("profilePage error:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const editProfile = async (req, res,next) => {
  try {
    if (!req.body.name || !req.body.phone) {
      return res.json({ success: false, message: "Name or Phone is empty" });
    }
    await usercollection.updateOne(
      { email: req.session.email },
      { $set: { name: req.body.name, phone: req.body.phone } }
    );
    return res.json({ success: true, message: "Pofile Updated!" });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};
const addressPage = async (req, res,next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });

    if (!userVer) {
      return res.status(404).render("error", { message: "User not found" });
    }
    const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
    const  cartCount = await cart.countDocuments({ userId: userVer._id })
    const addresses = await address
      .find({ userId: userVer._id })
      .sort({ isDefault: -1 });
    res.render("address", {
      userVer,
      addresses,
      wishlistCount,
      cartCount,
      name: userVer.name,
    });
  } catch (error) {
    console.error("Error in addressPage:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};
const getAddressById = async (req, res,next) => {
  try {
    const addressId = req.params.id;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const addressData = await address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!addressData) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.status(200).json({
      success: true,
      address: addressData,
    });
  } catch (error) {
    console.error("Error in getAddressById:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};


const editEmail = async (req, res,next) => {
  try {
  
    return res.render('editEmail');
  } catch (error) {
    console.log(error);
next(new AppError('Sorry...Something went wrong', 500));
  }
};
const verifyEmailOtp = async (req, res,next) => {
  try {
    return res.render('verifyEmailOtp');
  } catch (error) {
    console.log(error);
next(new AppError('Sorry...Something went wrong', 500));
  }
};

// Send OTP to new email
const  sendEmailOTP = async (req, res,next) => {
    try {
      
        const newEmail  = req.body.email;
        const email=req.session.email
        const userVer = await usercollection.findOne({ email: email });
        const name = userVer.name
       console.log(newEmail)
       console.log(name);
        // Check if email is already in use
        const existingUser = await usercollection.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email is already in use' });
        }
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to session
        req.session.emailOTP = otp;
        req.session.newEmail = newEmail;
        req.session.otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        
        await sendotp(otp,newEmail,name);
        
        res.json({ success: true, message: 'OTP sent to your new email address' });
    } catch (error) {
        console.error('Error sending email OTP:', error);
        next(new AppError('Sorry...Something went wrong', 500));
    }
};

// Verify OTP and update email
const verifyEmailOTP = async (req, res,next) => {
    try {
        const { otp } = req.body;
        
        // Check if OTP exists in session
        if (!req.session.emailOTP || !req.session.newEmail) {
            return res.status(400).json({ success: false, message: 'OTP session expired' });
        }
        
        // Check if OTP is expired
        if (Date.now() > req.session.otpExpires) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }
        
        // Verify OTP
        if (otp !== req.session.emailOTP) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        
      
         await usercollection.updateOne(
                { email: req.session.email },
                { $set: { email: req.session.newEmail } }
            );

            req.session.email = req.session.newEmail
        
        // Clear session
        req.session.emailOTP = null;
        req.session.newEmail = null;
        req.session.otpExpires = null;
        
        res.json({ success: true, message: 'Email updated successfully' });
    } catch (error) {
        console.error('Error verifying email OTP:', error);
        next(new AppError('Sorry...Something went wrong', 500));
    }
};

const addAddressPost = async (req, res,next) => {
  try {
    const {
      userId,
      doorNo,
      street,
      city,
      district,
      postcode,
      type,
      isDefault,
    } = req.body;

    // Validate required fields
    if (!doorNo || !street || !city || !district || !postcode) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate postcode format
    if (!/^\d{6}$/.test(postcode)) {
      return res.status(400).json({
        success: false,
        message: "Postcode must be 6 digits",
      });
    }

    // Check if user exists
    const user = await usercollection.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      await address.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = new address({
      userId,
      doorNo,
      street,
      city,
      district,
      pinCode: postcode,
      type: type || "Home",
      isDefault: !!isDefault,
    });

    await newAddress.save();

    return res.status(200).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Error in addAddressPost:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};
const editAddressPut = async (req, res,next) => {
  try {
    const addressId = req.params.id; // Get ID from URL parameter
    const { doorNo, street, city, district, postcode, type, isDefault } =
      req.body;

    // Validate required fields
    if (!doorNo || !street || !city || !district || !postcode) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate postcode format
    if (!/^\d{6}$/.test(postcode)) {
      return res.status(400).json({
        success: false,
        message: "Postcode must be 6 digits",
      });
    }

    // Verify address belongs to logged-in user
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });
    const existingAddress = await address.findById(addressId);

    if (
      !existingAddress ||
      existingAddress.userId.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      await address.updateMany(
        { userId: user._id, isDefault: true, _id: { $ne: addressId } },
        { $set: { isDefault: false } }
      );
    }

    const updatedAddress = await address.findByIdAndUpdate(
      addressId,
      {
        $set: {
          doorNo,
          street,
          city,
          district,
          pinCode: postcode, // Note: this should match your schema field name
          type: type || existingAddress.type,
          isDefault: !!isDefault,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Error in editAddressPut:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const deleteAddress = async (req, res,next) => {
  try {
    const addressId = req.params.id;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to logged-in user
    const addressToDelete = await address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!addressToDelete) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    // Prevent deletion of default address if it's the only address
    if (addressToDelete.isDefault) {
      const addressCount = await address.countDocuments({ userId: user._id });
      if (addressCount === 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the only default address",
        });
      }

      // If deleting default address, set another address as default
      const anotherAddress = await address
        .findOne({
          userId: user._id,
          _id: { $ne: addressId },
        })
        .sort({ createdAt: 1 });

      if (anotherAddress) {
        await address.findByIdAndUpdate(anotherAddress._id, {
          $set: { isDefault: true },
        });
      }
    }

    await address.findByIdAndDelete(addressId);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAddress:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const setDefaultAddress = async (req, res,next) => {
  try {
    const addressId = req.params.id;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to logged-in user
    const addressToSetDefault = await address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!addressToSetDefault) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    // Remove default from other addresses
    await address.updateMany(
      { userId: user._id, isDefault: true, _id: { $ne: addressId } },
      { $set: { isDefault: false } }
    );

    // Set this address as default
    await address.findByIdAndUpdate(addressId, {
      $set: { isDefault: true },
    });

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
    });
  } catch (error) {
    console.error("Error in setDefaultAddress:", error);
   next(new AppError('Sorry...Something went wrong', 500));
  }
};

const changePassword = async (req, res,next) => {
  try {
    const userE = req.session.email;
    const user = await usercollection.findOne({ email: userE });

    if (!(await comparePassword(req.body.currentPassword, user.password))) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect current password!" });
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match!" });
    }

    const newHashedPass = await securePassword(req.body.newPassword);
    await usercollection.updateOne(
      { email: req.session.email },
      { $set: { password: newHashedPass } }
    );

    return res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while changing password",
      });
  }
};

module.exports = {
  profile,
  editProfile,
  addressPage,
  addAddressPost,
  getAddressById,
  editAddressPut,
  setDefaultAddress,
  deleteAddress,
  changePassword,
  editEmail,
  sendEmailOTP,
  verifyEmailOTP ,
  verifyEmailOtp,
};
