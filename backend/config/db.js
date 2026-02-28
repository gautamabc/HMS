require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medicore_hms',
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection()
  .then(c => { console.log('✅  MySQL connected!'); c.release(); })
  .catch(e => {
    console.error('❌  MySQL connection FAILED:', e.message);
    console.error('    Check DB_PASSWORD in backend/.env file');
    process.exit(1);
  });

module.exports = pool;
