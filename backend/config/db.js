require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }, // needed for Railway
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection()
  .then(c => { 
    console.log('✅  MySQL connected!'); 
    c.release(); 
  })
  .catch(e => {
    console.error('❌  MySQL connection FAILED:', e.message);
    process.exit(1);
  });

module.exports = pool;