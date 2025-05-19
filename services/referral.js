const usercollection = require("../models/userSchema");
const wallet = require("../models/walletSchema");

const generateReferralCode = async () => {
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingUser = await usercollection.findOne({ referralCode: code });
    if (!existingUser) isUnique = true;
  }
  return code;
};

const applyReferralBonus = async (referralCode, newUserEmail) => {
  const referrer = await usercollection.findOne({ referralCode });
  if (!referrer) return false;

  const existingWallet = await wallet.findOne({ userId: referrer._id });

  const transactionData = {
    transactionDate: new Date(),
    transactionAmount: 50,
    transactionType: "Credit on referral",
   
  };

  if (existingWallet) {
    await wallet.updateOne(
      { userId: referrer._id},
      {
        $inc: { walletBalance: 50 },
        $push: { walletTransaction: transactionData },
      },
      { session }
    );
  } else {
    await wallet.create([
      {
        userId: referrer._id,
        walletBalance: 50,
        walletTransaction: [transactionData],
      },
    ]);
  }

  // Initialize wallet if doesn't exist
  if (!referrer.wallet) {
    referrer.wallet = {
      balance: 0,
      transactions: [],
    };
  }


  referrer.referralCount += 1;
  await referrer.save();

  return true;
};

module.exports = { generateReferralCode, applyReferralBonus };
