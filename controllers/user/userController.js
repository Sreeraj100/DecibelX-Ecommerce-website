const user = require("../../models/userSchema")
const nodemailer = require("nodemailer")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")



const loadHomepage = async (req, res) => {
  try {
    return res.render("home", { user: req.session.user });
  } catch (error) {
    console.log("Home page not found");
    res.status(500).send("Server error");
  }
};

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404")
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}



const loadSignup = async (req, res) => {
  try {
    //  if(req.session.user){
    //   res.redirect('/')
    //  } else {
    return res.render("signup");
    //  }
  } catch (error) {
    console.log("signup page not found");
    res.status(500).send("Server error")
  }
}



const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cpassword } = req.body;

    if (password !== cpassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await user.findOne({ email });

    if (findUser) {
      return res.render("signup", { message: "User already exists with this email" });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp, name);

    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };

    res.render("verify-otp");
  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/pageNotFound");
  }
};


function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendVerificationEmail(email, otp, name) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    });

    const htmlTemplate = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border-radius: 8px; background-color: #fafafa;">
        <h2 style="color: #3a86ff; margin-bottom: 20px; text-align: center;">Verify Your Account</h2>
        <p style="color: #333; font-size: 16px;">Hello ${name},</p>
        <p style="color: #555; font-size: 16px;">Your verification code is:</p>
        <div style="background-color: #f0f4ff; border-left: 4px solid #3a86ff; padding: 15px; margin: 15px 0; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 2px; color: #3a86ff;">
          ${otp}
        </div>
        <p style="color: #555; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #777; font-size: 14px; margin-top: 20px; text-align: center;">
          Thank you,<br>DecibelX Team
        </p>
      </div>
    `;

    const textVersion = `Hello ${name}, Your verification code is: ${otp}. This code will expire in 10 minutes. Thank you, DecibelX Team`;

    const info = await transporter.sendMail({
      from: {
        name: 'DecibelX',
        address: process.env.NODEMAILER_EMAIL
      },
      to: email,
      subject: "Your Verification Code",
      text: textVersion,
      html: htmlTemplate
    });

    // console.log("Email sent successfully");
    return true;

  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}


const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password encryption failed");
  }
};
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp) {
      return res.status(400).json({ 
        success: false, 
        message: "OTP session expired. Please request a new code." 
      });
    }

    if (otp === req.session.userOtp) {
      const User = req.session.userData;
      if (!User) {
        return res.status(400).json({ 
          success: false, 
          message: "User data not found in session. Please signup again." 
        });
      }

      const passwordHash = await securePassword(User.password);

      const saveUserData = new user({
        name: User.name,
        email: User.email,
        phone: User.phone,
        password: passwordHash,
        googleId: User.email
      });

      await saveUserData.save();

      // Set session user
      req.session.user = {
        id: saveUserData._id,
        name: saveUserData.name,
        email: saveUserData.email
      };

      // Clear session data after successful verification
      req.session.userOtp = null;
      req.session.userData = null;

      res.json({ success: true, redirectUrl: "/" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
    }
  } catch (error) {
    console.log("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};



const resendOtp = async (req, res) => {
  try {
      // Get user data from session
      const userData = req.session.userData;

      if (!userData || !userData.email) {
          console.log("Email not found in session");
          return res.status(400).json({ success: false, message: "Email not found in session. Please signup again." });
      }

      // Generate new OTP
      const otp = generateOtp();
      req.session.userOtp = otp; // Update session OTP
      console.log("New OTP generated:", otp);

      // Send email with OTP
      const emailSent = await sendVerificationEmail(userData.email, otp, userData.name);

      if (emailSent) {
          console.log("OTP resent successfully");
          return res.status(200).json({ success: true, message: "OTP Resent Successfully" });
      } else {
          console.log("Failed to send OTP email");
          return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
      }
  } catch (error) {
      console.log("Error resending OTP", error);
      res.status(500).json({ success: false, message: "Internal Server Error. Please try again" });
  }
};






const loadLogin = async (req, res) => {
  try {
    let message = req.query.message || "";
    if (!req.session.user) {
      return res.render("login", { message });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};



const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await user.findOne({ email: email, isAdmin: false });

    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }

    if (findUser.isBlocked) {
      req.session.destroy();
      return res.render("login", { message: "User is blocked by admin" });
    }

    if (findUser.password) {
      const passwordMatch = await bcrypt.compare(password, findUser.password);
      if (!passwordMatch) {
        return res.render("login", { message: "Incorrect Password" });
      }
    } else {
      req.session.destroy();
      return res.render("login", { message: "Please log in using Google" });
    }

    // Set session user
    req.session.user = {
      id: findUser._id,
      name: findUser.name,
      email: findUser.email
    };

    res.redirect("/");
  } catch (error) {
    res.render("login", { message: "Login failed. Please try again later" });
  }
};

const logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session:", err);
    }
    res.redirect("/");
  });
};


const loadShopping = async (req, res) => {
  try {
    //   const user = req.session.user;
    //   const page = parseInt(req.query.page) || 1; 
    //   const limit = 6; 


    //   const totalProducts = await Product.countDocuments({isBlocked: false});
    //   const totalPages = Math.ceil(totalProducts / limit);

    //   const skip = (page - 1) * limit;

    //   const product = await Product.find({isBlocked: false})
    //     .populate('category')
    //     .skip(skip)
    //     .limit(limit)
    //     .sort({ createdAt: -1 });  
    res.render("shop")
    //   res.render("user/shop", {
    //     product,
    //     login: user,
    //     currentPage: page,
    //     totalPages: totalPages,
    //     hasNextPage: page < totalPages,
    //     hasPrevPage: page > 1,
    //     nextPage: page + 1,
    //     prevPage: page - 1,
    //     lastPage: totalPages
    //   });
  } catch (error) {
    console.error('Shopping page error:', error);
    res.redirect("/pageNotFound");
  }
};




module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  loadShopping,
  verifyOtp,
  resendOtp,
  login,
  loadLogin,
  logout,
}

