const bcrypt = require("bcrypt")
const usercollection = require("../../models/userSchema")
const product = require("../../models/productSchema")
const category = require("../../models/categorySchema");
const otpCollection = require("../../models/otp");
const sendotp = require('../../helpers/sendOtp')
const passport = require('passport');
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

const loadHome = async (req,res,next)=>{
    try{
        let name = ""      
        const products = await product.find({}).limit(4)
        const categories = await category.find({}).limit(5)

        if(req.session.loginSession || req.session.signupSession){
            const userEmail = req.session.email
            const userVer = await usercollection.findOne({ email: userEmail });
            if(userVer){
                req.session.otpSession = false
                if(!userVer.isActive){
                    return res.redirect("/blocked")
                } else {
                    name = userVer.name
                    return res.render("home",{name,products,categories})
                }
            } else {
                return res.render("home",{name,products,categories})
            }
        } else {
            return res.render("home",{name,products,categories})
        }
    }catch(error) {
        console.log(error)
        next(new AppError('Sorry...Something went wrong', 500));
    }
}

const loadLogin = async(req,res,next)=>{
    try {
        if(req.session.loginSession || req.session.signupSession){
            return res.redirect("/")
        } else {
            const logErr = req.session.logError
            res.render("login",{logErr})
        } 
    } catch (error){
        console.log(error)
        next(new AppError('Sorry...Something went wrong', 500));
    }
}

const loadSignup = async(req,res,next)=>{
    try {
        if(req.session.loginSession || req.session.signupSession){
            return res.redirect("/")
        } else {
            const signErr =  req.session.signError
            res.render("signup",{signErr})
        }
    } catch (error){
        console.log(error)
        next(new AppError('Sorry...Something went wrong', 500));
    }
}

const otpSend = async(req,res,next)=>{
    req.session.otpSession = true
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
    req.session.otpError = null
    req.session.otpTime = 75;  // Set it only if it's not already set
    const userData = await otpCollection.findOne({email:req.session.email})
    await otpCollection.updateOne({email:userData.email},{$set:{otp:generatedOtp}})
    await sendotp(generatedOtp,userData.email,userData.name)
    const hashedOtp = await securePassword(generatedOtp)
    await otpCollection.updateOne({email:req.session.email},{$set:{otp:hashedOtp}},{upsert:true})
    req.session.otpStartTime = null
    res.redirect("/otp")
}

const otpPage = async(req,res,next)=>{
    if(req.session.otpSession){
        const otpError = req.session.otpError
        // If OTP time isn't set, set it
        if (!req.session.otpStartTime) {
            req.session.otpStartTime = Date.now();
        }
        const elapsedTime = Math.floor((Date.now() - req.session.otpStartTime) / 1000);
        const remainingTime = Math.max(req.session.otpTime - elapsedTime, 0);
        return res.render("verify-otp",{otpError:otpError,time:remainingTime})
    } else {
        return res.redirect("/")
    }
} 


const otpPost = async(req,res,next)=>{
    const findOtp = await otpCollection.findOne({email:req.session.email})
    // console.log(req.body);
    // console.log(findOtp);
    if(await comparePassword(req.body.otp,findOtp.otp)){
        const newUser = new usercollection({
            email:findOtp.email,
            name:findOtp.name,
            password:findOtp.password,
            phone:findOtp.phone,
        })
        newUser.save()
        req.session.signupSession = true
        res.redirect("/")
    } else {
        req.session.otpError = "Incorrect OTP"
        res.redirect("/otp")
    }
}

const signup = async(req,res,next)=>{
    try{
        const userExists = await usercollection.findOne({ email: req.body.emailval });
        if (userExists) {
            return res.status(409).send({ "success": false });
        } else {
            const hashedPassword = await securePassword(req.body.passwordval)
            const result = await otpCollection.updateOne({email:req.body.emailval},{
                $set:{
                        name: req.body.fullname,
                        email: req.body.emailval,
                        phone: req.body.phone,
                        password: hashedPassword
                }
            },{upsert:true})
            // console.log(result);
            req.session.email=req.body.emailval
            return res.status(200).send({ success: true });
        }
    } catch (error){
        console.error("Signup error:", error);
        next(new AppError('Sorry...Something went wrong', 500));
    }
}

