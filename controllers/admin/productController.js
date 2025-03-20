const product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const path = require('path');
const fs = require('fs');

const productPage = async (req, res, next) => {
    try {
        const products = await product.find({ isDeleted: false }) // Exclude soft-deleted products
            .populate({
                path: "productCategoryId",
                select: "categoryName -_id"
            })
            .sort({ createdAt: -1 });

        return res.render("products", { products });
    } catch (error) {
        console.log("productPage error", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const addProduct = async(req,res,next)=>{
    try{
        const categories = await category.find({isListed: true}).sort({ createdAt: -1 })
        console.log(categories);
        res.render("add-product",{categories})
    } catch (error) {
        console.log("addProduct error:",error)
    }
}

const addProductPost = async (req,res,next) => {
    try {
        console.log("Hello");
        const productCheck = await  product.findOne({productName:{$regex: new RegExp('^'+req.body.productName +'$','i') }})
        
        if(productCheck){
            return res.status(208).send({ productExits: true, message: 'Product Already Exits!' })
        } else {
            const { productName, productDescription, productPrice, productOfferPrice, productStock, productCategoryId } = req.body;
            // Handle images (Multer automatically saves files to the 'uploads' directory)
            const images = req.files;
            const productImages = {};

            // Check for the presence of image files and store their paths
            if (images['productImage1']) {
                productImages.productImage1 = `/uploads/${images['productImage1'][0].filename}`;
            }
            if (images['productImage2']) {
                productImages.productImage2 = `/uploads/${images['productImage2'][0].filename}`;
            }
            if (images['productImage3']) {
                productImages.productImage3 = `/uploads/${images['productImage3'][0].filename}`;
            }
            if (images['productImage4']) {
                productImages.productImage4 = `/uploads/${images['productImage4'][0].filename}`;
            }

            // Create a new product document
            const newProduct = new product({
                productName,
                productDescription,
                productPrice,
                productOfferPrice,
                productStock,
                productCategoryId,
                productImage1: productImages.productImage1 || '',
                productImage2: productImages.productImage2 || '',
                productImage3: productImages.productImage3 || '',
                productImage4: productImages.productImage4 || '',
            });

            // Save the product to the database
            await newProduct.save();

            // Respond with success
            return res.json({ success: true, message: 'Product Added successfully!'});
        }        
    } catch (error) {
        console.log('Error adding product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const productEdit = async(req,res,next)=>{
    try {
        const id = req.params.id
        const products = await product.findById({_id: id}).populate({
            path: "productCategoryId",
            select: "categoryName -_id"
        });
        const categories = await category.find({}).sort({ createdAt: -1 })
        if(products){
            return res.render("edit-product",{products,categories})
        } else {
            return res.redirect("/admin/product")
        }
        
    } catch (error) {
        console.log('Error adding product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const productEditPost = async(req,res,next)=>{
    try{
        const productCheck = await product.find({productName:{$regex: new RegExp('^'+req.body.productName +'$','i') }});
        if((productCheck.length == 1 && req.body._id == productCheck[0]._id) || productCheck.length == 0){
            const images = req.files;
            const productImages = {};
            await product.updateOne({_id:req.body._id},{$set:{
                productName : req.body.productName,
                productCategoryId : req.body.productCategoryId,
                productPrice : req.body.productPrice,
                productOfferPrice : req.body.productOfferPrice,
                productStock : req.body.productStock,
                productDescription : req.body.productDescription
            }})
            if (images['productImage1']) {
                productImages.productImage1 = `/uploads/${images['productImage1'][0].filename}`;
                await product.updateOne({_id:req.body._id},{$set:{
                    productImage1: productImages.productImage1 || '',
                }})
            }
            if (images['productImage2']) {
                productImages.productImage2 = `/uploads/${images['productImage2'][0].filename}`;
                await product.updateOne({_id:req.body._id},{$set:{
                    productImage2: productImages.productImage2 || '',
                }})
            }
            if (images['productImage3']) {
                productImages.productImage3 = `/uploads/${images['productImage3'][0].filename}`;
                await product.updateOne({_id:req.body._id},{$set:{
                    productImage3: productImages.productImage3 || '',
                }})
            }
            if (images['productImage4']) {
                productImages.productImage4 = `/uploads/${images['productImage4'][0].filename}`;
                await product.updateOne({_id:req.body._id},{$set:{
                    productImage4: productImages.productImage4 || '',
                }})
            }
            return res.json({ success: true, message: 'Product Edited successfully!'});
        } else {
            return res.status(208).send({ productExits: true, message: 'Product Already Exits!' })
        }
    } catch(error){
        console.log("productEditPost error:",error)
    }
}

const unListProduct = async(req,res,next)=>{
    try {
        const productId = req.params.id;
        await product.updateOne({ _id:productId}, { isListed:false});
        res.json({ success: true, message: 'Product Unlisted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to list category.' });
    }
}

const listProduct = async(req,res,next)=>{
    try {
        const productId = req.params.id;
        await product.updateOne({ _id:productId}, { isListed:true});
        res.json({ success: true, message: 'Product Listed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to unlist category.' });
    }
}
const deleteProduct = async (req, res, next) => {
    try {
        const productId = req.params.id;
        // console.log(productId);
        // Find the product to check its current isDeleted status
        const productToDelete = await product.findById(productId);

        if (!productToDelete) {
            return res.json({ success: false, message: "Product not found" });
        }

        // Toggle isDeleted between true and false
        const newIsDeletedStatus = !productToDelete.isDeleted;

        // Update the product's isDeleted status
        await product.updateOne(
            { _id: productId },
            { $set: { isDeleted: newIsDeletedStatus } }
        );

        res.json({ 
            success: true, 
            message: `Product ${newIsDeletedStatus ? "soft deleted" : "restored"} successfully!`
        });
    } catch (error) {
        console.log("deleteProduct error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



const searchProducts = async (req, res, next) => {
    try {
        const query = req.query.q;
        const products = await product.find({
            productName: { $regex: query, $options: "i" }
        }).populate("productCategoryId");
        res.render("products", { products });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {productPage,addProduct,addProductPost,productEdit,productEditPost,unListProduct,listProduct,deleteProduct,searchProducts}