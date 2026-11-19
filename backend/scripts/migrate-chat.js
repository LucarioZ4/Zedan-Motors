const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

async function migrate() {
    if (!process.env.DATABASE_URL) {
        throw new Error('Configura DATABASE_URL en backend/.env');
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });
    try {
        await client.connect();
        await client.query('BEGIN');
        const sql = fs.readFileSync(path.join(__dirname,
            '../../database/migrations/2026-11-agendar-cita-chat.sql'), 'utf8');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Migración de agendamiento aplicada.');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        await client.end();
    }
}

migrate().catch(error => {
    console.error('Error aplicando la migración:', error.code || error.message);
    process.exitCode = 1;
});
