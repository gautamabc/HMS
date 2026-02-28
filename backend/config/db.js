
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

pool.getConnection()
  .then(c => { console.log('✅  MySQL connected!'); c.release(); })
  .catch(e => {
    console.error('❌  MySQL connection FAILED:', e.message);
    console.error('    Check DB_PASSWORD in backend/.env file');
    process.exit(1);
  });

module.exports = pool;
