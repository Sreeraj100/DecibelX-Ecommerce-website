const bcrypt = require("bcrypt");
const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const AppError = require("../../middlewares/errorHandling");
const cart = require("../../models/cartSchema");
const otpCollection = require("../../models/otp");
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
const loadHome = async (req, res, next) => {
  try {
    let name = "";
    let wishlistCount = 0;
    let cartCount=0
    // First get all listed categories
    const categories = await category.find({isListed:true});
    
    // Get only the category IDs that are listed
    const listedCategoryIds = categories.map(cat => cat._id);
    
    // Find products that are listed, not deleted, and belong to listed categories
    const products = await product.find({
      isListed: true,
      isDeleted: false,
      productCategoryId: { $in: listedCategoryIds }
    }).sort({ createdAt: -1 }).limit(5);

    if (req.session.loginSession || req.session.signupSession) {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      
      if (userVer) {
        req.session.otpSession = false;
        if (!userVer.isActive) {
          return res.redirect("/blocked");
        } else {
          name = userVer.name;
           wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
          cartCount = await cart.countDocuments({ userId: userVer._id })
          return res.render("home", { name, products, categories,wishlistCount,cartCount});
        }
      } else {
        return res.render("home", { name, products, categories,wishlistCount });
      }
    } else {
      return res.render("home", { name, products, categories,wishlistCount });
    }
  } catch (error) {
    console.log("Homepage error:", error);
  next(new AppError('Sorry...Something went wrong', 500));
  }
};

