const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/database');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const authMiddleware = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const token = authHeader.split(' ')[1];
        
        // Ask Supabase to verify the token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }
        
        // Token is valid. Now, find this user in our own database to get their admin status.
        // We link the Supabase user to our database user via their email address.
        const ourUserQuery = await pool.query('SELECT * FROM users WHERE username = $1', [user.email]);

        if (ourUserQuery.rows.length === 0) {
            // This is a special case: the user exists in Supabase Auth but not in our public users table.
            // We need to create a profile for them.
            const newUser = await pool.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
                [user.email, 'supabase_user'] // Using email as username, and a placeholder for password
            );
            req.user = newUser.rows[0];
        } else {
            // Attach our user (with id, is_admin, etc.) to the request object
            req.user = ourUserQuery.rows[0];
        }

        next();
    } catch (err) {
        res.status(401).json({ message: 'Server error during authentication' });
    }
};

module.exports = authMiddleware;