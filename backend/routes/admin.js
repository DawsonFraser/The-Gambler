const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.post('/games', [authMiddleware, adminMiddleware], adminController.addGame);

// --- ADD THIS NEW ROUTE ---
router.post('/games/settle', [authMiddleware, adminMiddleware], adminController.settleGame);

module.exports = router;