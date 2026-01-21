const pool = require('../config/database');
const bcrypt = require('bcrypt');

const createUser = async (username, password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await pool.query(
    'INSERT INTO users (username, password_hash, xp) VALUES ($1, $2, 0) RETURNING user_id, username, xp',
    [username, hashedPassword]
  );

  return newUser.rows[0];
};

module.exports = {
  createUser,
};