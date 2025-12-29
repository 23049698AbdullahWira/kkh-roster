const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Test Route
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

// ---------------------------------------------------------
//  USER MANAGEMENT ROUTES
// ---------------------------------------------------------

// GET All Users
app.get('/users', async (req, res) => {
  try {
    // MODIFIED: Added WHERE clause to exclude SUPER ADMIN
    const [rows] = await pool.query("SELECT * FROM users WHERE role != 'SUPERADMIN'");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE User (PUT /users/:id) - Handles Contact Update
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  // 1. Get 'contact' from the request body along with other fields
  const { full_name, email, role, status, password, avatar_url, contact } = req.body;

  try {
    // 2. Check if user exists
    const [check] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Prepare update query
    // ADDED: "contact = ?" to the SQL string
    let query = `
      UPDATE users 
      SET full_name = ?, email = ?, role = ?, status = ?, avatar_url = ?, contact = ?
    `;
    
    // 4. Add 'contact' to the parameters array (order must match the ?s above)
    const params = [full_name, email, role, status, avatar_url, contact];

    // Handle Password (only update if provided)
    if (password && password.trim() !== "") {
      query += `, password = ?`;
      params.push(password);
    }

    query += ` WHERE user_id = ?`;
    params.push(id);

    // 5. Execute update
    await pool.query(query, params);

    res.json({ message: 'User updated successfully' });

  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ---------------------------------------------------------
//  SHIFT DISTRIBUTION ROUTES (From previous tasks)
// ---------------------------------------------------------

// Get Available Years
app.get('/available-years', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(shift_date) as year FROM shifts ORDER BY year DESC`
    );
    const years = rows.map(row => row.year);
    if (years.length === 0) years.push(new Date().getFullYear());
    res.json(years);
  } catch (err) {
    console.error("Error fetching years:", err);
    res.status(500).json({ error: "Failed to fetch years" });
  }
});

// Get Shift Distribution Stats
// Get Shift Distribution Stats (Fixed to show ALL users)
// Get Shift Distribution Stats (ONLY APN)
app.get('/shift-distribution', async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  try {
    const query = `
      SELECT 
        u.user_id,
        u.full_name,
        u.role,
        -- Count Public Holidays
        COALESCE(SUM(CASE 
          WHEN sd.shift_code IN ('PH', 'PHO', 'HOL') THEN 1 
          ELSE 0 
        END), 0) AS ph_count,
        
        -- Count Sundays
        COALESCE(SUM(CASE 
          WHEN DAYOFWEEK(s.shift_date) = 1 THEN 1 
          ELSE 0 
        END), 0) AS sun_count

      FROM users u
      
      -- LEFT JOIN ensures APNs appear even if they have 0 shifts this year
      LEFT JOIN shifts s ON u.user_id = s.user_id AND YEAR(s.shift_date) = ?
      
      LEFT JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      
      -- CHANGED: Strictly filter for 'APN' role only
      WHERE u.role = 'APN'
      
      GROUP BY u.user_id, u.full_name, u.role
      ORDER BY u.full_name ASC;
    `;

    const [rows] = await pool.query(query, [targetYear]);
    res.json(rows);
    
  } catch (err) {
    console.error("Error calculating distribution:", err);
    res.status(500).json({ error: "Failed to calculate distribution" });
  }
});

// ---------------------------------------------------------
//  AUTH ROUTES
// ---------------------------------------------------------

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, password, role FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const user = rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
    return res.json({
      success: true,
      role: user.role || 'user', 
      userId: user.user_id, // Ensure this matches DB column name
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