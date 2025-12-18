const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  }
});

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|pdf/;
  const mimetype = allowedFileTypes.test(file.mimetype);
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb("Error: File upload only supports the following filetypes - " + allowedFileTypes);
}

const upload = multer({ storage: storage, fileFilter: fileFilter });

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

// ============================================ Nurse Leave ============================================
// GET Request to fetch all leave_type
app.get('/leave_type', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_type');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET Request to fetch all leave_has_users
app.get('/leave_has_users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_has_users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST Request to create a new leave application with file upload
app.post('/leave_has_users', upload.single('leave_document'), async (req, res) => {
  const {
    user_id,
    leave_type_id,
    start_date,
    end_date,
    ward_designation, // This will be used as 'remarks'
  } = req.body;

  const leave_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Basic validation
  if (!user_id || !leave_type_id || !start_date || !end_date) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const query = `
      INSERT INTO leave_has_users (user_id, leave_id, leave_start, leave_end, remarks, leave_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await pool.query(query, [user_id, leave_type_id, start_date, end_date, ward_designation, leave_url]);

    res.status(201).json({ success: true, message: 'Leave request submitted successfully.' });

  } catch (err) {
    console.error('Error submitting leave request:', err);
    res.status(500).json({ success: false, message: 'Server error during leave submission.' });
  }
});
// ============================================ End Of Nurse Leave ============================================

// ============================================ Admin Manage Leave ============================================



// ============================================ End Of Admin Manage Leave ============================================

// *** UPDATED: LOGIN Endpoint now returns user data ***
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // IMPORTANT: Make sure your 'users' table has a 'full_name' column
    const [rows] = await pool.query(
      'SELECT user_id, email, password, role, full_name FROM users WHERE email = ?',
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

    // Return more user details on success
    return res.json({
      success: true,
      user: {
        userId: user.user_id,
        fullName: user.full_name, // Make sure this column exists in your DB
        email: user.email,
        role: user.role || 'user',
      },
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