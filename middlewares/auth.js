const User = require("../models/userSchema")

const userAuth = async (req, res, next) => {
  try {
    if (req.path === "/login") {
      return next();
    }

    if (!req.session.user) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
            success: false,
            message: 'Please login to continue'
        });
    }
      return res.redirect("/login"); 
    }

    const user = await User.findById(req.session.user);
    if (!user || user.isBlocked) {
      req.session.destroy(); 
      return res.redirect("/login");
    }

    next(); 
  } catch (error) {
    console.error("Error in user auth middleware:", error);
    return res.status(500).send("Internal Server Error");
  }
};


const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
};

module.exports = {
  adminAuth,
};

module.exports={
    userAuth,
    adminAuth
}