const pool = require('../config/database');

const getWeeklyGames = async (req, res) => {
    try {
        const gamesRes = await pool.query(
            `SELECT 
                g.game_id, g.game_time, g.home_team_line,
                ht.team_id as home_team_id, ht.team_name as home_team_name, ht.abbreviation as home_team_abbr,
                at.team_id as away_team_id, at.team_name as away_team_name, at.abbreviation as away_team_abbr
             FROM games g
             JOIN teams ht ON g.home_team_id = ht.team_id
             JOIN teams at ON g.away_team_id = at.team_id
             WHERE g.status = 'scheduled'
             ORDER BY g.game_time ASC`
        );
        res.json(gamesRes.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

const makePick = async (req, res) => {
    const { gameId, pickedTeamId } = req.body;
    const { id: userId } = req.user;

    if (!gameId || !pickedTeamId) {
        return res.status(400).json({ message: 'Game ID and picked team ID are required.' });
    }

    try {
        const newPick = await pool.query(
            'INSERT INTO picks (user_id, game_id, picked_team_id) VALUES ($1, $2, $3) RETURNING *',
            [userId, gameId, pickedTeamId]
        );
        res.status(201).json({ 
            message: 'Pick submitted successfully!',
            pick: newPick.rows[0] 
        });
    } catch (err) {
        if (err.code === '23505') { // Unique violation error code
            return res.status(400).json({ message: 'You have already made a pick for this game.' });
        }
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getWeeklyGames,
    makePick,
};