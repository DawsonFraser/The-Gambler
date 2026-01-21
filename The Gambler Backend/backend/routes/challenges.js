const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/challenges/today
// @desc    Get today's daily challenge
// @access  Private
router.get('/today', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await pool.query(
            'SELECT * FROM daily_challenges WHERE active_date = $1',
            [today]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST api/challenges/pick
// @desc    Submit a pick for a daily challenge
// @access  Private
router.post('/pick', authMiddleware, async (req, res) => {
    const { challengeId, pickedOption } = req.body;
    try {
        // Check if user has already picked
        const existingPick = await pool.query(
            'SELECT * FROM daily_picks WHERE user_id = $1 AND challenge_id = $2',
            [req.user.id, challengeId]
        );

        if (existingPick.rows.length > 0) {
            return res.status(400).json({ message: 'You have already made a pick for today\'s challenge.' });
        }

        // Insert new pick
        await pool.query(
            'INSERT INTO daily_picks (user_id, challenge_id, picked_option) VALUES ($1, $2, $3)',
            [req.user.id, challengeId, pickedOption]
        );
        res.status(201).json({ message: 'Pick submitted successfully!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;