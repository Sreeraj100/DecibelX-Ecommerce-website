const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");

const cartView = async (req, res) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name;
    let wishlistCount = 0
    let cartCount = 0
    let cartItems = await cart
      .find({ userId: userVer._id })
      .populate({
        path: 'productId',
        select: 'productName productOfferPrice productImage1 isListed productStock _id'
      })
      .sort({ createdAt: -1 });

    // Adjust quantities to available stock
    cartItems = cartItems.map((item) => {
      const productStock = item.productId?.productStock || 0;
      item.productQuantity = Math.min(item.productQuantity, productStock);
      return item;
    });

    wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
    cartCount = await cart.countDocuments({ userId: userVer._id })

    // Calculate cart totals
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });

    const taxRate = 0.05;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return res.render('cart', { 
      name, 
      wishlistCount,
      cartCount,
      cartItems, 
      subtotal, 
      tax, 
      total,
      user: req.session.user 
    });
  } catch (error) {
    console.log(error);
  }
};

const addToCart = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    const quantity = parseInt(req.body.productQuantity) || 1;

    // Check if product exists and is available
    const productExists = await product.findOne({ 
      _id: productId, 
      isListed: true 
    });

    if (!productExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product not available' 
      });
    }

    // Check if product already in cart
    const existingCartItem = await cart.findOne({ 
      userId, 
      productId 
    });

    if (existingCartItem) {
      // Update quantity if already in cart
      const newQuantity = existingCartItem.productQuantity + quantity;
      await cart.updateOne(
        { _id: existingCartItem._id },
        { $set: { productQuantity: newQuantity } }
      );

      await wishlist.deleteOne({
        userId: userId,
        productId: productId
      });      

    } else {
      // Add new item to cart
      await cart.create({
        userId,
        productId,
        productQuantity: quantity
      });

        await wishlist.deleteOne({
          userId: userId,
          productId: productId
        });
      
    }

    res.json({ 
      success: true, 
      message: 'Product added to cart successfully' 
    });
  } catch (error) {
    console.log(error);
   
  }
};

const removeItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid cart item ID' 
      });
    }

    const deletedItem = await cart.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Product removed from cart' 
    });
  } catch (error) {
    console.log(error);
  }
};

const updateQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!id || id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid cart item ID' 
      });
    }

    const numericQuantity = parseInt(quantity);
    if (isNaN(numericQuantity) ){
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid quantity' 
      });
    }

    // Check product stock
    const cartItem = await cart.findById(id).populate('productId');
    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    const maxQuantity = cartItem.productId.productStock;
    if (numericQuantity > maxQuantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${maxQuantity} items available in stock` 
      });
    }

    // Update quantity
    await cart.updateOne(
      { _id: id },
      { $set: { productQuantity: numericQuantity } }
    );

    res.json({ 
      success: true, 
      message: 'Cart updated successfully' 
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { 
  cartView, 
  addToCart, 
  removeItem, 
  updateQuantity 
};