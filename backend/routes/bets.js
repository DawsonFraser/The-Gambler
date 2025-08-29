const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/bets/
// @desc    Place a new bet
// @access  Private
router.post('/', authMiddleware, betController.placeBet);

module.exports = router;