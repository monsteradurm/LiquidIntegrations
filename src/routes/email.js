const router = require('express').Router();
const emailController = require('../controllers/email-controller');

router.post('/email', emailController.Email);
module.exports = router;
