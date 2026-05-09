const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('./logger');

let transporter;

const getTransporter = () => {
    if (transporter) return transporter;
    transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass
        }
    });
    return transporter;
};

const otpSubjectByPurpose = {
    register: 'Your MES registration OTP',
    login: 'Your MES login OTP'
};

const sendOtpEmail = async ({ to, otp, purpose = 'login' }) => {
    if (!config.smtp.user || !config.smtp.pass || !config.smtp.fromEmail) {
        const error = new Error('SMTP is not configured. Set SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.');
        error.statusCode = 500;
        throw error;
    }

    const transporterInstance = getTransporter();
    const subject = otpSubjectByPurpose[purpose] || 'Your MES OTP';
    const expiryMinutes = config.otp.expiryMinutes;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #111;">
            <h2>MES Security Verification</h2>
            <p>Your one-time password is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
            <p>This OTP expires in ${expiryMinutes} minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        </div>
    `;

    await transporterInstance.sendMail({
        from: config.smtp.fromEmail,
        to,
        subject,
        text: `Your OTP is ${otp}. It expires in ${expiryMinutes} minutes.`,
        html
    });

    logger.info(`OTP email sent to ${to} for ${purpose}`);
};

module.exports = { sendOtpEmail };
