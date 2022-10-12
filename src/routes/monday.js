const router = require('express').Router();
const { authenticationMiddleware } = require('../middlewares/authentication');
const mondayController = require('../controllers/monday-controller');

router.post('/monday/SubitemRenamed', mondayController.SubitemRenamed);
router.post('/monday/SubitemUpdated', mondayController.SubitemUpdated);
router.post('/monday/StoreBoardItemStatus', mondayController.StoreBoardItemStatus);
router.post('/monday/SupportItemUpdated', mondayController.UpdateSupportItem);
router.post('/monday/SupportItemDeleted', mondayController.DeleteSupportItem);
module.exports = router;
