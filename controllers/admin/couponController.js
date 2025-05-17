const Coupon = require('../../models/couponSchema');
const AppError = require('../../middlewares/errorHandling');


const couponPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    
    const filter = searchQuery 
      ? { code: new RegExp(searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') } 
      : {};
    
    const coupons = await Coupon.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const totalCoupons = await Coupon.countDocuments(filter);
    const totalPages = Math.ceil(totalCoupons / limit);
    
    res.render('coupon', { 
      coupons, 
      currentPage: page, 
      totalPages,
      searchQuery
    });
    
  } catch (error) {
    next(new AppError('Failed to fetch coupons', 500));
  }
};


const addCoupon = async (req, res, next) => {
  try {
    const { code, percentage, startDate, expiryDate, minPurchase } = req.body;
   
    const percentageNum = Number(percentage);
 
    const existingCoupon = await Coupon.findOne({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') } 
    });
    
    if (existingCoupon) {
      return res.status(409).json({ 
        success: false, 
        message: 'Coupon code already exists',
        fieldErrors: { code: 'This coupon code already exists' }
      });
    }
    
    
    const newCoupon = await Coupon.create({
      code: code.toUpperCase(),
      percentage: percentageNum,
      startDate,
      expiryDate,
      minPurchase: minPurchase ? Number(minPurchase) : undefined,
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Coupon added successfully',
      coupon: newCoupon 
    });
    
  } catch (error) {
    console.error('Error adding coupon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create coupon',
      error: error.message
    });
  }
};


const editCoupon = async (req, res, next) => {
  try {
    const { id, code, percentage, startDate, expiryDate, minPurchase } = req.body;
    
   
    const percentageNum = Number(percentage);
    
    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Coupon not found' 
      });
    }
    
   
    const duplicateCoupon = await Coupon.findOne({
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (duplicateCoupon) {
      return res.status(409).json({ 
        success: false, 
        message: 'Coupon code already exists',
        fieldErrors: { code: 'This coupon code already exists' }
      });
    }
    
   
    const updateData = {
      code: code.toUpperCase(),
      percentage: percentageNum,
      startDate: new Date(startDate),
      expiryDate: new Date(expiryDate),
      minPurchase: minPurchase ? Number(minPurchase) : undefined
    };
    

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedCoupon) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update coupon' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Coupon updated successfully',
      coupon: updatedCoupon 
    });
    
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update coupon',
      error: error.message
    });
  }
};


const deleteCoupon = async (req, res, next) => {
  try {
    const { couponid } = req.query;
    
    const deletedCoupon = await Coupon.findByIdAndDelete(couponid);
    
    if (!deletedCoupon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Coupon not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Coupon deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete coupon',
      error: error.message
    });
  }
};

module.exports = { couponPage, addCoupon, editCoupon, deleteCoupon };