const pool = require('../config/database');

const getLeaderboard = async (req, res) => {
    try {
        const leaderboardRes = await pool.query(
            `SELECT username, xp, tier, balance 
             FROM users 
             ORDER BY xp DESC 
             LIMIT 10`
        );
        res.json(leaderboardRes.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getLeaderboard,
};