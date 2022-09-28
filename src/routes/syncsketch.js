const router = require('express').Router();
const syncsketchController = require('../controllers/syncsketch-controller');

router.post('/syncsketch/item_created', syncsketchController.ItemCreated);
router.post('/syncsketch/item_deleted', syncsketchController.ItemDeleted);
router.post('/syncsketch/review_created', syncsketchController.ReviewCreated);
router.post('/syncsketch/review_deleted', syncsketchController.ReviewDeleted);
router.post('/syncsketch/item_status_changed', syncsketchController.ItemStatusChanged);
module.exports = router;