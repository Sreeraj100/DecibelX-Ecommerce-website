const express = require("express");
const adminController = require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController");
const adminAuth = require ("../middlewares/adminAuth")
const categoryController = require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController");
const orderController=require("../controllers/admin/orderController");
const offerController=require("../controllers/admin/offerController");
const couponController=require("../controllers/admin/couponController");
const salesController = require('../controllers/admin/salesController')

const multer = require('multer')
const upload = require('../helpers/multer')
const router = express.Router();

router.get("/",adminAuth,adminController.loadDashboard); 
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard",adminAuth, adminController.loadDashboard);
router.put('/filter', adminAuth, adminController.timePeriodFilter)
router.put('/clearfilter',adminAuth,adminController.clearDashFilter)
router.put('/filter-by-date',adminAuth,adminController.dashBoardDateWiseFilter)
router.get('/top-products', adminAuth, adminController.topProduct)
router.get('/top-category', adminAuth, adminController.topCategory)
router.get("/logout", adminController.logout);


//customer managment
router.get("/users",adminAuth,customerController.customerInfo);
router.post("/user/unlist/:id", adminAuth, customerController.unListUser);
router.post("/user/list/:id", adminAuth, customerController.listUser);

//Category
router.get("/category",adminAuth, categoryController.categoryPage)
router.post("/addcategory",adminAuth,categoryController.addCategory)
router.post("/categories/list/:id",adminAuth,categoryController.listCategory)
router.post("/categories/unlist/:id",adminAuth,categoryController.unListCategory)
router.put("/categories/edit",adminAuth,categoryController.editCategory)

// Product
router.get("/products",adminAuth,productController.productPage)
router.get("/addproduct",adminAuth,productController.addProduct)
router.post('/addProduct', upload.fields([{ name: 'productImage1', maxCount: 1 }, { name: 'productImage2', maxCount: 1 }, { name: 'productImage3', maxCount: 1 },{ name: 'productImage4', maxCount: 1 }]), productController.addProductPost);
router.get("/product/edit/:id",adminAuth,productController.productEdit)
router.post("/product/edit",upload.fields([{ name: 'productImage1', maxCount: 1 }, { name: 'productImage2', maxCount: 1 }, { name: 'productImage3', maxCount: 1 },{ name: 'productImage4', maxCount: 1 }]),productController.productEditPost)
router.post("/products/delete/:id", adminAuth, productController.deleteProduct);
router.post("/product/list/:id",adminAuth,productController.listProduct)
router.post("/product/unlist/:id",adminAuth,productController.unListProduct)
router.get("/products/search", adminAuth, productController.searchProducts);


// orders
router.get('/orders', adminAuth, orderController.orders)
router.get('/orderView/:id', adminAuth, orderController.orderView)
router.get('/editOrder/:id', adminAuth, orderController.editOrderView)
router.post('/editOrder/:id', adminAuth, orderController.editOrder)
router.post('/returnOrder', adminAuth, orderController.returnOrder)

// offer management
router.get('/offers', adminAuth, offerController.offerPage)
router.post('/addOffer', adminAuth, offerController.addOffer)
router.put('/editOffer', adminAuth, offerController.editOffer)

// coupon
router.get('/coupons', adminAuth, couponController.couponPage)
router.post('/addCoupon', adminAuth, couponController.addCoupon)
router.put('/editCoupon', adminAuth, couponController.editCoupon)
router.delete('/deleteCoupon', adminAuth, couponController.deleteCoupon)


//sales controller
router.get('/sales',adminAuth, salesController.getSalesReport);
router.post('/sales/filter/date',adminAuth, salesController.applyDateFilter);
router.post('/sales/filter/period',adminAuth, salesController.applyPeriodFilter);
router.post('/sales/filter/clear',adminAuth, salesController.clearSalesFilters);
router.get('/sales/report/pdf',adminAuth, salesController.generatePDF);
router.get('/sales/report/excel',adminAuth, salesController.generateExcel);


module.exports = router;