const login = async(req,res,next)=>{
    try{
        // console.log(req.body);
        const userData = await usercollection.findOne({ email: req.body.email });
        if (userData) {
            if (userData.password && await comparePassword(req.body.password,userData.password)) {
              req.session.loginSession = true;
              req.session.email = req.body.email
              return res.status(200).send({ success: true })
            } else {
                return res.status(208).send({ success: false })
            }
          } else {
            return res.status(208).send({ success: false })
          }
    } catch (error) {
        console.log(error);
        next(new AppError('Sorry...Something went wrong', 500));
    }
}

const googleCallback=async (req, res) => {
    try {
      const user = await usercollection.findOneAndUpdate(
        { email: req.user._json.email},
        { $set: { name: req.user.displayName} },
        { upsert: true, new :true }
      );
      const userId = await usercollection.findOne({ email:req.user._json.email })

      req.session.user = {
        email:req.user._json.email
      }
      // Set the user session
      req.session.loginSession = true
      // Redirect to the homepage
      res.redirect('/');
    } catch (err) {
      console.error(err);
      next(new AppError('Sorry...Something went wrong', 500));
    }
  } 


const blockedUser = async(req,res,next)=>{
    const user = await usercollection.findOne({ email: req.session.user.email })
    if(user.isActive == false){
        return res.render("blockedUser")
    } else {
        return res.redirect("/")
    }
}
const about = async (req, res) => {
    let name = ""; // Initialize name variable
    if (req.session.loginSession || req.session.signupSession) {
        const userEmail = req.session.email;
        const userVer = await usercollection.findOne({ email: userEmail });
        if (userVer) {
            name = userVer.name; // Set name if user is found
        }
    }
    return res.render("about", { name }); // Pass name to the view
}

const logout = async(req,res)=>{
    req.session.loginSession = null
    req.session.signupSession = null
    req.session.user = null
    req.session.logError = null
    req.session.signError = null
    req.session.otp = null
    req.session.otpError = null
    return res.redirect('/')
}



module.exports = {
    loadHome,
    loadLogin,
    loadSignup,
    otpPage,
    signup,
    otpPost,
    otpSend,
    login,
    googleCallback,
    blockedUser,
    about,
    logout,
}


// async function sendVerificationEmail(email, otp, name) {
//   try {
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.NODEMAILER_EMAIL,
//         pass: process.env.NODEMAILER_PASSWORD
//       }
//     });

//     const htmlTemplate = `
//       <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border-radius: 8px; background-color: #fafafa;">
//         <h2 style="color: #3a86ff; margin-bottom: 20px; text-align: center;">Verify Your Account</h2>
//         <p style="color: #333; font-size: 16px;">Hello ${name},</p>
//         <p style="color: #555; font-size: 16px;">Your verification code is:</p>
//         <div style="background-color: #f0f4ff; border-left: 4px solid #3a86ff; padding: 15px; margin: 15px 0; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 2px; color: #3a86ff;">
//           ${otp}
//         </div>
//         <p style="color: #555; font-size: 14px;">This code will expire in 1 minutes.</p>
//         <p style="color: #777; font-size: 14px; margin-top: 20px; text-align: center;">
//           Thank you,<br>DecibelX Team
//         </p>
//       </div>
//     `;

//     const textVersion = `Hello ${name}, Your verification code is: ${otp}. This code will expire in 10 minutes. Thank you, DecibelX Team`;

//     const info = await transporter.sendMail({
//       from: {
//         name: 'DecibelX',
//         address: process.env.NODEMAILER_EMAIL
//       },
//       to: email,
//       subject: "Your Verification Code",
//       text: textVersion,
//       html: htmlTemplate
//     });

//     // console.log("Email sent successfully"); 
//     return true;

//   } catch (error) {
//     console.error("Error sending email:", error.message);
//     return false;
//   }
// }