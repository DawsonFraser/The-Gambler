const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/weekly', authMiddleware, gameController.getWeeklyGames);

// --- ADD THIS NEW ROUTE ---
router.post('/pick', authMiddleware, gameController.makePick);

module.exports = router;