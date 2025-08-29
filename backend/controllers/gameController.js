const pool = require('../config/database');

const getWeeklyGames = async (req, res) => {
    // For now, we'll get all scheduled games. Later, we can filter by week.
    try {
        const gamesRes = await pool.query(
            `SELECT 
                g.game_id,
                g.game_time,
                g.home_team_line,
                ht.team_name as home_team_name, 
                ht.abbreviation as home_team_abbr,
                at.team_name as away_team_name,
                at.abbreviation as away_team_abbr
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

module.exports = {
    getWeeklyGames,
};