const { Pool } = require('pg');
require('dotenv').config();

// Forcing a configuration update for the live server
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;