const usercollection = require("../../models/userSchema")


const profile = async(req,res,next)=>{
    try {
        const userEmail = req.session.email
        const userVer = await usercollection.findOne({ email: userEmail });
        const name=userVer.name
        if(!userVer.isActive){
            return res.redirect("/blocked")
        } else {
            return res.render("profile",{userVer,name})
        }
    } catch (error) {
        console.log("profilePage error:",error)
    }
} 


module.exports = {profile}