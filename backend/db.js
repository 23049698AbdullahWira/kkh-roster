const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log("✅ Successfully connected to Clever Cloud MySQL!");
    connection.release();
  })
  .catch(error => {
    console.error("❌ Could not connect:", error.message);
  });

module.exports = pool;