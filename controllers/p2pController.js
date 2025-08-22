const pool = require('../config/database');
const { awardXp } = require('../services/progressionService');

module.exports = function(io) {
    return {
        createChallenge: async (req, res) => {
            const { opponentUsername, description, wager } = req.body;
            const challengerId = req.user.id;
            if (!opponentUsername || !description || !wager) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const wagerAmount = parseFloat(wager);
            if (isNaN(wagerAmount) || wagerAmount <= 0) {
                return res.status(400).json({ message: 'Invalid wager amount' });
            }
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const challengerRes = await client.query('SELECT balance FROM users WHERE user_id = $1', [challengerId]);
                if (challengerRes.rows[0].balance < wagerAmount) {
                    throw new Error('Insufficient funds');
                }
                const opponentRes = await client.query('SELECT user_id, username FROM users WHERE username = $1', [opponentUsername]);
                if (opponentRes.rows[length === 0]) {
                    throw new Error('Opponent not found');
                }
                const opponent = opponentRes.rows[0];
                
                await client.query('UPDATE users SET balance = balance - $1 WHERE user_id = $2', [wagerAmount, challengerId]);
                const newBet = await client.query(
                    'INSERT INTO p2p_bets (challenger_id, opponent_id, description, wager, status) VALUES ($1, $2, $3, $4, \'pending\') RETURNING *',
                    [challengerId, opponent.user_id, description, wagerAmount]
                );
                await client.query('COMMIT');
                
                // --- REAL-TIME NOTIFICATION ---
                const notification = {
                    bet_id: newBet.rows[0].bet_id,
                    description: description,
                    wager: wagerAmount,
                    challenger_name: req.user.username
                };
                io.to(opponent.user_id.toString()).emit('new_challenge', notification);
                
                res.status(201).json({ message: 'Challenge sent successfully!' });
            } catch (err) {
                await client.query('ROLLBACK');
                res.status(400).json({ message: err.message });
            } finally {
                client.release();
            }
        },

        getPendingChallenges: async (req, res) => {
            try {
                const results = await pool.query(
                    `SELECT p.bet_id, p.description, p.wager, u.username as challenger_name
                     FROM p2p_bets p
                     JOIN users u ON p.challenger_id = u.user_id
                     WHERE p.opponent_id = $1 AND p.status = 'pending'`,
                    [req.user.id]
                );
                res.json(results.rows);
            } catch (err) {
                res.status(500).json({ message: 'Server Error' });
            }
        },

        acceptChallenge: async (req, res) => {
            const betId = req.params.id;
            const opponentId = req.user.id;
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const betRes = await client.query('SELECT * FROM p2p_bets WHERE bet_id = $1', [betId]);
                if (betRes.rows.length === 0) throw new Error('Bet not found');
                
                const bet = betRes.rows[0];
                if (bet.opponent_id !== opponentId) throw new Error('You are not the opponent for this bet');
                if (bet.status !== 'pending') throw new Error('This bet is no longer pending');
                
                const opponentRes = await client.query('SELECT balance FROM users WHERE user_id = $1', [opponentId]);
                if (opponentRes.rows[0].balance < bet.wager) throw new Error('Insufficient funds to accept');
                
                await client.query('UPDATE users SET balance = balance - $1 WHERE user_id = $2', [bet.wager, opponentId]);
                await client.query("UPDATE p2p_bets SET status = 'accepted' WHERE bet_id = $1", [betId]);
                
                await client.query('COMMIT');
                
                // --- REAL-TIME NOTIFICATION ---
                io.to(bet.challenger_id.toString()).emit('challenge_accepted', { bet_id: bet.bet_id, opponent_name: req.user.username });
                
                res.json({ message: 'Challenge accepted!' });
            } catch (err) {
                await client.query('ROLLBACK');
                res.status(400).json({ message: err.message });
            } finally {
                client.release();
            }
        },
        
        getMyBets: async (req, res) => {
            try {
                const results = await pool.query(
                    `SELECT 
                        p.bet_id, p.description, p.wager, p.status, p.winner_id,
                        challenger.username AS challenger_name, opponent.username AS opponent_name
                     FROM p2p_bets p
                     JOIN users challenger ON p.challenger_id = challenger.user_id
                     JOIN users opponent ON p.opponent_id = opponent.user_id
                     WHERE (p.challenger_id = $1 OR p.opponent_id = $1)
                     ORDER BY p.created_at DESC`,
                    [req.user.id]
                );
                res.json(results.rows);
            } catch (err) {
                console.error(err.message);
                res.status(500).json({ message: 'Server Error' });
            }
        },

        settleBet: async (req, res) => {
            const betId = req.params.id;
            const reportingUserId = req.user.id;
            const { winnerId } = req.body;
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const betRes = await client.query('SELECT * FROM p2p_bets WHERE bet_id = $1', [betId]);
                if (betRes.rows.length === 0) throw new Error('Bet not found');

                const bet = betRes.rows[0];
                if (bet.status !== 'accepted') throw new Error('Bet must be in an accepted state to be settled.');
                if (bet.challenger_id !== reportingUserId && bet.opponent_id !== reportingUserId) throw new Error('You are not a participant in this bet.');
                if (bet.challenger_id !== winnerId && bet.opponent_id !== winnerId) throw new Error('Winner must be one of the participants.');
                
                const pot = parseFloat(bet.wager) * 2;
                
                await client.query('UPDATE users SET balance = balance + $1 WHERE user_id = $2', [pot, winnerId]);
                await client.query(
                    "UPDATE p2p_bets SET status = 'completed', winner_id = $1, settled_at = NOW() WHERE bet_id = $2",
                    [winnerId, betId]
                );
                
                await awardXp(winnerId, 100, 'P2P Bet Won');
                
                await client.query('COMMIT');
                res.json({ message: 'Bet resolved successfully!' });
            } catch (err) {
                await client.query('ROLLBACK');
                res.status(400).json({ message: err.message });
            } finally {
                client.release();
            }
        }
    };
};