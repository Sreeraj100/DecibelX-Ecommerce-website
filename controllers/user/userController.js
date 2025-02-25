const user =require("../../models/userSchema")


const loadHomepage =async (req,res)=>{
try {
    return res.render("home");

} catch (error) {
    console.log("Home page not found")
    res.status(500).sent("server error")
}

}
const pageNotFound = async (req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const loadSignup=async (req,res)=>{
    try{
      //  if(req.session.user){
      //   res.redirect('/')
      //  } else {
        return res.render("signup");
      //  }
    }catch(error){
      console.log("signup page not found");
      res.status(500).send("Server error")
    }
  }

const signup = async(req,res)=>{
  const {name,email,phone,password}=req.body
try {
const newUser = new user({name,email,phone,password})
// console.log(newUser);
// console.log("Form data received:", req.body);
  await newUser.save()
  return res.redirect("/signup")
} catch (error) {
  console.log("Error for save user",error);
  res.status(500).send("internal server error")
}

}


const loadShopping = async (req, res) => {
    try {
    //   const user = req.session.user;
    //   const page = parseInt(req.query.page) || 1; 
    //   const limit = 6; 
      
     
    //   const totalProducts = await Product.countDocuments({isBlocked: false});
    //   const totalPages = Math.ceil(totalProducts / limit);
      
    //   const skip = (page - 1) * limit;
      
    //   const product = await Product.find({isBlocked: false})
    //     .populate('category')
    //     .skip(skip)
    //     .limit(limit)
    //     .sort({ createdAt: -1 });  
      res.render("shop")
    //   res.render("user/shop", {
    //     product,
    //     login: user,
    //     currentPage: page,
    //     totalPages: totalPages,
    //     hasNextPage: page < totalPages,
    //     hasPrevPage: page > 1,
    //     nextPage: page + 1,
    //     prevPage: page - 1,
    //     lastPage: totalPages
    //   });
    } catch (error) {
      console.error('Shopping page error:', error);
      res.redirect("/pageNotFound");
    }
  };



module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    loadShopping,
}

