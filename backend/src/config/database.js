require('dotenv').config();
const { Pool, types } = require('pg');

// Conserva las fechas de calendario y publica los importes como números JSON.
types.setTypeParser(types.builtins.DATE, value => value + 'T00:00:00');
types.setTypeParser(types.builtins.NUMERIC, Number);
types.setTypeParser(types.builtins.TIMESTAMP, value => value.replace(' ', 'T'));
const getDatabaseInfo = require('./databaseInfo');

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
      }
    : {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT, 10),
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log(`✅ Conectado a ${getDatabaseInfo()}`);
        release();
    }
});

module.exports = pool;
