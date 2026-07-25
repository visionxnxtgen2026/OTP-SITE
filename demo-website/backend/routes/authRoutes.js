let express;
try {
  express = require('express');
} catch (_) {
  express = require('../../../server/node_modules/express');
}

const { getHealth, login, checkStatus } = require('../controllers/authController');

const router = express.Router();

router.get('/health', getHealth);
router.post('/login', login);
router.get('/status/:authId', checkStatus);

module.exports = router;
