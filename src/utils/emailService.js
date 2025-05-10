const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
});

// Verify SMTP connection configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('SMTP server connection established successfully');
    return true;
  } catch (error) {
    console.error('SMTP server connection failed:', error);
    throw error;
  }
};

/**
 * Send an email using the configured SMTP transport
 * @param {string} to - Recipient email address
 * @param {Object} template - Email template object containing subject, html, and text
 * @returns {Promise} - Resolves when email is sent
 */
const sendEmail = async (to, template) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    
    // Log additional details in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  verifyEmailConfig
}; 