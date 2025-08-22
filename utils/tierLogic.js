const TIER_THRESHOLDS = {
    'Diamond': 50000,
    'Platinum': 20000,
    'Gold': 10000,
    'Silver': 2000,
    'Bronze': 0
};

const getTierFromXP = (xp) => {
    if (xp >= TIER_THRESHOLDS.Diamond) return 'Diamond';
    if (xp >= TIER_THRESHOLDS.Platinum) return 'Platinum';
    if (xp >= TIER_THRESHOLDS.Gold) return 'Gold';
    if (xp >= TIER_THRESHOLDS.Silver) return 'Silver';
    return 'Bronze';
};

const addXpAndCheckTier = async (client, userId, xpToAdd) => {
    const userRes = await client.query(
        'UPDATE users SET xp = xp + $1 WHERE user_id = $2 RETURNING xp, tier',
        [xpToAdd, userId]
    );

    const { xp: newXpTotal, tier: currentTier } = userRes.rows[0];
    const newTier = getTierFromXP(newXpTotal);

    if (newTier !== currentTier) {
        await client.query('UPDATE users SET tier = $1 WHERE user_id = $2', [newTier, userId]);
    }

    return { newXpTotal, newTier };
};

module.exports = { addXpAndCheckTier };