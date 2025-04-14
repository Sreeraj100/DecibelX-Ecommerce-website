const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");

const singleProductView = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    let name = "";
    console.log(userEmail);
    if (userEmail) {
      const userVer = await usercollection.findOne({ email: userEmail });
      name = userVer.name;
    }

    const productId = req.params.id;
    const productDetails = await product
      .findById(productId)
      .populate("productCategoryId", "categoryName _id")
      .populate("productName productPrice productImage1");

    if (!productDetails) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    // Check stock status
    let stockStatus = "In Stock";
    if (productDetails.productStock <= 0) {
      stockStatus = "Out of Stock";
    } else if (productDetails.productStock < 10) {
      stockStatus = "Low Stock";
    }

    const categories = await category.find({ isListed: true });

    // Get only the category IDs that are listed
    const listedCategoryIds = categories.map((cat) => cat._id);

    // Fetch related products (same category, excluding current product)
    const relatedProducts = await product.find({
        productCategoryId: productDetails.productCategoryId, // Same category as current product
        isListed: true,
        isDeleted: false,
        _id: { $ne: productId }, // Exclude current product
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(4) // Get only 4 related products
      .populate({
        path: "productCategoryId",
        select: "categoryName isListed _id",
        match: { isListed: true }, // Ensure populated category is listed
      });

    res.render("product", {
      name,
      product: productDetails,
      stockStatus,
      relatedProducts, // Pass related products to the view
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop" },
        { name: productDetails.productName, url: `/product/${productId}` },
      ],
    });
  } catch (error) {
    console.error("productpage error:", error);
  }
};
module.exports = { singleProductView };
