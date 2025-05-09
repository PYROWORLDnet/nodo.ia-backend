const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter based on environment
let transporter;

if (process.env.NODE_ENV === 'production') {
  // Production email configuration
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
} else {
  // Development email configuration using Ethereal (fake SMTP service)
  // This will log email details to console instead of sending real emails
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.DEV_EMAIL_USER || 'ethereal_user',
      pass: process.env.DEV_EMAIL_PASS || 'ethereal_password',
    },
  });
}

// Function to initialize Ethereal account for development
const setupEtherealAccount = async () => {
  if (process.env.NODE_ENV !== 'production' && 
      (!process.env.DEV_EMAIL_USER || !process.env.DEV_EMAIL_PASS)) {
    try {
      // Create a test account on ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      
      // Log the test account details
      console.log('📧 Development email account created:');
      console.log(`Email: ${testAccount.user}`);
      console.log(`Password: ${testAccount.pass}`);
      console.log('View sent emails at: https://ethereal.email/messages');
      console.log('Add these values to your .env file as DEV_EMAIL_USER and DEV_EMAIL_PASS');
      
      // Update the transporter with the new credentials
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      return testAccount;
    } catch (error) {
      console.error('Failed to create ethereal test email account:', error);
    }
  }
  return null;
};

// Send email
const sendEmail = async (to, template) => {
  try {
    // Set up mail options
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Our Platform'}" <${process.env.EMAIL_FROM || 'noreply@ourplatform.com'}>`,
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };
    
    // Send mail
    const info = await transporter.sendMail(mailOptions);
    
    // Log URL for Ethereal in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 Email sent to ${to}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  setupEtherealAccount,
  sendEmail,
}; 