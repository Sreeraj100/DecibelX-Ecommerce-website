const mongoose=require("mongoose");
const {Schema}=mongoose;


const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        require:true,
        default:true
    }
},
{
    timestamps:true
})
const users=mongoose.model('users',userSchema)
module.exports=users