const loadLogin = async (req, res, next) => {
  try {
    if (req.session.loginSession || req.session.signupSession) {
      return res.redirect("/");
    } else {
      const logErr = req.session.logError;
      res.render("login", { logErr });
    }
  } catch (error) {
    console.log("loginpage error:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const loadSignup = async (req, res, next) => {
  try {
    if (req.session.loginSession || req.session.signupSession) {
      return res.redirect("/");
    } else {
      const signErr = req.session.signError;
      res.render("signup", { signErr });
    }
  } catch (error) {
    console.log("signuppage error:", error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const otpSend = async (req, res, next) => {
  req.session.otpSession = true;
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  req.session.otpError = null;
  req.session.otpTime = 75; // Set it only if it's not already set
  const userData = await otpCollection.findOne({ email: req.session.email });
  await otpCollection.updateOne(
    { email: userData.email },
    { $set: { otp: generatedOtp } }
  );
  await sendotp(generatedOtp, userData.email, userData.name);
  const hashedOtp = await securePassword(generatedOtp);
  await otpCollection.updateOne(
    { email: req.session.email },
    { $set: { otp: hashedOtp } },
    { upsert: true }
  );
  req.session.otpStartTime = null;
  res.redirect("/otp");
};

const otpPage = async (req, res, next) => {
  if (req.session.otpSession) {
    const otpError = req.session.otpError;
    // If OTP time isn't set, set it
    if (!req.session.otpStartTime) {
      req.session.otpStartTime = Date.now();
    }
    const elapsedTime = Math.floor(
      (Date.now() - req.session.otpStartTime) / 1000
    );
    const remainingTime = Math.max(req.session.otpTime - elapsedTime, 0);
    return res.render("verify-otp", {
      otpError: otpError,
      time: remainingTime,
    });
  } else {
    return res.redirect("/");
  }
};

const otpPost = async (req, res, next) => {
  const findOtp = await otpCollection.findOne({ email: req.session.email });
  // console.log(req.body);
  // console.log(findOtp);
  if (await comparePassword(req.body.otp, findOtp.otp)) {
    const newUser = new usercollection({
      email: findOtp.email,
      name: findOtp.name,
      password: findOtp.password,
      phone: findOtp.phone,
    });
    newUser.save();
    req.session.signupSession = true;
    res.redirect("/");
  } else {
    req.session.otpError = "Incorrect OTP";
    res.redirect("/otp");
  }
};

const signup = async (req, res,next) => {
  try {
    const userExists = await usercollection.findOne({
      email: req.body.emailval,
    });
    if (userExists) {
      return res.status(409).send({ success: false });
    } else {
      const hashedPassword = await securePassword(req.body.passwordval);
      const result = await otpCollection.updateOne(
        { email: req.body.emailval },
        {
          $set: {
            name: req.body.fullname,
            email: req.body.emailval,
            phone: req.body.phone,
            password: hashedPassword,
          },
        },
        { upsert: true }
      );
      // console.log(result);
      req.session.email = req.body.emailval;
      return res.status(200).send({ success: true });
    }
  } catch (error) {
    console.error("Signup error:", error);
    next(new AppError('Sorry...Something went wrong', 500));

  }
};

const login = async (req, res,next) => {
  try {
    // console.log(req.body);
    const userData = await usercollection.findOne({ email: req.body.email });
    if (userData) {
      if (
        userData.password &&
        (await comparePassword(req.body.password, userData.password))
      ) {
        req.session.loginSession = true;
        req.session.email = req.body.email;
        return res.status(200).send({ success: true });
      } else {
        return res.status(208).send({ success: false });
      }
    } else {
      return res.status(208).send({ success: false });
    }
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};
const googleCallback = async (req, res, next) => {
  try {
    const user = await usercollection.findOneAndUpdate(
      { email: req.user._json.email },
      { $set: { name: req.user.displayName } },
      { upsert: true, new: true }
    );
    // const userId = await usercollection.findOne({
    //   email: req.user._json.email,
    // });
    req.session.email = req.user._json.email,
    
    req.session.loginSession = true;
    return res.redirect("http://localhost:3000/");
  } catch (err) {
    console.error("Error in googleCallback:", err);
  next(new AppError('Sorry...Something went wrong', 500));
  }
};

const blockedUser = async (req, res, next) => {
  const user = await usercollection.findOne({ email: req.session.email });
  if (user.isActive == false) {
    return res.render("blocked");
  } else {
    return res.redirect("/");
  }
};
const about = async (req, res) => {
  let name = "";
  let wishlistCount = 0;
  let cartCount = 0
  if (req.session.loginSession || req.session.signupSession) {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer.isActive) {
      return res.redirect("/blocked");
    } else {
      name = userVer.name;
      const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
      cartCount = await cart.countDocuments({ userId: userVer._id })
      return res.render("about", { name ,wishlistCount,cartCount});
    }
  } else {
    return res.render("about", { name ,wishlistCount});
  }
};
const contact = async (req, res) => {
  let name = "";
  let wishlistCount = 0;
  let cartCount = 0
  if (req.session.loginSession || req.session.signupSession) {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer.isActive) {
      return res.redirect("/blocked");
    } else {
      name = userVer.name;
      const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
      cartCount = await cart.countDocuments({ userId: userVer._id })
      return res.render("contact", { name,wishlistCount,cartCount });
    }
  } else {
    return res.render("contact", { name ,wishlistCount});
  }
};

const forgotPassword = async (req, res,next) => {
  try {
    // Clear any existing session data
    req.session.forgotPasswordSession = null;
    req.session.forgotEmail = null;
    req.session.otpError = null;
    
    return res.render('forgot-pass');
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const forgotPasswordPost = async (req, res,next) => {
  try {
    const email = req.body.email;
    const user = await usercollection.findOne({ email: email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found with this email" 
      });
    }

    // Generate and store OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await securePassword(generatedOtp);

    await otpCollection.updateOne(
      { email: email },
      { $set: { otp: hashedOtp } },
      { upsert: true }
    );

    // Send OTP to email
    await sendotp(generatedOtp, email, user.name);

    // Set session variables
    req.session.forgotPasswordSession = true;
    req.session.forgotEmail = email;
    req.session.otpStartTime = Date.now();
    req.session.forgotOtpTime = 75; // 75 seconds for OTP expiry
    req.session.otpError = null;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
   next(new AppError('Sorry...Something went wrong', 500));
  }
};

const verifyOtpGet = async (req, res,next) => {
  try {
    if (!req.session.forgotPasswordSession || !req.session.forgotEmail) {
      return res.redirect('/forgotPassword');
    }

    // Calculate remaining time
    const elapsedTime = Math.floor((Date.now() - req.session.otpStartTime) / 1000);
    const remainingTime = Math.max(req.session.forgotOtpTime - elapsedTime, 0);
    
    return res.render("verifyOtp", {
      otpError: req.session.otpError,
      time: remainingTime,
      email: req.session.forgotEmail
    });
  } catch (error) {
    console.error("Verify OTP page error:", error);
    return res.redirect('/forgotPassword');
  }
};

const verifyOtppost = async (req, res) => {
  try {
    if (!req.session.forgotPasswordSession || !req.session.forgotEmail) {
      return res.redirect('/forgotPassword');
    }

    const forgotEmail = req.session.forgotEmail;
    const findOtp = await otpCollection.findOne({ email: forgotEmail });
    
    if (!findOtp || !findOtp.otp) {
      req.session.otpError = "OTP expired. Please request a new one.";
      return res.redirect('/verifyOtpGet');
    }

    // Verify OTP
    if (await comparePassword(req.body.otp, findOtp.otp)) {
      req.session.otpVerified = true;
      return res.redirect('/resetPassword');
    } else {
      req.session.otpError = "Incorrect OTP";
      return res.redirect('/verifyOtpGet');
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    req.session.otpError = "Error verifying OTP";
    return res.redirect('/verifyOtpGet');
  }
};

const resetPasswordPage = async (req, res) => {
  try {
    if (!req.session.forgotPasswordSession || 
        !req.session.forgotEmail || 
        !req.session.otpVerified) {
      return res.redirect('/forgotPassword');
    }

    const elapsedTime = Math.floor((Date.now() - req.session.otpStartTime) / 1000);
    const remainingTime = Math.max(req.session.forgotOtpTime - elapsedTime, 0);
    
    return res.render("reset-password", { 
      email: req.session.forgotEmail,
      time: remainingTime,
      error: req.session.resetPassError 
    });
  } catch (error) {
    console.error("Reset password page error:", error);
    return res.redirect('/forgotPassword');
  }
};

const resetPasswordPost = async (req, res) => {
  try {
    if (!req.session.forgotPasswordSession || 
        !req.session.forgotEmail || 
        !req.session.otpVerified) {
      return res.redirect('/forgotPassword');
    }

    const { newPassword, confirmPassword } = req.body;
    const email = req.session.forgotEmail;

  
    // Update password
    const hashedPassword = await securePassword(newPassword);
    console.log(hashedPassword);
    await usercollection.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    // Clear session
    req.session.forgotPasswordSession = null;
    req.session.forgotEmail = null;
    req.session.otpVerified = null;
    req.session.resetPassError = null;
    req.session.otpError = null;
    
    return res.status(200).json({ success: true });
  } catch (error) {
    req.session.resetPassError = "Something went wrong. Please try again.";
    return res.redirect('/resetPassword');
  }
};

const resendForgotOtp = async (req, res,next) => {
  try {
    const email = req.session.forgotEmail;
    if (!email || !req.session.forgotPasswordSession) {
      return res.status(400).json({ 
        success: false, 
        message: "Session expired" 
      });
    }

    // Generate new OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await securePassword(generatedOtp);

    // Update OTP in database
    await otpCollection.updateOne(
      { email },
      { $set: { otp: hashedOtp } }
    );

    // Send new OTP
    const user = await usercollection.findOne({ email });
    await sendotp(generatedOtp, email, user.name);

    // Reset timer
    req.session.otpStartTime = Date.now();
    req.session.otpError = null;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
   next(new AppError('Sorry...Something went wrong', 500));
  }
};


const logout = async (req, res) => {
  req.session.loginSession = null;
  req.session.signupSession = null;
  req.session.user = null;
  req.session.email =null;
  req.session.otpError = null;
  return res.redirect("/");
};

module.exports = {
  loadHome,
  loadLogin,
  loadSignup,
  otpPage,
  signup,
  otpPost,
  otpSend,
  login,
  googleCallback,
  blockedUser,
  about,
  contact,
  forgotPassword,
  forgotPasswordPost,
  verifyOtpGet,
  verifyOtppost,
  resetPasswordPage,
  resetPasswordPost,
  resendForgotOtp,
  logout,
};
