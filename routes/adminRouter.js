const express = require("express");
const adminController = require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController");
const adminAuth = require ("../middlewares/adminAuth")
const categoryController = require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController");
const orderController=require("../controllers/admin/orderController");

// const multer = require('multer')
const upload = require('../helpers/multer')
const router = express.Router();

router.get("/", adminController.loadDashboard);
router.get("/pageerror", adminController.pageerror);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminController.loadDashboard);
router.get("/logout", adminController.logout);


//customer managment
router.get("/users",adminAuth,customerController.customerInfo);
router.post("/user/unlist/:id", adminAuth, customerController.unListUser);
router.post("/user/list/:id", adminAuth, customerController.listUser);

//Category
router.get("/category",adminAuth, categoryController.categoryPage)
router.post("/addcategory",categoryController.addCategory)
router.post("/categories/list/:id",categoryController.listCategory)
router.post("/categories/unlist/:id",categoryController.unListCategory)
router.put("/categories/edit",categoryController.editCategory)

// Product
router.get("/products",adminAuth,productController.productPage)
router.get("/addproduct",adminAuth,productController.addProduct)
router.post('/addProduct', upload.fields([{ name: 'productImage1', maxCount: 1 }, { name: 'productImage2', maxCount: 1 }, { name: 'productImage3', maxCount: 1 },{ name: 'productImage4', maxCount: 1 }]), productController.addProductPost);
router.get("/product/edit/:id",adminAuth,productController.productEdit)
router.post("/product/edit",upload.fields([{ name: 'productImage1', maxCount: 1 }, { name: 'productImage2', maxCount: 1 }, { name: 'productImage3', maxCount: 1 },{ name: 'productImage4', maxCount: 1 }]),productController.productEditPost)
router.post("/products/delete/:id", adminAuth, productController.deleteProduct);
router.post("/product/list/:id",productController.listProduct)
router.post("/product/unlist/:id",productController.unListProduct)
router.get("/products/search", adminAuth, productController.searchProducts);


// orders
router.get('/orders', adminAuth, orderController.orders)
router.get('/orderView/:id', adminAuth, orderController.orderView)






module.exports = router;