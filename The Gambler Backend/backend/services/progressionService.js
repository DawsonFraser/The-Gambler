const pool = require('../config/database');

const TIER_THRESHOLDS = {
  1: 2000,
  2: 5000,
  3: 10000,
};

const checkAndApplyRankUp = async (user) => {
  const nextTier = user.tier + 1;
  const xpNeeded = TIER_THRESHOLDS[user.tier];

  if (xpNeeded && user.xp >= xpNeeded) {
    console.log(`🎉 RANK UP! ${user.username} is going from tier ${user.tier} to ${nextTier}.`);

    const newXp = user.xp - xpNeeded;
    const updatedUserRes = await pool.query(
      'UPDATE users SET tier = $1, xp = $2 WHERE user_id = $3 RETURNING *',
      [newTier, newXp, user.user_id]
    );
    
    return updatedUserRes.rows[0];
  }

  return user;
};

const awardXp = async (userId, xpGained, reason = 'XP Gained') => {
  if (xpGained <= 0) {
    const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    return res.rows[0];
  }

  const updatedXpRes = await pool.query(
    'UPDATE users SET xp = xp + $1 WHERE user_id = $2 RETURNING *',
    [xpGained, userId]
  );

  let userAfterXp = updatedXpRes.rows[0];
  console.log(`XP Event: ${userAfterXp.username} gained ${xpGained} XP for "${reason}". New total: ${userAfterXp.xp}`);

  const userAfterRankCheck = await checkAndApplyRankUp(userAfterXp);
  return userAfterRankCheck;
};

module.exports = {
  awardXp,
};