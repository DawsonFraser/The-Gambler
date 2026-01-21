const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userExists = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Username already taken.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUserRes = await client.query(
            'INSERT INTO users (username, password_hash, xp, tier, balance) VALUES ($1, $2, 0, 1, 0) RETURNING user_id, username',
            [username, passwordHash]
        );
        const newUserId = newUserRes.rows[0].user_id;
        await client.query(
            "UPDATE users SET referral_code = upper(substring(md5(random()::text) for 8)) WHERE user_id = $1",
            [newUserId]
        );
        await client.query('COMMIT');
        res.status(201).json({
            message: 'User registered successfully',
            user: newUserRes.rows[0],
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        client.release();
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const payload = {
            user: {
                id: user.user_id,
                username: user.username,
                tier: user.tier,
                balance: user.balance
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '3d' },
            (err, token) => {
                if (err) throw err;
                res.json({ accessToken: token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
};