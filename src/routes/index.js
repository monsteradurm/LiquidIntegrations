const router = require('express').Router();
const syncsketchRoutes = require('./syncsketch');
const mondayRoutes = require('./monday');
const boxRoutes = require('./box');
const emailRoutes = require('./email')

router.use(mondayRoutes);
router.use(syncsketchRoutes);
router.use(boxRoutes);
router.use(emailRoutes);

router.get('/', function (req, res) {
  res.json(getHealth());
});

router.get('/health', function (req, res) {
  res.json(getHealth());
  res.end();
});

function getHealth() {
  return {
    ok: true,
    message: 'Healthy',
  };
}

module.exports = router;
