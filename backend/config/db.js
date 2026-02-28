const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL connection FAILED:");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    process.exit(1);
  }

  console.log("✅ MySQL Connected Successfully!");
  connection.release();
});

module.exports = pool;