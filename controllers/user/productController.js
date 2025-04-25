const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const singleProductView = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    let name = "";
    let isInWishlist = false;
    let userId = null;
    let wishlistCount=0
    let cartCount=0
    
    // Get user info if logged in
    if (userEmail) {
      const userVer = await usercollection.findOne({ email: userEmail });
      if (userVer) {
        name = userVer.name;
        userId = userVer._id;
        wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
        cartCount = await cart.countDocuments({ userId: userVer._id })
      }
    }

    const productId = req.params.id;
    const productDetails = await product
      .findById(productId)
      .populate("productCategoryId", "categoryName _id")
      .populate("productName productPrice productImage1");

    if (!productDetails) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    // Check if product is in user's wishlist
    if (userId) {
      const wishlistItem = await wishlist.findOne({
        userId: userId,
        productId: productId
      });
      isInWishlist = !!wishlistItem;
    }

    // Check stock status
    let stockStatus = "In Stock";
    if (productDetails.productStock <= 0) {
      stockStatus = "Out of Stock";
    } else if (productDetails.productStock < 10) {
      stockStatus = "Low Stock";
    }

    const categories = await category.find({ isListed: true });
    const listedCategoryIds = categories.map((cat) => cat._id);

    // Fetch related products
    const relatedProducts = await product.find({
        productCategoryId: productDetails.productCategoryId,
        isListed: true,
        isDeleted: false,
        _id: { $ne: productId },
      })
      .sort({ createdAt: -1 })
      .limit(5) 
      .populate({
        path: "productCategoryId",
        select: "categoryName isListed _id",
        match: { isListed: true },
      });

    res.render("product", {
      userId,
      name,
      product: productDetails,
      stockStatus,
      relatedProducts,
      isInWishlist,// Pass wishlist status to the view
      wishlistCount,
      cartCount, 
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop" },
        { name: productDetails.productName, url: `/product/${productId}` },
      ],
      title: productDetails.productName // Add page title for SEO
    });
  } catch (error) {
    console.error("productpage error:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};

module.exports = { singleProductView };