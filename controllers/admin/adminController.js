const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
require("dotenv").config(); 

const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { message: null });
};

const login = async (req, res) => {
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

    req.session.admin = true;
    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.log("Login error:", error);
    return res.redirect("/pageerror");
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



const logout = (req, res) => {
  try {
      req.session.admin = false;
      res.redirect("/admin/login");
    }
   catch (error) {
    console.log("Logout error:", error);
    res.redirect("/pageerror");
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
};