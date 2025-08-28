const { Pool } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_liA7HDBXekr0@ep-crimson-field-adu3dub1-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log('Attempting to connect to the new Neon database...');

const pool = new Pool({
    connectionString,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Connection Error:', err);
        return;
    }
    console.log('✅ DATABASE CONNECTION SUCCESSFUL!');
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log('Current time from database:', result.rows[0].now);
        pool.end();
    });
});