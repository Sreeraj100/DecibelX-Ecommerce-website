const category = require("../../models/categorySchema");
const offer = require("../../models/offerSchema");
const AppError = require('../../middlewares/errorHandling');


const offerPage = async (req, res, next) => {
  try {
    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    // Search setup
    const searchQuery = req.query.search || '';
    const regexPattern = new RegExp(searchQuery, 'i');
    
    // Aggregation pipeline
    const aggregationPipeline = [
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryData"
        }
      },
      {
        $unwind: {
          path: "$categoryData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: searchQuery ? {
          $or: [
            { "categoryData.categoryName": regexPattern },
            { email: regexPattern },
          ]
        } : {}
      },
      { $skip: skip },
      { $limit: limit },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          offerPercentage: 1,
          startDate: { $dateToString: { format: "%Y-%m-%d", date: "$startDate" } },
          expiryDate: { $dateToString: { format: "%Y-%m-%d", date: "$expiryDate" } },
          categoryName: "$categoryData.categoryName",
          categoryId: 1,
          status: {
            $cond: {
              if: { $gt: ["$expiryDate", new Date()] },
              then: "Active",
              else: "Expired"
            }
          }
        }
      }
    ];

    const [offers, totalOffers, categories] = await Promise.all([
      offer.aggregate(aggregationPipeline),
      offer.countDocuments(searchQuery ? {
        $or: [
          { "categoryData.categoryName": regexPattern },
          { email: regexPattern },
        ]
      } : {}),
      category.find({})
    ]);

    const totalPages = Math.ceil(totalOffers / limit);

    res.render('offer', { 
      offers, 
      categories, 
      currentPage: page, 
      totalPages,
      searchQuery
    });
    
  } catch (error) {
    console.error('Error in offerPage:', error);
    next(new AppError('Failed to load offer page', 500));
  }
};

const addOffer = async (req, res, next) => {
  try {
    const { categoryName, offerPercentage, startDate, expiryDate } = req.body;
    
    // Validation
    if (!categoryName || !offerPercentage || !startDate || !expiryDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    if (new Date(startDate) >= new Date(expiryDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expiry date must be after start date' 
      });
    }
    
    if (offerPercentage <= 0 || offerPercentage > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offer percentage must be between 1 and 100' 
      });
    }
    
    const existingOffer = await offer.findOne({ categoryId: categoryName });
    if (existingOffer) {
      return res.status(409).json({ 
        success: false, 
        message: 'Offer already exists for this category' 
      });
    }
    
    const newOffer = new offer({
      categoryId: categoryName,
      offerPercentage,
      startDate,
      expiryDate,
    });
    
    await newOffer.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Offer added successfully',
      offer: newOffer 
    });
    
  } catch (error) {
    console.error('Error in addOffer:', error);
    next(new AppError('Failed to add offer', 500));
  }
};

const editOffer = async (req, res, next) => {
  try {
    const { offerId, categoryName, offerPercentage, startDate, expiryDate } = req.body;
    
    // Validation
    if (!offerId || !categoryName || !offerPercentage || !startDate || !expiryDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    if (new Date(startDate) >= new Date(expiryDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expiry date must be after start date' 
      });
    }
    
    if (offerPercentage <= 0 || offerPercentage > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offer percentage must be between 1 and 100' 
      });
    }
    
    const existingOffers = await offer.find({ categoryId: categoryName });
    const isAnotherOffer = existingOffers.some(
      offer => offer._id.toString() !== offerId
    );
    
    if (isAnotherOffer) {
      return res.status(409).json({ 
        success: false, 
        message: 'Another offer already exists for this category' 
      });
    }
    
    const updatedOffer = await offer.findByIdAndUpdate(
      offerId,
      {
        categoryId: categoryName,
        offerPercentage,
        startDate,
        expiryDate,
      },
      { new: true }
    );
    
    if (!updatedOffer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Offer not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Offer updated successfully',
      offer: updatedOffer 
    });
    
  } catch (error) {
    console.error('Error in editOffer:', error);
    next(new AppError('Failed to update offer', 500));
  }
};

module.exports = { offerPage, addOffer, editOffer };