const router = require('express').Router();
const { authenticationMiddleware } = require('../middlewares/authentication');
const boxController = require('../controllers/box-controller');

router.post('/box/GalleryWebhook', boxController.GalleryWehook);
module.exports = router;
