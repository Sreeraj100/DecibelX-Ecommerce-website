const bcrypt = require("bcrypt")
const usercollection = require("../../models/userSchema")
const AppError = require("../../middlewares/errorHandling")


async function securePassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

async function comparePassword(enteredPassword, storedPassword) {
    const isMatch = await bcrypt.compare(enteredPassword, storedPassword);
    return isMatch;
}


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
        console.log(error)
        next(new AppError('Sorry...Something went wrong', 500));
    }
} 


module.exports = {profile}