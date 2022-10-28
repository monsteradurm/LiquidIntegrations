/* eslint-disable */
const nodemailer = require("nodemailer");
const _ = require('lodash');

const getSender = () => {
    const sender = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
            user: 'projectmgr@liquidanimation.com',
            pass: '7GDrG0ZtX8L3By1d3cc8vqIwuBnA7ogG7UTwyYIQ'
        },
        tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
    });

    sender.verify((error, success) => {
        if (error)
            throw error;
    });
}

const sendEmail = async (toAddress, subject, text, html) => {
    try {
        const sender = getSender();
        const result = await this.sender.sendMail({
            from: '"ProjectManager²" <projectmgr@liquidanimation.com>', // sender address
            to: toAddress, // list of receivers
            subject: subject, // Subject line
            text: text, // plain text body
            html: html // html body
        });
    } catch (err) {
        console.log("Error Sending Email: " + JSON.stringify(err))
    }
}


module.exports = {
    sendEmail
}