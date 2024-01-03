const firebaseService = require('../services/firebase-service');
const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'EmailController', level: 'info' });

async function GalleryWehook(req, res) {
    try {
        logger.info(JSON.stringify(req.body));

        const {trigger, source } = req.body;
        const id = source.id;

        switch(trigger) {
            case "FILE.UPLOADED":
            case "FILE.RESTORED":
            case "FILE.MOVED":
            case "SHARED_LINK.CREATED":
            case "SHARED_LINK.UPDATED":
            case "FILE.RENAMED": { 
                const result = firebaseService.StoreGalleryItem(id, source);
                return res.status(200).send(result);
            }
            
            case "FILE.TRASHED":
            case "FILE.DELETED": {
                const result = firebaseService.DeleteGalleryItem(id, source);
                return res.status(200).send(result);
            }
        }
    } catch (err) {
        logger.info("Could not execute Gallery Webhook: " + JSON.stringify(err));
    }

    return res.status(200).send({});
}

module.exports = {
    GalleryWehook,
  };
  