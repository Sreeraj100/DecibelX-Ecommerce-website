const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController");
const adminAuth = require ("../middlewares/adminAuth")
const categoryController = require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController");
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})


router.get("/pageerror", adminController.pageerror);
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
 

//product management
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/admin/addProducts",adminAuth,productController.addProduct)
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
// router.post("/addProductOffer",adminAuth,productController.addProductOffer);
// router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
// router.get("/blockProduct",adminAuth,productController.blockProduct);
// router.get("/unblockProduct",adminAuth,productController.unblockProduct);
// router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images"),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);


module.exports = router;