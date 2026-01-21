const pool = require('../config/database');
const { awardXp } = require('../services/progressionService'); // Make sure this is linked

const addGame = async (req, res) => {
    const { home_team_id, away_team_id, game_time, week, home_team_line } = req.body;
    try {
        const away_team_line = -home_team_line;
        const newGame = await pool.query(
            `INSERT INTO games (home_team_id, away_team_id, game_time, week, home_team_line, away_team_line) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [home_team_id, away_team_id, game_time, week, home_team_line, away_team_line]
        );
        res.status(201).json({ message: 'Game added successfully', game: newGame.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error while adding game.' });
    }
};

// --- ADD THIS NEW FUNCTION ---
const settleGame = async (req, res) => {
    const { gameId, winningTeamId } = req.body;
    const XP_FOR_WINNING_PICK = 50; // You can change this value

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Update the game with the winner and set status to 'final'
        await client.query(
            "UPDATE games SET status = 'final', winner_id = $1 WHERE game_id = $2",
            [winningTeamId, gameId]
        );

        // Step 2: Find all users who picked the winner
        const winners = await client.query(
            'SELECT user_id FROM picks WHERE game_id = $1 AND picked_team_id = $2',
            [gameId, winningTeamId]
        );

        // Step 3: Award XP to each winner
        for (const winner of winners.rows) {
            await awardXp(client, winner.user_id, XP_FOR_WINNING_PICK, `Correct pick for game ${gameId}`);
        }

        await client.query('COMMIT');
        res.status(200).json({ 
            message: `Game ${gameId} settled. Awarded ${XP_FOR_WINNING_PICK} XP to ${winners.rows.length} users.` 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ message: 'Server error while settling game.' });
    } finally {
        client.release();
    }
};

module.exports = {
    addGame,
    settleGame, // --- AND EXPORT IT HERE ---
};