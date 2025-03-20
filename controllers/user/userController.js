const bcrypt = require("bcrypt");
const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
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
    const products = await product.find({}).limit(4);
    const categories = await category.find({});

    if (req.session.loginSession || req.session.signupSession) {
      const userEmail = req.session.email;
      const userVer = await usercollection.findOne({ email: userEmail });
      if (userVer) {
        req.session.otpSession = false;
        if (!userVer.isActive) {
          return res.redirect("/blocked");
        } else {
          name = userVer.name;
          return res.render("home", { name, products, categories });
        }
      } else {
        return res.render("home", { name, products, categories });
      }
    } else {
      return res.render("home", { name, products, categories });
    }
  } catch (error) {
    console.log("Homepage error:", error);
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

const signup = async (req, res, next) => {
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

  }
};

const login = async (req, res, next) => {
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
  }
};
const googleCallback = async (req, res, next) => {
  try {
    // console.log("Hello");
    // console.log("User email:", req.user._json.email);

    const user = await usercollection.findOneAndUpdate(
      { email: req.user._json.email },
      { $set: { name: req.user.displayName } },
      { upsert: true, new: true }
    );
    // console.log("User updated/created:", user);

    // const userId = await usercollection.findOne({
    //   email: req.user._json.email,
    // });
    // console.log("User ID:", userId);

    req.session.email = req.user._json.email,
    
    req.session.loginSession = true;

    // console.log("Session user:", req.session.user);
    // console.log("Login session:", req.session.loginSession);

    return res.redirect("http://localhost:3000/");
  } catch (err) {
    console.error("Error in googleCallback:", err);
  
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
  if (req.session.loginSession || req.session.signupSession) {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer.isActive) {
      return res.redirect("/blocked");
    } else {
      name = userVer.name;
      return res.render("about", { name });
    }
  } else {
    return res.render("about", { name });
  }
};
const contact = async (req, res) => {
  let name = "";
  if (req.session.loginSession || req.session.signupSession) {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer.isActive) {
      return res.redirect("/blocked");
    } else {
      name = userVer.name;
      return res.render("contact", { name });
    }
  } else {
    return res.render("contact", { name });
  }
};
const logout = async (req, res) => {
  req.session.loginSession = null;
  req.session.signupSession = null;
  req.session.user = null;
  req.session.logError = null;
  req.session.signError = null;
  req.session.otp = null;
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
  logout,
};
