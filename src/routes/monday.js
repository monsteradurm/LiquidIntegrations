const router = require('express').Router();
const { authenticationMiddleware } = require('../middlewares/authentication');
const mondayController = require('../controllers/monday-controller');

router.post('/monday/SubitemRenamed', mondayController.SubitemRenamed);
router.post('/monday/StoreBoardItemStatus', mondayController.StoreBoardItemStatus);
module.exports = router;
