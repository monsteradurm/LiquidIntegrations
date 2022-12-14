const firebaseService = require('../services/firebase-service');
const emailService = require('../services/email-service')
const _ = require('lodash');

const { TRANSFORMATION_TYPES } = require('../constants/transformation');

async function Email(req, res) {
    try {
        const { toAddress, subject, text, html, attachments } = req.body;
        const result = await emailService.sendEmail( toAddress, subject, text, html, attachments );
        return res.status(200).send({})
    }
    catch (err) {
        console.log("ERROR: ", + JSON.stringify(err));
        return res.status(500).send({error: err});
    }
}
module.exports = {
    Email,
};
  