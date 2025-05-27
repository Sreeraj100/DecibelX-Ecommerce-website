module.exports = async function (req,res,next) {
    if(req.session.admin){
        next()
    } else {
        return res.redirect("/admin/login")
    }
}