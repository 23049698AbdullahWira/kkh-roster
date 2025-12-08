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
    res.json({ message: 'Database connected!', result: rows[0].result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// GET Request to fetch all USERS
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// LOGIN: POST /api/auth/login (ENHANCED)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;


  try {
    // Fetch more user data on login
    const [rows] = await pool.query(
      `SELECT
        u.user_id,
        u.email,
        u.password,
        u.role,
        u.full_name,
        w.ward_name
      FROM users u
      LEFT JOIN rosters r ON u.user_id = r.creator_user_id
      LEFT JOIN ward w ON r.ward_id = w.ward_id
      WHERE u.email = ?
      ORDER BY r.created_at DESC
      LIMIT 1`,
      [email]
    );


    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }


    const user = rows[0];


    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }


    // Send back a user object
    return res.json({
      success: true,
      user: {
        userId: user.user_id,
        role: user.role || 'user',
        fullName: user.full_name,
        email: user.email,
        ward: user.ward_name || 'N/A', // Default if no ward found
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// NEW: GET all leave types
app.get('/api/leave-types', async (req, res) => {
  try {
    const [leaveTypes] = await pool.query('SELECT leave_id, leave_type FROM leave_type ORDER BY leave_type');
    res.json(leaveTypes);
  } catch (err) {
    console.error('Error fetching leave types:', err);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});


// NEW: POST a new leave application
app.post('/api/leaves', async (req, res) => {
  const {
    userId,
    leaveId,
    startDate,
    endDate,
    remarks,
    leaveUrl
  } = req.body;


  // Basic validation
  if (!userId || !leaveId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }


  try {
    const query = `
      INSERT INTO leave_has_users
      (user_id, leave_id, leave_start, leave_end, remarks, leave_url, leave_type)
      VALUES (?, ?, ?, ?, ?, ?, (SELECT leave_type FROM leave_type WHERE leave_id = ?))
    `;


    await pool.query(query, [userId, leaveId, startDate, endDate, remarks || null, leaveUrl || null, leaveId]);


    res.status(201).json({ success: true, message: 'Leave application submitted successfully.' });


  } catch (err) {
    console.error('Error submitting leave application:', err);
    res.status(500).json({ success: false, message: 'Server error while submitting leave.' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});