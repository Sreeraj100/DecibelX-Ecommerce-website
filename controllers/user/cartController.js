const usercollection = require("../../models/userSchema");
const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const offer = require("../../models/offerSchema");
const AppError = require('../../middlewares/errorHandling');

const cartView = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer) {
      return res.redirect('/login');
    }
    
    const name = userVer.name;
    let wishlistCount = 0;
    let cartCount = 0;
    const currentDate = new Date();

    // Get listed categories and active offers
    const listedCategories = await category.find({ isListed: true });
    const listedCategoryIds = listedCategories.map(cat => cat._id);
    const activeOffers = await offer.find({
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate },
      categoryId: { $in: listedCategoryIds }
    });

    // Get cart items with product details
    let cartItems = await cart.find({ userId: userVer._id })
      .populate({
        path: 'productId',
        select: 'productName productPrice productOfferPrice productImage1 isListed productStock productCategoryId _id'
      })
      .sort({ createdAt: -1 });

    const availableItems = [];
    for (const item of cartItems) {
      if (!item.productId || !item.productId.isListed || item.productId.productStock <= 0) {
        await cart.findByIdAndDelete(item._id);
        continue;
      }

      // Apply pricing logic 
      const product = item.productId;
      const prices = [product.productPrice];
      
      if (product.productOfferPrice > 0) {
        prices.push(product.productOfferPrice);
      }

      const categoryOffer = activeOffers.find(offer => 
        offer.categoryId && 
        offer.categoryId.toString() === product.productCategoryId.toString()
      );

      if (categoryOffer) {
        const discountedPrice = product.productPrice * (1 - categoryOffer.offerPercentage / 100);
        prices.push(Number(discountedPrice.toFixed(2)));
      }

      product.productOfferPrice = Math.min(...prices);

      // Quantity validation
      const maxQuantity = product.productStock;
      if (item.productQuantity > maxQuantity) {
        item.productQuantity = maxQuantity;
        await cart.updateOne(
          { _id: item._id },
          { $set: { productQuantity: maxQuantity } }
        );
      }
      
      availableItems.push(item);
    }

    // Update counts
    wishlistCount = await wishlist.countDocuments({ userId: userVer._id });
    cartCount = await cart.countDocuments({ userId: userVer._id });

    // Calculate totals using updated productOfferPrice
    let subtotal = 0;
    availableItems.forEach(item => {
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });

    const taxRate = 0.18;
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
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;
    const quantity = parseInt(req.body.productQuantity) || 1;
    const MAX_ALLOWED_QUANTITY = 10;

    if (!userId || !productId || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request parameters' 
      });
    }

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

    if (quantity > productExists.productStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${productExists.productStock} items available in stock` 
      });
    }

    const existingCartItem = await cart.findOne({ 
      userId, 
      productId 
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.productQuantity + quantity;
      
      if (newQuantity > productExists.productStock) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot add more than available stock (${productExists.productStock})` 
        });
      }

      if (newQuantity > MAX_ALLOWED_QUANTITY) {
        return res.status(400).json({ 
          success: false, 
          message: `Maximum ${MAX_ALLOWED_QUANTITY} items allowed per product. You already have ${existingCartItem.productQuantity} in your cart.`,
          currentQuantity: existingCartItem.productQuantity,
          maxAllowed: MAX_ALLOWED_QUANTITY
        });
      }

      await cart.updateOne(
        { _id: existingCartItem._id },
        { $set: { productQuantity: newQuantity } }
      );

      await wishlist.deleteOne({
        userId: userId,
        productId: productId
      });      
    } else {
      if (quantity > MAX_ALLOWED_QUANTITY) {
        return res.status(400).json({ 
          success: false, 
          message: `Maximum ${MAX_ALLOWED_QUANTITY} items allowed per product.`,
          maxAllowed: MAX_ALLOWED_QUANTITY
        });
      }

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

    const updatedCartCount = await cart.countDocuments({ userId });

    res.json({ 
      success: true, 
      message: 'Product added to cart successfully',
      cartCount: updatedCartCount
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const removeItem = async (req, res, next) => {
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
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

const updateQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const MAX_ALLOWED_QUANTITY = 10;
    const currentDate = new Date();

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

    // Get active offers
    const listedCategories = await category.find({ isListed: true });
    const listedCategoryIds = listedCategories.map(cat => cat._id);
    const activeOffers = await offer.find({
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate },
      categoryId: { $in: listedCategoryIds }
    });

    const cartItem = await cart.findById(id).populate('productId');
    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    // Apply pricing logic
    const product = cartItem.productId;
    const prices = [product.productPrice];
    if (product.productOfferPrice > 0) prices.push(product.productOfferPrice);
    
    const categoryOffer = activeOffers.find(offer => 
      offer.categoryId && 
      offer.categoryId.toString() === product.productCategoryId.toString()
    );
    if (categoryOffer) {
      const discountedPrice = product.productPrice * (1 - categoryOffer.offerPercentage / 100);
      prices.push(Number(discountedPrice.toFixed(2)));
    }
    product.productOfferPrice = Math.min(...prices);

    const maxQuantity = Math.min(product.productStock, MAX_ALLOWED_QUANTITY);
    
    if (numericQuantity > maxQuantity) {
      let message = '';
      if (product.productStock <= MAX_ALLOWED_QUANTITY) {
        message = `Only ${product.productStock} items available in stock`;
      } else {
        message = `Maximum ${MAX_ALLOWED_QUANTITY} items allowed per order`;
      }
      
      return res.status(400).json({ 
        success: false, 
        message: message,
        maxQuantity: maxQuantity
      });
    }

    await cart.updateOne(
      { _id: id },
      { $set: { productQuantity: numericQuantity } }
    );

    // Recalculate totals for all items
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const cartItems = await cart.find({ userId: userVer._id }).populate('productId');
    
    let subtotal = 0;
    cartItems.forEach(item => {
      // Apply pricing to all items
      const itemPrices = [item.productId.productPrice];
      if (item.productId.productOfferPrice > 0) itemPrices.push(item.productId.productOfferPrice);
      
      const itemCategoryOffer = activeOffers.find(offer => 
        offer.categoryId && 
        offer.categoryId.toString() === item.productId.productCategoryId.toString()
      );
      if (itemCategoryOffer) {
        const discountedPrice = item.productId.productPrice * (1 - itemCategoryOffer.offerPercentage / 100);
        itemPrices.push(Number(discountedPrice.toFixed(2)));
      }
      item.productId.productOfferPrice = Math.min(...itemPrices);
      
      subtotal += item.productId.productOfferPrice * item.productQuantity;
    });

    const taxRate = 0.18;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    res.json({ 
      success: true, 
      message: 'Cart updated successfully',
      itemTotal: (product.productOfferPrice * numericQuantity).toFixed(2),
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    });
  } catch (error) {
    console.log(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
};

module.exports = { 
  cartView, 
  addToCart, 
  removeItem, 
  updateQuantity 
};