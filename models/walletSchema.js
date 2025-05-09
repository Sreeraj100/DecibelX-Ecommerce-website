const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'users' },
    walletBalance: { type: Number, default: 0 },
    walletTransaction: [
      {
        transactionDate: { type: Date, default: new Date() },
        transactionAmount: { type: Number },
        transactionType: {
          type: String,
          enum: [
            'Credit on Cancel',
            'Credit on Return',
            'Debit for Order',
            'Money from Razorpay',
          ],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

const wallet = mongoose.model('wallet', walletSchema)
module.exports = wallet
