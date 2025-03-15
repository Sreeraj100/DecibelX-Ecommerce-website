const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
// const multer = require(".././../helpers/multer")
const fs = require("fs");
const path = require("path");

// Add Product Page
const getProductAddPage = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    res.render("product-add", { categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.redirect("/pageerror");
  }
};

// Helper function to process and save cropped images
const processCroppedImages = async (req) => {
  const uploadDir = path.join("public", "uploads", "product-image");
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const imagePaths = [];
  
  // Look for cropped image fields
  for (let i = 1; i <= 4; i++) {
    const fieldName = `croppedImage${i}`;
    if (req.files && req.files[fieldName]) {
      const file = req.files[fieldName];
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const extension = path.extname(file.name) || '.jpg';
      const filename = `product_${timestamp}_${random}${extension}`;
      const filepath = path.join(uploadDir, filename);
      
      // Save file
      await new Promise((resolve, reject) => {
        fs.writeFile(filepath, file.data, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Add to image paths
      imagePaths.push(filename);
    }
  }
  
  return imagePaths;
};

// Add Product
const addProducts = async (req, res) => {
  try {
    const { productName, description, category, regularPrice, salePrice } = req.body;

    // Validate required fields
    if (!productName || !description || !category || !regularPrice) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      });
    }

    // Validate productName
    if (productName.length < 3 || productName.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: "Product name must be between 3 and 100 characters" 
      });
    }

    // Validate description
    if (description.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: "Description must be at least 10 characters" 
      });
    }

    // Validate prices
    if (isNaN(regularPrice) || parseFloat(regularPrice) <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Regular price must be a positive number" 
      });
    }
    
    if (salePrice) {
      if (isNaN(salePrice) || parseFloat(salePrice) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Sale price must be a positive number" 
        });
      }
      
      if (parseFloat(salePrice) >= parseFloat(regularPrice)) {
        return res.status(400).json({ 
          success: false, 
          message: "Sale price must be less than regular price" 
        });
      }
    }

    // Check if product already exists
    const productExists = await Product.findOne({ 
      productName: { $regex: new RegExp("^" + productName + "$", "i") } 
    });
    
    if (productExists) {
      return res.status(400).json({ 
        success: false, 
        message: "Product with this name already exists" 
      });
    }

    // Validate category
    const categoryExists = await Category.findById(category);
    if (!categoryExists || !categoryExists.isListed) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or unlisted category" 
      });
    }

    // Process and save cropped images
    const productImages = await processCroppedImages(req);
    
    // Ensure at least one image is provided
    if (productImages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one product image is required" 
      });
    }

    // Save product to database
    const newProduct = new Product({
      productName,
      description,
      category,
      regularPrice: parseFloat(regularPrice),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      productImage: productImages,
      createdAt: new Date()
    });

    await newProduct.save();

    res.status(201).json({ 
      success: true, 
      message: "Product added successfully",
      productId: newProduct._id
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while adding product" 
    });
  }
};

// Get All Products
const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = {
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { description: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    };

    // Get products with pagination
    const productData = await Product.find(searchQuery)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .populate("category")
      .exec();

    // Get total count for pagination
    const count = await Product.countDocuments(searchQuery);

    // Get all categories for filter
    const categories = await Category.find({ isListed: true });

    res.render("products", {
      data: productData,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      categories,
      search
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/pageerror");
  }
};

// Get Product Details for Edit
const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate id format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }
    
    const product = await Product.findById(id).populate("category");
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    
    const categories = await Category.find({ isListed: true });
    
    res.render("product-edit", { product, categories });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/pageerror");
  }
};

// Edit Product
const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, description, category, regularPrice, salePrice } = req.body;

    // Validate required fields
    if (!productName || !description || !category || !regularPrice) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate productName
    if (productName.length < 3 || productName.length > 100) {
      return res.status(400).json({ success: false, message: "Product name must be between 3 and 100 characters" });
    }

    // Validate description
    if (description.length < 10) {
      return res.status(400).json({ success: false, message: "Description must be at least 10 characters" });
    }

    // Validate prices
    if (isNaN(regularPrice) || parseFloat(regularPrice) <= 0) {
      return res.status(400).json({ success: false, message: "Regular price must be a positive number" });
    }
    
    if (salePrice) {
      if (isNaN(salePrice) || parseFloat(salePrice) <= 0) {
        return res.status(400).json({ success: false, message: "Sale price must be a positive number" });
      }
      
      if (parseFloat(salePrice) >= parseFloat(regularPrice)) {
        return res.status(400).json({ success: false, message: "Sale price must be less than regular price" });
      }
    }

    // Check if product already exists with this name (excluding current product)
    const productExists = await Product.findOne({ 
      productName: { $regex: new RegExp("^" + productName + "$", "i") },
      _id: { $ne: id } 
    });
    
    if (productExists) {
      return res.status(400).json({ success: false, message: "Another product with this name already exists" });
    }

    // Get existing product
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Validate category
    const categoryExists = await Category.findById(category);
    if (!categoryExists || !categoryExists.isListed) {
      return res.status(400).json({ success: false, message: "Invalid or unlisted category" });
    }

    // Process and save new cropped images (if any)
    const newImages = await processCroppedImages(req);
    
    // Combine existing images with new ones
    const productImages = [...existingProduct.productImage];
    if (newImages.length > 0) {
      productImages.push(...newImages);
    }
    
    // Ensure at least one image
    if (productImages.length === 0) {
      return res.status(400).json({ success: false, message: "At least one product image is required" });
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        productName,
        description,
        category,
        regularPrice: parseFloat(regularPrice),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        productImage: productImages,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({ 
      success: true, 
      message: "Product updated successfully", 
      product: updatedProduct 
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Server error while updating product" });
  }
};

// Delete Single Image
const deleteSingleImage = async (req, res) => {
  try {
    const { imageName, productId } = req.body;

    // Validate inputs
    if (!imageName || !productId) {
      return res.status(400).json({ success: false, message: "Image name and product ID are required" });
    }

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if this is the only image
    if (product.productImage.length <= 1) {
      return res.status(400).json({ success: false, message: "Cannot delete the only product image" });
    }

    // Check if image exists for this product
    if (!product.productImage.includes(imageName)) {
      return res.status(404).json({ success: false, message: "Image not found for this product" });
    }

    // Remove image from product
    await Product.findByIdAndUpdate(productId, { $pull: { productImage: imageName } });

    // Delete image from server
    const imagePath = path.join("public", "uploads", "product-image", imageName);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ success: false, message: "Server error while deleting image" });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product to get images
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    
    // Delete all product images from server
    for (const imageName of product.productImage) {
      const imagePath = path.join("public", "uploads", "product-image", imageName);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete product from database
    await Product.findByIdAndDelete(id);
    
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Server error while deleting product" });
  }
};


const addProduct = async(req,res,next)=>{
  try {
    console.log(req.body)
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  getProductDetails,
  editProduct,
  deleteSingleImage,
  deleteProduct,
  addProduct
};