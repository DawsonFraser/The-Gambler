const pool = require('../config/database');

const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const userRes = await pool.query(
      'SELECT user_id, username, xp, balance, created_at, tier, referral_code FROM users WHERE username = $1',
      [username]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userProfile = userRes.rows[0];
    const userId = userProfile.user_id;

    const statsRes = await pool.query(
      `SELECT
          COUNT(*) AS total_bets,
          SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN winner_id IS NOT NULL AND winner_id != $1 THEN 1 ELSE 0 END) AS losses
        FROM p2p_bets
        WHERE (challenger_id = $1 OR opponent_id = $1) AND status = 'completed'`,
      [userId]
    );

    const fullProfile = {
      ...userProfile,
      wins: parseInt(statsRes.rows[0].wins) || 0,
      losses: parseInt(statsRes.rows[0].losses) || 0,
      total_p2p_bets: parseInt(statsRes.rows[0].total_bets) || 0
    };

    res.json(fullProfile);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getUserProfile,
};