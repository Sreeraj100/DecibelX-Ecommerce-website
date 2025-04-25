const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    addressCount: {
      type: Number,
    },
    doorNo: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    pinCode: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
    },
    type:{
      type: String,
      required: true,
    }
  },
  {
    timestamps: true,
  }
)

const address = mongoose.model('address', addressSchema)
module.exports = address
