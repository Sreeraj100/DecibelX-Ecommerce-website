const mongoose = require('mongoose')

const ordersSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    address: {
      type: Object,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    products: {
      type: Array,
      required: true,
    },
    priceDetails: {
      type: Object,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    orderNotes: {
      type: String,
    },
    status: {
      type: String,
      default: 'Pending',
    },
    deliveryDate: {
      type: Date,
    },
    returnReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

const orders = mongoose.model('orders', ordersSchema)
module.exports = orders
