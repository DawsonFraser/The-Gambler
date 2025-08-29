const pool = require('../config/database');
const { awardXp } = require('../services/progressionService'); // Import our XP service!

/**
 * Gets the active daily challenge for today.
 */
const getTodaysChallenge = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10); // Gets date in YYYY-MM-DD format
        const result = await pool.query(
            "SELECT * FROM daily_challenges WHERE active_date = $1 AND status = 'active'",
            [today]
        );

        if (result.rows.length === 0) {
            return res.json(null); // No active challenge today
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Allows a user to submit their pick for a challenge.
 */
const submitPick = async (req, res) => {
    const { challengeId, pickedOption } = req.body;
    const userId = req.user.id;

    try {
        // Check if the user has already made a pick for this challenge
        const existingPick = await pool.query(
            'SELECT * FROM daily_picks WHERE user_id = $1 AND challenge_id = $2',
            [userId, challengeId]
        );

        if (existingPick.rows.length > 0) {
            return res.status(400).json({ message: 'You have already made a pick for this challenge.' });
        }

        // Insert the user's new pick into the database
        await pool.query(
            'INSERT INTO daily_picks (user_id, challenge_id, picked_option) VALUES ($1, $2, $3)',
            [userId, challengeId, pickedOption]
        );
        
        res.status(201).json({ message: 'Pick submitted successfully!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Marks a challenge as complete and awards XP to all winners.
 * This is the function an admin would call.
 */
const completeChallenge = async (req, res) => {
    const { challengeId, winningOption } = req.body;

    try {
        // First, find all the users who picked the winning option
        const winnersQuery = await pool.query(
            'SELECT user_id FROM daily_picks WHERE challenge_id = $1 AND picked_option = $2',
            [challengeId, winningOption]
        );
        
        const winners = winnersQuery.rows;
        if (winners.length === 0) {
            console.log('No winners for this challenge.');
        }

        // Get the challenge details to find the XP reward
        const challengeQuery = await pool.query('SELECT xp_reward FROM daily_challenges WHERE challenge_id = $1', [challengeId]);
        const xpReward = challengeQuery.rows[0]?.xp_reward || 50; // Default to 50 XP if not specified

        // Loop through all the winners and award them XP using our service
        for (const winner of winners) {
            await awardXp(winner.user_id, xpReward, 'Daily Challenge Winner');
        }

        // Finally, mark the challenge as completed in the database
        await pool.query(
            "UPDATE daily_challenges SET status = 'completed', winning_option = $1 WHERE challenge_id = $2",
            [winningOption, challengeId]
        );
        
        res.status(200).json({ message: `Challenge completed. ${winners.length} users were awarded ${xpReward} XP.` });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error while completing challenge' });
    }
};

module.exports = {
    getTodaysChallenge,
    submitPick,
    completeChallenge
};