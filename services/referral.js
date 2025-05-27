const crypto = require('crypto');
const usercollection = require('../models/userSchema');
const wallet = require('../models/walletSchema');


const generateReferralCode = async () => {
    let referralCode;
    let isUnique = false;
    
    while (!isUnique) {
        // Generate 8-character alphanumeric code
        referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // Check if code already exists
        const existingUser = await usercollection.findOne({ referralCode });
        if (!existingUser) {
            isUnique = true;
        }
    }
    
    return referralCode;
};


const processReferral = async (userId, referralCode) => {
    try {
        if (!referralCode) return null;

        // Find referring user
        const referringUser = await usercollection.findOne({ referralCode });
        if (!referringUser) return null;

        // Update referring user's referral count
        await usercollection.findByIdAndUpdate(referringUser._id, {
            $inc: { referralCount: 1 }
        });

        // Add ₹50 to referring user's wallet
        await wallet.findOneAndUpdate(
            { userId: referringUser._id },
            {
                $inc: { walletBalance: 50 },
                $push: {
                    walletTransaction: {
                        transactionAmount: 50,
                        transactionType: 'Credit on Referral'
                    }
                }
            },
            { upsert: true, new: true }
        );

        // Update new user's referredBy field
        await usercollection.findByIdAndUpdate(userId, {
            referredBy: referringUser._id
        });

        return referringUser._id;
    } catch (error) {
        console.error('Error processing referral:', error);
        throw error;
    }
};

module.exports = {
    generateReferralCode,
    processReferral
};