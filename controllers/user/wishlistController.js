const usercollection = require("../../models/userSchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const wishlistPage = async (req, res) => {
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
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};

const editWishlist = async (req, res) => {
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
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update the route path in your router from '/romoveWishlist' to '/removeWishlist'
const deleteProduct = async (req, res) => {
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
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

const addAlltoCart = async (req, res) => {
  try {
    const userId = req.session.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const wishlistData = await wishlist.find({ userId: userId });
    
    if (wishlistData.length === 0) {
      return res.json({ 
        success: false, 
        message: 'Wishlist is empty' 
      });
    }

    const results = [];
    for (const item of wishlistData) {
      try {
        await cart.updateOne(
          { userId: item.userId, productId: item.productId },
          { $setOnInsert: { 
            userId: item.userId, 
            productId: item.productId,
            productQuantity: 1 
          }},
          { upsert: true }
        );
        results.push({ productId: item.productId, success: true });
      } catch (error) {
        results.push({ 
          productId: item.productId, 
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

    const failedItems = results.filter(r => !r.success);
    if (failedItems.length > 0) {
      console.error('Failed items:', failedItems);
      return res.json({ 
        success: false, 
        message: 'Some items could not be added to cart',
        failedItems 
      });
    }

    return res.json({ 
      success: true, 
      message: 'All products added to cart!' 
    });
  } catch (error) {
    console.error('Error in addAlltoCart:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};
module.exports = { 
  wishlistPage, 
  editWishlist, 
  deleteProduct, 
  addAlltoCart 
};