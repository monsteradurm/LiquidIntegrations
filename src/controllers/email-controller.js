const firebaseService = require('../services/firebase-service');
const emailService = require('../services/email-service');
const _ = require('lodash');
const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'EmailController', level: 'info' });

const { TRANSFORMATION_TYPES } = require('../constants/transformation');

async function Email(req, res) {
    try {
        const { toAddress, subject, text, html, attachments } = req.body;
        await emailService.sendEmail(toAddress, subject, text, html, attachments);
        logger.info({ toAddress, subject }, 'Email sent successfully');
        return res.status(200).send({});
    } catch (err) {
        logger.error({ err }, 'Error sending email');
        return res.status(500).send({ error: 'Internal Server Error' });
    }
}

module.exports = {
    Email,
};
  