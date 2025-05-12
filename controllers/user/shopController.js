const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const AppError = require("../../middlewares/errorHandling");
const cart = require("../../models/cartSchema");
const mongoose = require('mongoose');
const loadShopping = async (req, res, next) => {
    try {
        let name = "";
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        let wishlistCount = 0
        let cartCount=0
        let userId=0
        // First get all listed categories
        const listedCategories = await category.find({ isListed: true });
        const listedCategoryIds = listedCategories.map(cat => cat._id);

        let query = { 
            isListed: true, 
            isDeleted: false,
            productCategoryId: { $in: listedCategoryIds } // Only products from listed categories
        };

        // Search functionality
        if (req.query.search) {
            query.productName = { $regex: req.query.search, $options: 'i' };
        }

        // Filter by category (only allow filtering by listed categories)
        if (req.query.category) {
            const requestedCategoryIds = req.query.category.split(',').map(id => new mongoose.Types.ObjectId(id));
            // Only include categories that are actually listed
            query.productCategoryId = { 
                $in: requestedCategoryIds.filter(id => listedCategoryIds.some(listedId => listedId.equals(id)))
            };
        }

        // Filter by price range
        if (req.query.minPrice && req.query.maxPrice) {
            query.productOfferPrice = { $gte: parseInt(req.query.minPrice), $lte: parseInt(req.query.maxPrice) };
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price-asc':
                    sortOption = { productOfferPrice: 1 };
                    break;
                case 'price-desc':
                    sortOption = { productOfferPrice: -1 };
                    break;
                case 'name-asc':
                    sortOption = { productName: 1 };
                    break;
                case 'name-desc':
                    sortOption = { productName: -1 };
                    break;
                default:
                    sortOption = { createdAt: -1 };
            }
        }

        const totalProducts = await product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        
        const products = await product.find(query)
            .populate({
                path: "productCategoryId",
                select: "categoryName isListed _id",
                match: { isListed: true } // Ensure populated category is listed
            })
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        // Only show listed categories to the user
        const categories = await category.find({ isListed: true });

        if (req.session.loginSession || req.session.signupSession) {
            const userEmail = req.session.email;
            const userVer = await usercollection.findOne({ email: userEmail });
            if (userVer) {
                if (userVer.isActive === false) {
                    req.session.block = true;
                    return res.redirect("/blocked");
                } else {
                    name = userVer.name;
                    userId = userVer._id
                    wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
                    cartCount = await cart.countDocuments({ userId: userVer._id })
                }
            }
        }

        res.render("shop", {
            name,
            userId,
            products: products.filter(p => p.productCategoryId), // Filter out products with unlisted categories
            categories,
            wishlistCount,
            cartCount,
            currentPage: page,
            totalPages,
            req,
        });
    } catch (error) {
        console.log("shopPage error:", error);
        next(new AppError('Sorry...Something went wrong', 500));
    }
};

module.exports = { loadShopping };
