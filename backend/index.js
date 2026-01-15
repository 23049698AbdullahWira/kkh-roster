const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// ================= Helper Functions =================
// Log user actions to actionlog table
async function logAction({ userId, details }) {
  try {
    await pool.query(
      `INSERT INTO actionlog (log_details, log_datetime, user_id)
       VALUES (?, NOW(), ?)`,
      [details, userId]
    );
  } catch (err) {
    console.error('Failed to insert action log:', err);
    // Do NOT throw – app should still succeed even if logging fails
  }
}

// ================= Middleware =================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Test Route
// ================= Multer Config =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|pdf/;
  const mimetype = allowedFileTypes.test(file.mimetype);
  const extname = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error('Only jpeg, jpg, png, pdf files are allowed'));
};

const upload = multer({ storage, fileFilter });

// ================= Test Routes =================
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Database connected!', result: rows[0].result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Users =================
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE role != "SUPERADMIN"');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password, ...userProfile } = rows[0];
    res.json(userProfile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  const { full_name, email, role, status, password, avatar_url, contact } = req.body;

  try {

    const [check] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    let query = `
      UPDATE users 
      SET full_name = ?, email = ?, role = ?, status = ?, avatar_url = ?, contact = ?
    `;
    
    const params = [full_name, email, role, status, avatar_url, contact];

    if (password && password.trim() !== "") {
      query += `, password = ?`;
      params.push(password);
    }

    query += ` WHERE user_id = ?`;
    params.push(id);

    await pool.query(query, params);

    res.json({ message: 'User updated successfully' });

  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.post('/users/:id/change-password', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE user_id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = rows[0];
    const storedPassword = user.password;

    if (currentPassword !== storedPassword) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }
    
    await pool.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [newPassword, id]
    );

    res.json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Failed to change password." });
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

// ================= Leave Types =================
app.get('/leave_type', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_type');
    res.json(rows);
  } catch (err) { // It's also good practice to have a catch block
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// GET roles for dropdown
app.get('/roles', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT role FROM users WHERE role IS NOT NULL ORDER BY role');
    const roles = rows.map(row => row.role);
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Leave Applications =================
app.get('/leave_has_users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_has_users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Create Leave (With Upload) =================
app.post(
  '/leave_has_users',
  upload.single('leave_document'),
  async (req, res) => {
    const {
      user_id,
      leave_type_id,
      start_date,
      end_date,
      ward_designation
    } = req.body;

    const leave_url = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    if (!user_id || !leave_type_id || !start_date || !end_date) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields.' });
    }

    try {
      const query = `
        INSERT INTO leave_has_users
        (user_id, leave_id, leave_start, leave_end, remarks, leave_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await pool.query(query, [
        user_id,
        leave_type_id,
        start_date,
        end_date,
        ward_designation,
        leave_url
      ]);

      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully.'
      });
    } catch (err) {
      console.error('Error submitting leave request:', err);
      res.status(500).json({
        success: false,
        message: 'Server error during leave submission.'
      });
    }
  }
);

// ================= Update Leave Status =================
app.patch('/leave_has_users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid status provided.' });
  }

  try {
    const query = `
      UPDATE leave_has_users
      SET status = ?
      WHERE leave_data_id = ? 
    `;

    const [result] = await pool.query(query, [status, id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Leave request not found.' });
    }

    res.json({
      success: true,
      message: `Leave status updated to ${status}.`
    });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating status.'
    });
  }
});

// ================= Login =================
// POST register - NO WARD, matches your exact table
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, role, createdByUserId, createdByName, createdByRole } = req.body;

  try {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, contact, role, password, status) 
       VALUES (?, ?, ?, ?, ?, 'Active')`,
      [fullName, email, phone, role, password]
    );

    // Fire-and-forget action log
    if (createdByUserId) {
      const creatorRole = (createdByRole || '').toUpperCase();   // e.g. 'SUPERADMIN'
      const creatorName = createdByName || 'Unknown User';        // e.g. 'Super Admin'
      const newRole = (role || '').toUpperCase();                 // e.g. 'APN'

      const details =
        `${creatorRole} ${creatorName} created ${newRole} Account named "${fullName}".`;

      logAction({ userId: createdByUserId, details });
    }

    res.json({
      success: true,
      message: 'Staff account created successfully',
      userId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, password, role, full_name FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    }
    const user = rows[0];

    if (user.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: 'Incorrect password' });
    }

    // Log successful login
    const details = `${user.role || 'User'} ${user.full_name} logged in.`;
    logAction({ userId: user.user_id, details });

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= Action Logs =================
app.get('/actionlogs', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 6;
  try {
    const [rows] = await pool.query(
      `SELECT log_id, log_details, log_datetime
       FROM actionlog
       ORDER BY log_datetime DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching action logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch action logs' });
  }
});

// ================= Server =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
