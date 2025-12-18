const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Test Route (To check if server works)
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// 2. Database Connection Test
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: "Database connected!", result: rows[0].result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET Request to fetch all USERS
app.get('/users', async (req, res) => {
  try {
    // We changed 'nurses' to 'users' here
    const [rows] = await pool.query('SELECT * FROM users');
    
    // Send the data to the browser
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/shift-distribution', async (req, res) => {
  const { year, shiftType } = req.query;
  const targetYear = year || new Date().getFullYear();
  const targetShiftCode = shiftType || 'NNJ'; 

  try {
    const query = `
      SELECT 
        u.user_id,
        u.full_name,
        u.role,
        
        -- NNJ Count (or whatever shiftType is passed)
        COALESCE(SUM(CASE 
          WHEN sd.shift_code = ? THEN 1 
          ELSE 0 
        END), 0) AS total_count,

        -- Sun Count (Working Sundays)
        COALESCE(SUM(CASE 
          WHEN DAYOFWEEK(s.shift_date) = 1 AND sd.is_work_shift = 'Y' THEN 1 
          ELSE 0 
        END), 0) AS sun_count,

        -- PH Count
        COALESCE(SUM(CASE 
          WHEN sd.shift_code IN ('PH', 'PHO', 'HOL') THEN 1 
          ELSE 0 
        END), 0) AS ph_count

      FROM users u
      LEFT JOIN shifts s ON u.user_id = s.user_id AND YEAR(s.shift_date) = ?
      LEFT JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      
      WHERE u.role != 'ADMIN'
      
      GROUP BY u.user_id, u.full_name, u.role
      ORDER BY total_count DESC; 
    `;

    const [rows] = await pool.query(query, [targetShiftCode, targetYear]);
    res.json(rows);

  } catch (err) {
    console.error("Error calculating distribution:", err);
    res.status(500).json({ error: "Failed to calculate distribution" });
  }
});


// LOGIN: POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Adjust column names to match your users table
    const [rows] = await pool.query(
      'SELECT user_id, email, password, role FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];

    // For now, assume plaintext password in DB (you can upgrade to bcrypt later)
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    return res.json({
      success: true,
      role: user.role || 'user', // must exist in your table
      userId: user.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});