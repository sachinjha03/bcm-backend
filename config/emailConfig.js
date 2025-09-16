const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use your preferred service
  auth: {
    user: 'sachinjhaboss2003@gmail.com',       // Your service email address
    pass: 'emayroajpvtdvejf'    // App Password or actual password (preferably use App Password)
  }
});

module.exports = transporter;
