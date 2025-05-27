const mongoose=require('mongoose')

const otpSchema=new mongoose.Schema({
    email:{
        required:true,
        type:String,
    },
    otp:{
        type:String
    },
    name:{
        required:true,
        type:String
    },
    password:{
        required:true,
        type:String
    },
    phone:{
        required:true,
        type:Number,
    },
     referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: String,
        ref: 'users'
    },
    createdAt:{
        required:true,
        type:Date,
        default:Date.now()
    }

},
{
    timestamps:true
}
)

otpSchema.index({createdAt:1},{expireAfterSeconds:3600})

module.exports=mongoose.model('otp',otpSchema)