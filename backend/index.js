const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const axios = require('axios'); 
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

// ================= Multer Config (File Uploads) =================
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

// ================= User Routes =================

// GET All Users (excluding Superadmin)
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE role != "SUPERADMIN"');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET User by ID (For Navbar/Profile)
app.get('/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
      // MODIFIED: Added email and contact (aliased as phone) to support Profile Modal
      // Kept fullName and avatar aliases to support existing Navbar
      const [rows] = await pool.query(
        `SELECT 
            full_name AS fullName, 
            avatar_url AS avatar, 
            email, 
            contact AS phone 
         FROM users WHERE user_id = ?`, 
        [userId]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: err.message });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Make sure the folder name 'uploads' matches your actual folder
app.use('/uploads', express.static('uploads'));

// UPDATE User Profile (Dynamic Update)
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  // We check req.body for ALL possible fields from both Features (Staff Edit & My Profile)
  const { full_name, email, role, status, password, avatar_url, contact } = req.body;

  try {
    const [check] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // --- DYNAMIC QUERY BUILDING ---
    // This allows partial updates (e.g. My Profile) AND full updates (Edit Staff)
    // without overwriting missing fields with NULL.
    let fields = [];
    let params = [];

    if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined)     { fields.push('email = ?');     params.push(email); }
    if (role !== undefined)      { fields.push('role = ?');      params.push(role); }
    if (status !== undefined)    { fields.push('status = ?');    params.push(status); }
    if (avatar_url !== undefined){ fields.push('avatar_url = ?'); params.push(avatar_url); }
    if (contact !== undefined)   { fields.push('contact = ?');   params.push(contact); }
    
    // Password Logic: Only update if provided and not empty
    if (password && password.trim() !== "") {
      fields.push('password = ?');
      params.push(password);
    }

    if (fields.length === 0) {
        return res.json({ message: "No changes detected" });
    }

    // Finalize Query
    const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
    params.push(id);

    await pool.query(query, params);
    
    // Return updated fields for Frontend State Update
    res.json({ 
        message: 'User updated successfully',
        fullName: full_name,
        avatar: avatar_url,
        phone: contact
    });

  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});
// This handles the logAction() call from the frontend
app.post('/action-logs', async (req, res) => {
  const { userId, details } = req.body;

  // Basic check to ensure data exists
  if (!userId || !details) {
    return res.status(400).json({ message: 'Missing userId or details' });
  }

  try {
    await pool.query(
      `INSERT INTO actionlog (log_details, log_datetime, user_id)
       VALUES (?, NOW(), ?)`,
      [details, userId]
    );
    
    // Send success status so the frontend console doesn't show an error
    res.status(200).json({ message: 'Action logged successfully' });

  } catch (err) {
    console.error("Failed to write to actionlog:", err);
    // Even if logging fails, we often don't want to crash the app, 
    // but sending a 500 allows the frontend to know it failed.
    res.status(500).json({ error: "Failed to log action" });
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

// --- FORCE DELETE USER (Updated) ---
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Delete Dependencies (Child records)
    // ✅ These tables likely exist based on your app
    await connection.query('DELETE FROM shifts WHERE user_id = ?', [id]);
    await connection.query('DELETE FROM actionlog WHERE user_id = ?', [id]);

    // ⚠️ FIXED: Commented out because this table does not exist yet
    // If you create a table for leaves later, uncomment this line and use the correct name
    // await connection.query('DELETE FROM leave_requests WHERE user_id = ?', [id]);
    
    // 2. Delete the User
    const [result] = await connection.query('DELETE FROM users WHERE user_id = ?', [id]);

    await connection.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found or already deleted.' });
    }

    res.json({ message: 'User and all associated records deleted successfully.' });

  } catch (err) {
    await connection.rollback();
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to force delete user." });
  } finally {
    connection.release();
  }
});

// ---------------------------------------------------------
//  SHIFT DISTRIBUTION ROUTES (FIXED & TIMEZONE SAFE)
// ---------------------------------------------------------

