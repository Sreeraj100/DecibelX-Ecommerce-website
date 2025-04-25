const usercollection = require("../models/userSchema");

module.exports = async function (req,res,next){
    try{
        
        if(req.session.loginSession || req.session.signupSession){
            const user = await usercollection.findOne({ email: req.session.email })
            if(user.isActive == false){
                return res.redirect("/blocked")
            } else {
            next()
            }
        }else{
           return res.redirect('/login')
        }
    }catch(err){
        console.log("middleware: ", err);
        
    }
}