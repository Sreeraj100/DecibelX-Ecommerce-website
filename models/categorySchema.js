const mongoose = require('mongoose');
const {Schema}=mongoose;

const categorySchema=new mongoose.Schema({
     categoryName:{
          type:String,
          required:true
     },
     categoryDescription:{
          type:String,
          required:true
     },
     isListed:{
      type:Boolean,
      default:true,
     }
  },
  {
       timestamps:true
  })
  
  const category = mongoose.model('category',categorySchema)
  module.exports = category