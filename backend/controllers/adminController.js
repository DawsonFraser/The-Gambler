const pool = require('../config/database');

const addGame = async (req, res) => {
    const { home_team_id, away_team_id, game_time, week, home_team_line } = req.body;

    if (!home_team_id || !away_team_id || !game_time || !week || !home_team_line) {
        return res.status(400).json({ message: 'All game fields are required.' });
    }

    try {
        const away_team_line = -home_team_line;

        const newGame = await pool.query(
            `INSERT INTO games (home_team_id, away_team_id, game_time, week, home_team_line, away_team_line) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [home_team_id, away_team_id, game_time, week, home_team_line, away_team_line]
        );

        res.status(201).json({
            message: 'Game added successfully',
            game: newGame.rows[0]
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error while adding game.' });
    }
};

module.exports = {
    addGame,
};