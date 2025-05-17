const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const AppError = require("../../middlewares/errorHandling");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const offer = require("../../models/offerSchema");
const singleProductView = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    let name = "";
    let isInWishlist = false;
    let userId = null;
    let wishlistCount = 0;
    let cartCount = 0;
    const currentDate = new Date();
    
    // Get user info if logged in
    if (userEmail) {
      const userVer = await usercollection.findOne({ email: userEmail });
      if (userVer) {
        if (userVer.isActive === false) {
          req.session.block = true;
          return res.redirect("/blocked");
        }
        name = userVer.name;
        userId = userVer._id;
        wishlistCount = await wishlist.countDocuments({ userId: userVer._id });
        cartCount = await cart.countDocuments({ userId: userVer._id });
      }
    }

    const productId = req.params.id;
    
    // First get all listed categories
    const listedCategories = await category.find({ isListed: true });
    const listedCategoryIds = listedCategories.map(cat => cat._id);

    // Find product and ensure it's listed, not deleted, and from a listed category
    const productDetails = await product.findOne({
      _id: productId,
      isListed: true,
      isDeleted: false,
      productCategoryId: { $in: listedCategoryIds }
    })
    .populate({
      path: "productCategoryId",
      select: "categoryName _id",
      match: { isListed: true } // Ensure populated category is listed
    });

    if (!productDetails || !productDetails.productCategoryId) {
      return res.status(404).render("error", { message: "Product not found or unavailable" });
    }
   
    // Check if product is in user's wishlist
    if (userId) {
      const wishlistItem = await wishlist.findOne({
        userId: userId,
        productId: productId
      });
      isInWishlist = !!wishlistItem;
    }

    // Get active offers for the product's category
    const activeOffers = await offer.find({
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate },
      categoryId: productDetails.productCategoryId._id
    });

    // Function to calculate final price
    const calculateFinalPrice = (product) => {
      const prices = [product.productPrice];

      // Add product offer if exists
      if (product.productOfferPrice > 0) {
        prices.push(product.productOfferPrice);
      }

      // Add category offer if exists
      const categoryOffer = activeOffers.find(
        offer => offer.categoryId && 
        offer.categoryId.toString() === product.productCategoryId._id.toString()
      );

      if (categoryOffer) {
        const discountedPrice = 
          product.productPrice * (1 - categoryOffer.offerPercentage / 100);
        prices.push(Number(discountedPrice.toFixed(2)));
      }

      return Math.min(...prices);
    };

    // Calculate final price for main product
    productDetails.productOfferPrice = calculateFinalPrice(productDetails);

    // Fetch related products (only listed, not deleted, from listed categories)
    const relatedProducts = await product.find({
      productCategoryId: productDetails.productCategoryId._id,
      isListed: true,
      isDeleted: false,
      _id: { $ne: productId },
      productCategoryId: { $in: listedCategoryIds }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({
      path: "productCategoryId",
      select: "categoryName isListed _id",
      match: { isListed: true }
    })
    .then(products => products.filter(p => p.productCategoryId)); // Filter out products with unlisted categories

    // Calculate final prices for related products
    relatedProducts.forEach(product => {
      product.finalPrice = calculateFinalPrice(product);
    });

    // Check stock status
    let stockStatus = "In Stock";
    if (productDetails.productStock <= 0) {
      stockStatus = "Out of Stock";
    } else if (productDetails.productStock < 10) {
      stockStatus = "Low Stock";
    }

    res.render("product", {
      userId,
      name,
      product: productDetails,
      stockStatus,
      relatedProducts,
      isInWishlist,
      wishlistCount,
      cartCount, 
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop" },
        { name: productDetails.productName, url: `/product/${productId}` },
      ],
      title: productDetails.productName
    });
  } catch (error) {
    console.error("productpage error:", error);
     next(new AppError('Sorry...Something went wrong', 500));
  }
};

module.exports = { singleProductView };