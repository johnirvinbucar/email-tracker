const { Pool } = require('pg');
require('dotenv').config();

console.log('Database connection details:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'email_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Add connection timeout
  connectionTimeoutMillis: 5000,
  // Add query timeout
  idleTimeoutMillis: 30000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection test passed');
    client.release();
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.log('Please check:');
    console.log('1. Is PostgreSQL running?');
    console.log('2. Is the database "email_tracker" created?');
    console.log('3. Are the credentials in .env correct?');
  }
};

testConnection();

module.exports = pool;