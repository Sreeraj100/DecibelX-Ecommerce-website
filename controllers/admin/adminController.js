const AppError = require('../../middlewares/errorHandling')
const bcrypt = require("bcrypt");
require("dotenv").config(); 



const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { message: null });
};

const login = async (req, res,next) => {
  try {
    const { email, password } = req.body;

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  
    if (email !== ADMIN_EMAIL) {
      return res.render("admin-login", { message: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD);
    if (!passwordMatch) {
      return res.render("admin-login", { message: "Invalid email or password" });
    }
    req.session.adminVer=true
    req.session.admin = true;
    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.log(" Admiin Login error:", error);
     next(new AppError('Sorry...Something went wrong', 500))
  }
};



const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      res.render("dashboard");
    } catch (error) {
      res.redirect("/pageerror");
    }
  } else {
    res.redirect("/admin/login");
  }
};



const logout = (req, res,next) => {
  try {
      req.session.admin = false;
      res.redirect("/admin/login");
    }
   catch (error) {
    console.log("Logout error:", error);
    next(new AppError('Sorry...Something went wrong', 500))
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  logout,
};