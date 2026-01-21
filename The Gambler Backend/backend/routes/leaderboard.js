const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, leaderboardController.getLeaderboard);

module.exports = router;