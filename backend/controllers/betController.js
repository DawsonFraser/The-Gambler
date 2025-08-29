const pool = require('../config/database');
const { awardXp } = require('../services/progressionService'); // Import our XP service!

// This is the rate at which you want to award XP. 
// For example, 0.1 means 1 XP for every 10 currency wagered.
const XP_RATE_FOR_BETS = 0.1;

/**
 * Places a bet for a user and awards them XP for participating.
 */
const placeBet = async (req, res) => {
    const { wager, game_id, outcome } = req.body;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start a transaction

        // Step 1: Check if the user has enough balance to place the bet
        const userBalanceQuery = await client.query('SELECT balance FROM users WHERE user_id = $1', [userId]);
        const userBalance = userBalanceQuery.rows[0].balance;

        if (userBalance < wager) {
            return res.status(400).json({ message: 'Insufficient balance to place bet.' });
        }

        // Step 2: Deduct the wager from the user's balance
        await client.query('UPDATE users SET balance = balance - $1 WHERE user_id = $2', [wager, userId]);

        // Step 3: Insert the bet into the 'bets' table
        await client.query(
            'INSERT INTO bets (user_id, wager, game_id, outcome, status) VALUES ($1, $2, $3, $4, \'active\')',
            [userId, wager, game_id, outcome]
        );

        // --- THIS IS THE IMPORTANT PART ---
        // Step 4: Calculate XP gained and call the progression service
        const xpFromWager = Math.floor(wager * XP_RATE_FOR_BETS);
        const finalUserObject = await awardXp(userId, xpFromWager, 'Bet Placed');
        // The 'awardXp' function handles both adding XP and the rank-up check!

        await client.query('COMMIT'); // Commit all changes if everything was successful

        res.status(201).json({
            message: 'Bet placed successfully!',
            user: finalUserObject // Send back the final user object, which may have a new rank
        });

    } catch (err) {
        await client.query('ROLLBACK'); // If any step fails, undo all changes
        console.error(err.message);
        res.status(500).json({ message: 'Server Error while placing bet' });
    } finally {
        client.release(); // Release the database client
    }
};

// We will add more functions here later, like for settling bets.
module.exports = {
    placeBet,
};