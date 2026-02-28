pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL connection FAILED:");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    console.error("Full Error:", err);
    process.exit(1);
  }

  console.log("✅ MySQL Connected Successfully!");
  connection.release();
});