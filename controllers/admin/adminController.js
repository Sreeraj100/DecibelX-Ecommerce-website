const AppError = require('../../middlewares/errorHandling')
const dashboardHelper = require('../../helpers/dashboardHelper')
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



const loadDashboard = async (req, res, next) => {
  try {
    const [
      completedOrders,
      ordersToShip,
      todayIncome,
      productCount,
      totalRevenue,
      monthlyRevenue,
      activeUsers,
      categoryRevenue,
      salesData,
    ] = await Promise.all([
      dashboardHelper.completedOrders(
        req.session.dashboardStart,
        req.session.dashboardEnd
      ),
      dashboardHelper.ordersToShip(
        req.session.dashboardStart,
        req.session.dashboardEnd
      ),
      dashboardHelper.todayIncome(),
      dashboardHelper.productCount(),
      dashboardHelper.totalRevenue(),
      dashboardHelper.monthlyRevenue(),
      dashboardHelper.activeUsers(),
      dashboardHelper.categoryRevenue(
        req.session.dashboardStart,
        req.session.dashboardEnd
      ),
      dashboardHelper.salesData(),
    ])
    let timePeriod = req.session.dashTimePeriod
    const start = req.session.dashboardStart
    const end = req.session.dashboardEnd
    if (!timePeriod) timePeriod = null
    return res.render('dashboard', {
      completedOrders,
      ordersToShip,
      todayIncome,
      productCount,
      totalRevenue,
      monthlyRevenue,
      activeUsers,
      categoryRevenue,
      salesData,
      timePeriod,
      start,
      end,
    })
  } catch (error) {
    console.log(error)
    next(new AppError('Sorry...Something went wrong', 500))
  }
}

const dashBoardDateWiseFilter = async (req, res, next) => {
  try {
    
    req.session.dashboardStart = req.body.startDate
    req.session.dashboardEnd = req.body.endDate
    req.session.dashTimePeriod = null
    return res.status(200).send({ success: true })
  } catch (error) {
    console.log(error)
    next(new AppError('Sorry...Something went wrong', 500))
  }
}

const timePeriodFilter = async (req, res, next) => {
  try {
    const today = new Date()
    req.session.dashboardEnd = today
    if (req.body.timePeriod == 'week') {
      const lastWeek = new Date()
      lastWeek.setDate(today.getDate() - 7)
      req.session.dashboardStart = lastWeek
    } else if (req.body.timePeriod == 'month') {
      const lastMonth = new Date()
      lastMonth.setMonth(today.getMonth() - 1)
      req.session.dashboardStart = lastMonth
    } else if (req.body.timePeriod == 'year') {
      const lastYear = new Date()
      lastYear.setFullYear(today.getFullYear() - 1)
      req.session.dashboardStart = lastYear
    }
    req.session.dashTimePeriod = req.body.timePeriod
    return res.status(200).send({ success: true })
  } catch (error) {
    console.log(error)
    next(new AppError('Sorry...Something went wrong', 500))
  }
}

const clearDashFilter = async (req, res, next) => {
  try {
    req.session.dashboardStart = null
    req.session.dashboardEnd = null
    req.session.dashTimePeriod = null
    return res.status(200).send({ success: true })
  } catch (error) {
    console.log(error)
    next(new AppError('Sorry...Something went wrong', 500))
  }
}


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
  dashBoardDateWiseFilter,
  timePeriodFilter,
  clearDashFilter,
};