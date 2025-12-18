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

// GET Request to fetch ROSTERS with Creator Name
app.get('/api/rosters', async (req, res) => {
  try {
    // 1. Join 'rosters' with 'users' to get the creator's name
    // NOTE: Check if your users table uses 'username', 'name', or 'full_name'
    const query = `
      SELECT 
        r.roster_id, 
        r.month, 
        r.year, 
        r.created_at, 
        r.publish_date, 
        r.remarks,
        u.email as creator_name 
      FROM rosters r
      LEFT JOIN users u ON r.creator_user_id = u.user_id
      ORDER BY r.year DESC, r.month DESC
    `;
    
    const [rows] = await pool.query(query);

    // 2. Helper lists/dates
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    const today = new Date();

    // 3. Transform data for React
    const formattedRosters = rows.map(row => {
        // Calculate Status: If today is past publish_date, it is Published
        let status = 'Draft';
        if (row.publish_date && new Date(row.publish_date) <= today) {
            status = 'Published';
        }

        // Convert month number (1-12) to name (January)
        // We subtract 1 because array starts at 0
        const monthName = monthNames[row.month - 1] || 'Unknown';

        return {
            id: row.roster_id,
            title: `${monthName} Roster ${row.year}`,
            generatedBy: row.creator_name || 'Unknown', // This will show their email
            createdOn: row.created_at,
            deadline: row.publish_date,
            status: status,
            month: monthName,
            year: row.year
        };
    });

    res.json(formattedRosters);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// -------

// GET Request to fetch SHIFTS with detailed info (Color & Code)
app.get('/api/shifts/:rosterId', async (req, res) => {
  const { rosterId } = req.params;
  
  try {
    // We join 'shifts' with 'shift_desc' to get the color and short code (e.g., 'PM')
    const query = `
      SELECT 
        s.shift_id, 
        s.shift_date, 
        s.user_id, 
        sd.shift_code,       
        sd.shift_color_hex,  
        sd.is_work_shift
      FROM shifts s
      JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      WHERE s.roster_id = ?
    `;
    
    const [rows] = await pool.query(query, [rosterId]);
    res.json(rows);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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