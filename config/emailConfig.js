const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use your preferred service
  auth: {
    // user: 'sachinjhaboss2003@gmail.com',    
    // pass: 'emayroajpvtdvejf'   
    user : 'foulathbcm@gmail.com',
    pass : 'njhngcjonhnxfubj'
  }
});

module.exports = transporter;
