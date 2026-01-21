const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/add', authMiddleware, async (req, res) => {
    const { username: friendUsername } = req.body;
    const userId = req.user.id;

    if (!friendUsername) {
        return res.status(400).json({ message: 'Username is required.' });
    }

    try {
        const friendResult = await pool.query('SELECT user_id FROM users WHERE username = $1', [friendUsername]);
        if (friendResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const friendId = friendResult.rows[0].user_id;

        if (userId === friendId) {
            return res.status(400).json({ message: 'You cannot add yourself as a friend.' });
        }

        const existingFriendship = await pool.query(
            'SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
            [userId, friendId]
        );

        if (existingFriendship.rows.length > 0) {
            return res.status(400).json({ message: 'A friendship or pending request already exists.' });
        }

        await pool.query(
            'INSERT INTO friendships (user_id_1, user_id_2, status, action_user_id) VALUES ($1, $2, $3, $4)',
            [userId, friendId, 'pending', userId]
        );

        res.status(201).json({ message: 'Friend request sent!' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const results = await pool.query(
            `SELECT f.friendship_id, f.status, f.action_user_id,
             u1.username as user1_username, u1.user_id as user1_id,
             u2.username as user2_username, u2.user_id as user2_id
             FROM friendships f
             JOIN users u1 ON f.user_id_1 = u1.user_id
             JOIN users u2 ON f.user_id_2 = u2.user_id
             WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)`,
            [userId]
        );

        const friends = [];
        const pending_sent = [];
        const pending_received = [];

        results.rows.forEach(row => {
            const otherUser = row.user1_id === userId ? { id: row.user2_id, username: row.user2_username } : { id: row.user1_id, username: row.user1_username };
            if (row.status === 'accepted') {
                friends.push({ username: otherUser.username });
            } else if (row.status === 'pending') {
                if (row.action_user_id === userId) {
                    pending_sent.push({ username: otherUser.username });
                } else {
                    pending_received.push({ friendship_id: row.friendship_id, username: otherUser.username });
                }
            }
        });

        res.json({ friends, pending_sent, pending_received });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/accept/:id', authMiddleware, async (req, res) => {
    const friendshipId = req.params.id;
    const userId = req.user.id;
    try {
        const result = await pool.query(
            "UPDATE friendships SET status = 'accepted', action_user_id = $1 WHERE friendship_id = $2 AND (user_id_1 = $1 OR user_id_2 = $1) AND status = 'pending' RETURNING *",
            [userId, friendshipId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Friend request not found or you don't have permission to accept it." });
        }

        res.json({ message: 'Friend request accepted!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;