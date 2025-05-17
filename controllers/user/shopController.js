const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const AppError = require("../../middlewares/errorHandling");
const offer = require("../../models/offerSchema");
const cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const loadShopping = async (req, res, next) => {
  try {
    //Basic setup
    let name = "";
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    let wishlistCount = 0;
    let cartCount = 0;
    let userId = null;
    const currentDate = new Date();

    //Get listed categories
    const listedCategories = await category.find({ isListed: true });
    const listedCategoryIds = listedCategories.map((cat) => cat._id);

    // Get active category offers
    const activeOffers = await offer.find({
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate },
      categoryId: { $in: listedCategoryIds },
    });
    // console.log(activeOffers);

    // Build product query
    let query = {
      isListed: true,
      isDeleted: false,
      productCategoryId: { $in: listedCategoryIds },
    };

    // Search filter
    if (req.query.search) {
      query.productName = { $regex: req.query.search, $options: "i" };
    }

    // Category filter
    if (req.query.category) {
      const requestedCategories = req.query.category.split(",");
      query.productCategoryId = {
        $in: requestedCategories
          .map((id) => new mongoose.Types.ObjectId(id))
          .filter((id) =>
            listedCategoryIds.some((listedId) => listedId.equals(id))
          ),
      };
    }

    // Get products with populated categories
    let products = await product
      .find(query)
      .populate({
        path: "productCategoryId",
        match: { isListed: true },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate final prices
    products = products
      .filter((p) => p.productCategoryId) // Remove unlisted categories
      .map((product) => {
        const prices = [product.productPrice];

        // Add product offer if exists
        if (product.productOfferPrice > 0) {
          prices.push(product.productOfferPrice);
        }

        // Add category offer if exists
        const categoryOffer = activeOffers.find(
          (offer) =>
            offer.categoryId &&
            product.productCategoryId &&
            offer.categoryId.toString() ===
              product.productCategoryId._id.toString()
        );
// console.log(product.productCategoryId._id);
        if (categoryOffer) {
          // console.log("Applying discount:", categoryOffer.offerPercentage, "%");
          const discountedPrice =
            product.productPrice * (1 - categoryOffer.offerPercentage / 100);
          prices.push(Number(discountedPrice.toFixed(2)));
        }

        
        product.productOfferPrice = Math.min(...prices);
        return product;
      });

    if (req.session.email) {
      const user = await usercollection.findOne({ email: req.session.email });
      if (user) {
        if (!user.isActive) {
          req.session.block = true;
          return res.redirect("/blocked");
        }
        name = user.name;
        userId = user._id;
        wishlistCount = await wishlist.countDocuments({ userId });
        cartCount = await cart.countDocuments({ userId });
      }
    }

    // 8. Render page
    res.render("shop", {
      name,
      userId,
      products,
      categories: listedCategories,
      wishlistCount,
      cartCount,
      currentPage: page,
      totalPages: Math.ceil((await product.countDocuments(query)) / limit),
      req,
    });
  } catch (error) {
    console.error("Shop error:", error);
    next(new AppError("Something went wrong", 500));
  }
};

module.exports = { loadShopping };
