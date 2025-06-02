
const transporter = require('../services/otpSender');
const fs = require("fs");
const path = require("path");

// Read HTML template
const emailTemplatePath = path.join(__dirname, '/../public/otp.html');
const emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');

let sendOtp = async (otp, email, name) => {
    let personalizedHtml = emailTemplate.replace(`{{OTP}}`, otp);
    personalizedHtml = personalizedHtml.replace(`{{NAME}}`, name);
    try {
        await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL, // Use email from environment variables
            to: email,
            subject: 'Your OTP Code',
            html: personalizedHtml,
        });
        // console.log('OTP sent successfully!')
    } catch (err) {
        console.error('Failed to send OTP:', err.message);
        console.error('Error details:', err);
    }
};

module.exports = sendOtp;
 