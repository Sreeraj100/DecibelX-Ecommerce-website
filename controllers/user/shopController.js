const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const mongoose = require('mongoose');
const loadShopping = async (req, res, next) => {
    try {
        let name = "";
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        let query = { isListed: true, isDeleted: false };

        // Search functionality
        if (req.query.search) {
            query.productName = { $regex: req.query.search, $options: 'i' };
        }

        // Filter by category
        if (req.query.category) {
            const categoryIds = req.query.category.split(',').map(id => new mongoose.Types.ObjectId(id));
            query.productCategoryId = { $in: categoryIds };
        }

        // Filter by price range
        if (req.query.minPrice && req.query.maxPrice) {
            query.productOfferPrice = { $gte: parseInt(req.query.minPrice), $lte: parseInt(req.query.maxPrice) };
        }

        // Sorting
        let sortOption = {};
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price-asc':
                    sortOption = { productPrice: 1 };
                    break;
                case 'price-desc':
                    sortOption = { productPrice: -1 };
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
                select: "categoryName isListed _id"
            })
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const categories = await category.find({});
        if (req.session.loginSession || req.session.signupSession) {
            const userEmail = req.session.email;
            const userVer = await usercollection.findOne({ email: userEmail });
            if (userVer) {
                if (userVer.isActive === false) {
                    req.session.block = true;
                    return res.redirect("/blocked");
                } else {
                    name = userVer.name;
                }
            }
        }

        res.render("shop", {
            name,
            products,
            categories,
            currentPage: page,
            totalPages,
            req,
        });
    } catch (error) {
        console.log("shopPage error:", error);
    }
};

module.exports = { loadShopping };
