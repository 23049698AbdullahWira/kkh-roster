const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const multer = require('multer');
const path = require('path');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Serve the 'uploads' directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MULTER CONFIGURATION FOR FILE UPLOADS ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

// --- ROUTES ---

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

// 3. GET Request to fetch all USERS
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- LEAVE APPLICATION ROUTES ---

// 4. GET Request to fetch all LEAVE TYPES
// --- CHANGE 1: Route path changed to '/leave_types' for RESTful convention.
// --- CHANGE 2: SQL query is now correct and selects from the `leave_type` table.
app.get('/leave_types', async (req, res) => {
    try {
        // Assuming your table is `leave_type` with columns `leave_id` and `leave_type`
        const [rows] = await pool.query('SELECT leave_id, leave_type FROM leave_type');
        res.json(rows);
    } catch (err) {
        console.error("Error fetching leave types:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. POST Request to APPLY FOR LEAVE
app.post('/leaves/apply', upload.single('leave_document'), async (req, res) => {
  try {
    const { user_id, leave_id, leave_start_date, leave_end_date } = req.body;

    // --- CHANGE 3: Switched to req.file.filename for a more robust and clean URL.
    // This avoids issues with backslashes (\) in paths on Windows systems.
    const leave_url = req.file 
      ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` 
      : null;
    
    if (!user_id || !leave_id || !leave_start_date || !leave_end_date) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const insertQuery = `
      INSERT INTO leave_has_users (user_id, leave_id, leave_start, leave_end, leave_url)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.query(insertQuery, [
      user_id,
      leave_id,
      leave_start_date,
      leave_end_date,
      leave_url
    ]);

    res.status(201).json({ message: 'Leave request submitted successfully!' });

  } catch (err) {
    console.error("Error submitting leave request:", err);
    res.status(500).json({ message: 'Failed to submit leave request.', error: err.message });
  }
});

// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});