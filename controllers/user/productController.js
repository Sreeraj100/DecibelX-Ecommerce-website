const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");

const singleProductView = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    let name =''
    console.log(userEmail);
    if(userEmail){
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

    // Calculate average rating
    //   const totalRatings = productDetails.reviews.length;
    //   const avgRating =
    //     totalRatings > 0
    //       ? productDetails.reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings
    //       : 0;
 console.log(productDetails)
    res.render("product", {
      name,
      product: productDetails,
      stockStatus,
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
