const firebaseService = require('../services/firebase-service');
const emailService = require('../services/email-service')
const _ = require('lodash');

const { TRANSFORMATION_TYPES } = require('../constants/transformation');

async function Email(req, res) {
    try {
        const { toAddress, subject, text, html } = req.body;
        const result = await emailService.sendEmail( toAddress, subject, text, html );
    }
    catch (err) {
        return res.status(500).send({error: err});
    }

    return res.status(500).send({});
}
module.exports = {
    Email,
};
  