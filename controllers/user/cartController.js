const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const cartView = async (req, res) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer) {
      return res.redirect('/login');
    }
    
    const name = userVer.name;
    let wishlistCount = 0;
    let cartCount = 0;
    
    // Get cart items with product details
    let cartItems = await cart
      .find({ userId: userVer._id })
      .populate({
        path: 'productId',
        select: 'productName productOfferPrice productImage1 isListed productStock _id'
      })
      .sort({ createdAt: -1 });

    const availableItems = [];
    for (const item of cartItems) {
      if (!item.productId || 
          !item.productId.isListed || 
          item.productId.productStock <= 0) {
        // Remove unavailable items from cart
        await cart.findByIdAndDelete(item._id);
        continue;
      }

      // Adjust quantity to available stock
      const maxQuantity = item.productId.productStock;
      if (item.productQuantity > maxQuantity) {
        item.productQuantity = maxQuantity;
        await cart.updateOne(
          { _id: item._id },
          { $set: { productQuantity: maxQuantity } }
        );
      }
      
      availableItems.push(item);
    }

    // Update counts after filtering
    wishlistCount = await wishlist.countDocuments({ userId: userVer._id });
    cartCount = await cart.countDocuments({ userId: userVer._id });

    // Calculate cart totals
    let subtotal = 0;
    availableItems.forEach(item => {
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });

    const taxRate = 0.05;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return res.render('cart', { 
      name, 
      wishlistCount,
      cartCount,
      cartItems: availableItems, 
      subtotal, 
      tax, 
      total,
      user: req.session.user 
    });
  } catch (error) {
    console.log(error);
    res.status(500).render('error', { error: "Something went wrong" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    const quantity = parseInt(req.body.productQuantity) || 1;

    // Validate input
    if (!userId || !productId || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request parameters' 
      });
    }

    // Check if product exists and is available
    const productExists = await product.findOne({ 
      _id: productId, 
      isListed: true,
      productStock: { $gt: 0 } 
    });

    if (!productExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product not available' 
      });
    }

    // Check if requested quantity is available
    if (quantity > productExists.productStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${productExists.productStock} items available in stock` 
      });
    }

    // Check if product already in cart
    const existingCartItem = await cart.findOne({ 
      userId, 
      productId 
    });

    if (existingCartItem) {
      // Calculate new total quantity
      const newQuantity = existingCartItem.productQuantity + quantity;
      
      // Verify stock availability for new quantity
      if (newQuantity > productExists.productStock) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot add more than available stock (${productExists.productStock})` 
        });
      }

      // Update quantity if valid
      await cart.updateOne(
        { _id: existingCartItem._id },
        { $set: { productQuantity: newQuantity } }
      );

      // Remove from wishlist if exists
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

      // Remove from wishlist if exists
      await wishlist.deleteOne({
        userId: userId,
        productId: productId
      });
    }

    // Get updated cart count
    const updatedCartCount = await cart.countDocuments({ userId });

    res.json({ 
      success: true, 
      message: 'Product added to cart successfully',
      cartCount: updatedCartCount
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
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
    if (isNaN(numericQuantity)) {
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
        message: `Only ${maxQuantity} items available in stock`,
        maxQuantity: maxQuantity
      });
    }

    // Update quantity
    await cart.updateOne(
      { _id: id },
      { $set: { productQuantity: numericQuantity } }
    );

    // Get updated cart totals
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const cartItems = await cart.find({ userId: userVer._id }).populate('productId');
    
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });

    const taxRate = 0.05;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    res.json({ 
      success: true, 
      message: 'Cart updated successfully',
      itemTotal: (cartItem.productId.productOfferPrice * numericQuantity).toFixed(2),
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = { 
  cartView, 
  addToCart, 
  removeItem, 
  updateQuantity 
};