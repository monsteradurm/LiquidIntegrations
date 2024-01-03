const nodemailer = require("nodemailer");
const _ = require('lodash');
const firebaseService = require('./firebase-service');
const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'EmailService', level: 'info' });

const getSender = async () => {
    try {
        const entry = await firebaseService.GetKeyVaultEntry('projectmgr');
        const { user, pass } = entry;   
        logger.info("KeyVault entry found for email sender");

        const sender = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            auth: { user, pass },
            tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
        });

        sender.verify((error, success) => {
            if (error) {
                logger.error({ error }, 'Error verifying email sender');
                throw error;
            }
            logger.info({ success }, 'Email sender verified successfully');
        });

        return sender;
    } catch (err) {
        logger.error({ err }, 'Error getting email sender');
        throw err;
    }
}

const sendEmail = async (toAddress, subject, text, html, attachments) => {
    try {
        logger.info({ attachments }, 'Preparing to send email');
        const sender = await getSender();
        const result = await sender.sendMail({
            from: '"ProjectManager²" <projectmgr@liquidanimation.com>',
            to: toAddress,
            subject: subject,
            text: text,
            html: html,
            attachments
        });
        logger.info({ toAddress, subject }, 'Email sent successfully');
    } catch (err) {
        logger.error({ err, toAddress, subject }, 'Error sending email');
    }
}

module.exports = {
    sendEmail
}