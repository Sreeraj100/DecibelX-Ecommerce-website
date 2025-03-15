const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },

    productDescription: {
      type: String,
    },
    productStock: {
      type: Number,
      required: true,
    },
    productPrice: {
      type: Number,
      required: true,
    },
    productOfferPrice: {
      type: Number,
    },
    productImage1: {
      type: String,
    },
    productImage2: {
      type: String,
    },
    productImage3: {
      type: String,
    },
    productCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    productBrandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "brand",
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const product = mongoose.model("product", productSchema);
module.exports = product;
