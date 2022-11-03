/* eslint-disable */
const nodemailer = require("nodemailer");
const _ = require('lodash');
const firebaseService = require('./firebase-service');

const getSender = async () => {
    const entry = await firebaseService.GetKeyVaultEntry('projectmgr');
    const { user, pass } = entry;   
    console.log("FOUND KEY: " + user + " > " + pass);

    const sender = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
            user,
            pass
        },
        tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
    });

    sender.verify((error, success) => {
        if (error)
            throw error;

        console.log(JSON.stringify({error, success}));
    });

    return sender;
}

const sendEmail = async (toAddress, subject, text, html, attachments) => {
    try {
        const sender = await getSender();
        const result = await sender.sendMail({
            from: '"ProjectManager²" <projectmgr@liquidanimation.com>', // sender address
            to: toAddress, // list of receivers
            subject: subject, // Subject line
            text: text, // plain text body
            html: html, // html body,
            attachments
        });
    } catch (err) {
        console.log("Error Sending Email: " + JSON.stringify(err))
    }
}


module.exports = {
    sendEmail
}