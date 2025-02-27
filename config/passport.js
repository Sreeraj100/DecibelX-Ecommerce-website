const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log("Google user login attempt:", user.email, "Blocked:", user.isBlocked);

          if (user.isBlocked) {
            return done(null, false, { message: "User is blocked by admin" });
          }
          return done(null, user);
        } else {
          const namee =  profile.emails[0].value.split('@')[0], 

       
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
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