// 1. Get Available Years
app.get('/available-years', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(shift_date) as year FROM shifts ORDER BY year DESC`
    );
    const years = rows.map(row => row.year);
    // Ensure current year is always an option even if empty
    if (years.length === 0) years.push(new Date().getFullYear());
    res.json(years);
  } catch (err) {
    console.error("Error fetching years:", err);
    res.status(500).json({ error: "Failed to fetch years" });
  }
});

// 2. Main Distribution Logic
app.get('/shift-distribution', async (req, res) => {
  const { year, shiftType } = req.query;
  const targetYear = year || new Date().getFullYear();
  // Ensure we normalize the input (handle "AL" vs "al" vs "NNJ")
  const targetShiftType = (shiftType || 'NNJ').trim().toUpperCase();

  try {
    // A. Fetch Public Holidays (Only needed if NOT analyzing Annual Leave)
    let phSet = new Set();
    
    if (targetShiftType !== 'AL') {
        try {
            const url = `https://date.nager.at/api/v3/publicholidays/${targetYear}/SG`;
            const response = await axios.get(url);
            response.data.forEach(item => phSet.add(item.date));
        } catch (apiErr) {
            console.error("Warning: Holiday API failed.", apiErr.message);
        }
    }

    // B. Fetch All Shifts for APNs in that Year
    const query = `
      SELECT 
        u.user_id, 
        u.full_name, 
        u.role, 
        s.shift_date,
        sd.shift_code
      FROM users u
      LEFT JOIN shifts s 
        ON u.user_id = s.user_id 
        AND YEAR(s.shift_date) = ?
      LEFT JOIN shift_desc sd
        ON s.shift_type_id = sd.shift_type_id
      WHERE u.role = 'APN'
      ORDER BY u.full_name ASC
    `;

    const [rows] = await pool.query(query, [targetYear]);

    // C. Logic Loop (Timezone Safe)
    const userMap = new Map();

    rows.forEach(row => {
      // 1. Initialize User Stats
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          name: row.full_name || 'Unknown',
          role: row.role,
          ph_count: 0,
          sun_count: 0,
          al_count: 0, // NEW: Track Annual Leave
          total: 0
        });
      }

      const stats = userMap.get(row.user_id);

      // 2. Analyze Shift
      if (row.shift_date) {
        const dbShiftCode = (row.shift_code || 'UNKNOWN').trim().toUpperCase();

        // Date Parsing (Keep local date from DB)
        const rawDate = new Date(row.shift_date);
        const yyyy = rawDate.getFullYear();
        const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
        const dd = String(rawDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        // === LOGIC BRANCH: AL vs NNJ ===
        
        if (targetShiftType === 'AL') {
            // Logic for Annual Leave: Just count occurrences of 'AL'
            if (dbShiftCode === 'AL') {
                stats.al_count += 1;
            }
        } else {
            // Logic for NNJ (or specific shift codes)
            // Only count if the shift code matches the target (e.g., 'NNJ')
            if (dbShiftCode === targetShiftType) {
                // Check Sunday (0 = Sunday)
                if (rawDate.getDay() === 0) {
                    stats.sun_count += 1;
                }
                
                // Check Public Holiday
                if (phSet.has(dateStr)) {
                    stats.ph_count += 1;
                }
            }
        }
      }
    });

    // D. Finalize Results
    const results = Array.from(userMap.values()).map(u => ({
        ...u,
        // Calculate Total based on mode
        total: targetShiftType === 'AL' ? u.al_count : (u.ph_count + u.sun_count)
    }));
    
    res.json(results);

  } catch (err) {
    console.error("Server Error (Distribution):", err);
    res.status(500).json({ error: "Failed to calculate distribution" });
  }
});

// ---------------------------------------------------------
//  AUTH & LEAVE ROUTES
// ---------------------------------------------------------

// GET Leave Types
app.get('/leave_type', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_type');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET Roles
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

// GET Leave Applications
app.get('/leave_has_users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_has_users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Create Leave =================
app.post(
  '/leave_has_users',
  upload.single('leave_document'),
  async (req, res) => {
    const { user_id, leave_type_id, start_date, end_date, ward_designation } = req.body;
    const leave_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!user_id || !leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
      const query = `
        INSERT INTO leave_has_users
        (user_id, leave_id, leave_start, leave_end, remarks, leave_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [user_id, leave_type_id, start_date, end_date, ward_designation, leave_url]);

      res.status(201).json({ success: true, message: 'Leave request submitted successfully.' });
    } catch (err) {
      console.error('Error submitting leave request:', err);
      res.status(500).json({ success: false, message: 'Server error during leave submission.' });
    }
  }
);

// PATCH Leave Status
app.patch('/leave_has_users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, approverId } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status provided.' });
  }

  if (!approverId) {
    console.warn(`Action Log Warning: approverId not provided for leave status update (ID: ${id}).`);
  }

  try {
    const [leaveDetails] = await pool.query(
      `SELECT 
         lhu.user_id, 
         u_applicant.full_name AS applicant_name, 
         lt.leave_type
       FROM leave_has_users lhu
       JOIN users u_applicant ON lhu.user_id = u_applicant.user_id
       JOIN leave_type lt ON lhu.leave_id = lt.leave_id
       WHERE lhu.leave_data_id = ?`,
      [id]
    );

    if (leaveDetails.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Leave request not found.' });
    }

    const { applicant_name, leave_type } = leaveDetails[0];

    const [result] = await pool.query(
      'UPDATE leave_has_users SET status = ? WHERE leave_data_id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Leave request not found during update.' });
    }

    if (approverId) {
      const [approverRows] = await pool.query(
        'SELECT full_name, role FROM users WHERE user_id = ?',
        [approverId]
      );

      if (approverRows.length > 0) {
        const approver = approverRows[0];
        const details = `${approver.role || 'Admin'} ${approver.full_name} ${status.toLowerCase()} ${applicant_name}'s leave request (${leave_type}).`;
        
        logAction({ userId: approverId, details });
      } else {
        console.warn(`Could not find approver with ID ${approverId} to log the action.`);
      }
    }
    res.json({ success: true, message: `Leave status updated to ${status}.` });

  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ success: false, message: 'Server error while updating status.' });
  }
});

// POST Register
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

// POST Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, password, role, full_name, avatar_url, contact FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
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
        phone: user.contact, // Ensure phone is sent on login too
        role: user.role || 'user',
        avatar: user.avatar_url || "https://placehold.co/50x50"
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