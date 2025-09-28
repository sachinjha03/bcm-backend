const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user : 'foulathbcm@gmail.com',
    pass : 'njhngcjonhnxfubj'
  }
});

module.exports = transporter;
