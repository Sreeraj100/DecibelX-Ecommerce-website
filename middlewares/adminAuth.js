module.exports = async function (req,res,next) {
    if(req.session.adminVer){
        next()
    } else {
        return res.redirect("/admin")
    }
}