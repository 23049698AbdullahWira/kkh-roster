const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// ================= Middleware =================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Leave Types =================
app.get('/leave_type', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_type');
    res.json(rows);
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

// ================= Server =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
