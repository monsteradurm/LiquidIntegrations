const router = require('express').Router();
const { authenticationMiddleware } = require('../middlewares/authentication');
const mondayController = require('../controllers/monday-controller');

router.post('/monday/SubitemRenamed', mondayController.SubitemRenamed);
router.post('/monday/SubitemUpdated', mondayController.SubitemUpdated);
router.post('/monday/StoreBoardItemStatus', mondayController.StoreBoardItemStatus);
router.post('/monday/SupportItemUpdated', mondayController.UpdateSupportItem);
router.post('/monday/SupportItemDeleted', mondayController.DeleteSupportItem);
router.post('/monday/SupportItemComment', mondayController.SupportItemComment);
router.post('/monday/MondayItemComment', mondayController.MondayItemComment);
router.post('/monday/PersonColumnUpdated', mondayController.PersonColumnUpdated);
module.exports = router;
