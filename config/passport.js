const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // console.log("Google Profile:", profile); // Debugging

        const email = profile.emails[0].value;
        const name = profile.displayName;
        
        let user = await User.findOne({ email });

        if (user) {
          // If user exists but doesn't have a googleId, update it
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }

          if (user.isBlocked) {
            return done(null, false, { message: "User is blocked by admin" });
          }
          return done(null, user);
        } else {
          user = new User({
            name,
            email,
            googleId: profile.id,
            isBlocked: false,
          });

          await user.save();
          return done(null, user);
        }
      } catch (error) {
        console.error("Google login error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

module.exports = passport;
