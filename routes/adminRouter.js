const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController");
const {userAuth,adminAuth}=require("../middlewares/auth");
const categoryController = require("../controllers/admin/categoryController")

router.post("/pageerror", adminController.pageerror);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminController.loadDashboard);
router.get("/logout", adminController.logout);


//customer managment
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerUnBlocked);

//category managment
router.get("/Category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);
 

module.exports = router;