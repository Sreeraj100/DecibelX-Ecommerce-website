const usercollection = require("../../models/userSchema");
const address = require("../../models/addressSchema");
const wishlist = require("../../models/wishlistSchema");
const cart = require("../../models/cartSchema");
const bcrypt = require("bcrypt");
async function securePassword(password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

async function comparePassword(enteredPassword, storedPassword) {
  const isMatch = await bcrypt.compare(enteredPassword, storedPassword);
  return isMatch;
}

const profile = async (req, res, next) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });
    const name = userVer.name;
    if (!userVer.isActive) {
      return res.redirect("/blocked");
    } else {
      const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
      const  cartCount = await cart.countDocuments({ userId: userVer._id })
      return res.render("profile", { userVer, name ,wishlistCount,cartCount});
    }
  } catch (error) {
    console.log("profilePage error:", error);
  }
};

const editProfile = async (req, res) => {
  try {
    if (!req.body.name || !req.body.phone) {
      return res.json({ success: false, message: "Name or Phone is empty" });
    }
    await usercollection.updateOne(
      { email: req.session.email },
      { $set: { name: req.body.name, phone: req.body.phone } }
    );
    return res.json({ success: true, message: "Pofile Updated!" });
  } catch (error) {
    console.log(error);
  }
};
const addressPage = async (req, res) => {
  try {
    const userEmail = req.session.email;
    const userVer = await usercollection.findOne({ email: userEmail });

    if (!userVer) {
      return res.status(404).render("error", { message: "User not found" });
    }
    const wishlistCount = await wishlist.countDocuments({ userId: userVer._id })
    const  cartCount = await cart.countDocuments({ userId: userVer._id })
    const addresses = await address
      .find({ userId: userVer._id })
      .sort({ isDefault: -1 });
    res.render("address", {
      userVer,
      addresses,
      wishlistCount,
      cartCount,
      name: userVer.name,
    });
  } catch (error) {
    console.error("Error in addressPage:", error);
    res.status(500).render("error", { message: "Server error" });
  }
};
const getAddressById = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const addressData = await address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!addressData) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.status(200).json({
      success: true,
      address: addressData,
    });
  } catch (error) {
    console.error("Error in getAddressById:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const addAddressPost = async (req, res) => {
  try {
    const {
      userId,
      doorNo,
      street,
      city,
      district,
      postcode,
      type,
      isDefault,
    } = req.body;

    // Validate required fields
    if (!doorNo || !street || !city || !district || !postcode) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate postcode format
    if (!/^\d{6}$/.test(postcode)) {
      return res.status(400).json({
        success: false,
        message: "Postcode must be 6 digits",
      });
    }

    // Check if user exists
    const user = await usercollection.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      await address.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = new address({
      userId,
      doorNo,
      street,
      city,
      district,
      pinCode: postcode,
      type: type || "Home",
      isDefault: !!isDefault,
    });

    await newAddress.save();

    return res.status(200).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Error in addAddressPost:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const editAddressPut = async (req, res) => {
  try {
    const addressId = req.params.id; // Get ID from URL parameter
    const { doorNo, street, city, district, postcode, type, isDefault } =
      req.body;

    // Validate required fields
    if (!doorNo || !street || !city || !district || !postcode) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate postcode format
    if (!/^\d{6}$/.test(postcode)) {
      return res.status(400).json({
        success: false,
        message: "Postcode must be 6 digits",
      });
    }

    // Verify address belongs to logged-in user
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });
    const existingAddress = await address.findById(addressId);

    if (
      !existingAddress ||
      existingAddress.userId.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      await address.updateMany(
        { userId: user._id, isDefault: true, _id: { $ne: addressId } },
        { $set: { isDefault: false } }
      );
    }

    const updatedAddress = await address.findByIdAndUpdate(
      addressId,
      {
        $set: {
          doorNo,
          street,
          city,
          district,
          pinCode: postcode, // Note: this should match your schema field name
          type: type || existingAddress.type,
          isDefault: !!isDefault,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Error in editAddressPut:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to logged-in user
    const addressToDelete = await address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!addressToDelete) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    // Prevent deletion of default address if it's the only address
    if (addressToDelete.isDefault) {
      const addressCount = await address.countDocuments({ userId: user._id });
      if (addressCount === 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the only default address",
        });
      }

      // If deleting default address, set another address as default
      const anotherAddress = await address
        .findOne({
          userId: user._id,
          _id: { $ne: addressId },
        })
        .sort({ createdAt: 1 });

      if (anotherAddress) {
        await address.findByIdAndUpdate(anotherAddress._id, {
          $set: { isDefault: true },
        });
      }
    }

    await address.findByIdAndDelete(addressId);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAddress:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userEmail = req.session.email;
    const user = await usercollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to logged-in user
    const addressToSetDefault = await address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!addressToSetDefault) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    // Remove default from other addresses
    await address.updateMany(
      { userId: user._id, isDefault: true, _id: { $ne: addressId } },
      { $set: { isDefault: false } }
    );

    // Set this address as default
    await address.findByIdAndUpdate(addressId, {
      $set: { isDefault: true },
    });

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
    });
  } catch (error) {
    console.error("Error in setDefaultAddress:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userE = req.session.email;
    const user = await usercollection.findOne({ email: userE });

    if (!(await comparePassword(req.body.currentPassword, user.password))) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect current password!" });
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match!" });
    }

    const newHashedPass = await securePassword(req.body.newPassword);
    await usercollection.updateOne(
      { email: req.session.email },
      { $set: { password: newHashedPass } }
    );

    return res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while changing password",
      });
  }
};

module.exports = {
  profile,
  editProfile,
  addressPage,
  addAddressPost,
  getAddressById,
  editAddressPut,
  setDefaultAddress,
  deleteAddress,
  changePassword,
};
