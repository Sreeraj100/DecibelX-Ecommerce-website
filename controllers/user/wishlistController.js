const usercollection = require("../../models/userSchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const wishlistPage = async (req, res,next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    if (!userVer) {
      return res.redirect('/login');
    }

    const name = userVer.name;
    let products = await wishlist
    .find({ userId: userVer._id })
    .populate({
      path: 'productId',
      select: 'productName productPrice productOfferPrice productImage1 productStock isListed _id',
      match: { isListed: true }
    })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance
    
    // Filter out products that might be null (due to population match)
    products = products
      .filter(item => item.productId)
      .map(item => ({
        ...item,
        product: item.productId
      }));
      const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
      const cartCount = await cart.countDocuments({ userId: userVer._id })
    res.render('wishlist', { 
      name, 
      products, 
      userVer,
      wishlistCount,
      cartCount,
      title: 'My Wishlist'
    });
  } catch (error) {
    console.error('Error in wishlistPage:', error);
     next(new AppError('Sorry...Something went wrong', 500));

  }
};

const editWishlist = async (req, res,next) => {
  try {
    const userId = req.session.userId || req.body.userId; // Get from session if not in body
    if (!userId || !req.body.productId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (req.body.wishlist) {
      const existingItem = await wishlist.findOne({
        userId: userId,
        productId: req.body.productId
      });
      
      if (existingItem) {
        return res.status(200).json({ success: true, isInWishlist: true });
      }

      const newData = new wishlist({
        userId: userId,
        productId: req.body.productId,
      });
      await newData.save();
      return res.status(200).json({ success: true, isInWishlist: true });
    } else {
      const result = await wishlist.deleteOne({
        userId: userId,
        productId: req.body.productId,
      });
      return res.status(200).json({ 
        success: result.deletedCount > 0,
        isInWishlist: false
      });
    }
  } catch (error) {
    console.error('Error in editWishlist:', error);
         next(new AppError('Sorry...Something went wrong', 500));

  }
};

// Update the route path in your router from '/romoveWishlist' to '/removeWishlist'
const deleteProduct = async (req, res,next) => {
  try {
    const userId = req.session.userId || req.body.userId;
    if (!userId || !req.body.productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const data = await wishlist.deleteOne({
      userId: userId,
      productId: req.body.productId,
    });
    
    return res.json({ 
      success: data.deletedCount > 0,
      message: data.deletedCount > 0 ? 'Product removed' : 'Product not found in wishlist'
    });
  } catch (error) {
    console.error('Error in deleteProduct:', error);
        next(new AppError('Sorry...Something went wrong', 500));

  }
};

const addAlltoCart = async (req, res,next) => {
  try {
    const userId = req.session.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    // Get wishlist items and populate product details (including stock)
    const wishlistData = await wishlist.find({ userId: userId }).populate('productId');
    
    if (wishlistData.length === 0) {
      return res.json({ 
        success: false, 
        message: 'Wishlist is empty' 
      });
    }

    const results = [];
    const outOfStockItems = [];
    
    for (const item of wishlistData) {
      try {
        // Check if product exists and has stock
        if (!item.productId || item.productId.stock <= 0) {
          outOfStockItems.push(item.productId._id);
          results.push({ 
            productId: item.productId._id, 
            success: false, 
            message: 'Product is out of stock' 
          });
          continue;
        }

        // Add to cart only if product has stock
        await cart.updateOne(
          { userId: item.userId, productId: item.productId._id },
          { $setOnInsert: { 
            userId: item.userId, 
            productId: item.productId._id,
            productQuantity: 1 
          }},
          { upsert: true }
        );
        
        results.push({ productId: item.productId._id, success: true });
      } catch (error) {
        results.push({ 
          productId: item.productId._id, 
          success: false, 
          error: error.message 
        });
      }
    }

    // Remove successfully added items from wishlist
    const successfulItems = results.filter(r => r.success);
    if (successfulItems.length > 0) {
      await wishlist.deleteMany({
        userId: userId,
        productId: { $in: successfulItems.map(i => i.productId) }
      });
    }

    // Prepare response
    const failedItems = results.filter(r => !r.success);
    const allFailedDueToStock = failedItems.length > 0 && 
                               failedItems.length === wishlistData.length &&
                               outOfStockItems.length === failedItems.length;

    if (allFailedDueToStock) {
      return res.json({ 
        success: false, 
        message: 'All products are out of stock',
        outOfStockItems 
      });
    }

    if (failedItems.length > 0) {
      console.error('Failed items:', failedItems);
      return res.json({ 
        success: failedItems.length !== wishlistData.length, // partial success
        message: failedItems.length === wishlistData.length 
          ? 'No products could be added to cart' 
          : 'Some items could not be added to cart',
        failedItems,
        outOfStockItems
      });
    }

    return res.json({ 
      success: true, 
      message: 'All products added to cart!' 
    });
  } catch (error) {
    console.error('Error in addAlltoCart:', error);
         next(new AppError('Sorry...Something went wrong', 500));

  }
};
module.exports = { 
  wishlistPage, 
  editWishlist, 
  deleteProduct, 
  addAlltoCart 
};