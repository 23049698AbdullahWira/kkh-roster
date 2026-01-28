const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { generateRoster } = require('./services/rosterEngine');
const ExcelJS = require('exceljs');
require('dotenv').config();

// Create the Express application instance
const app = express();

// ================= Helper Functions =================
async function logAction({ userId, details }) {
  try {
    await pool.query(
      `INSERT INTO actionlog (log_details, log_datetime, user_id)
       VALUES (?, NOW(), ?)`,
      [details, userId]
    );
  } catch (err) {
    console.error('Failed to insert action log:', err);
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
    const [rows] = await pool.query(
      `SELECT 
            full_name AS fullName, 
            avatar_url AS avatar, 
            email, 
            contact AS phone,
            service,  -- Added service here
            role
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

// --- NEW ROUTE: Fetch Service Types ---
app.get('/api/services', async (req, res) => {
  try {
    // 1. Fetch the column type definition from the schema to get ENUM values
    const [rows] = await pool.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'service'
    `);

    if (rows.length > 0) {
      // 2. Parse the string "enum('CE','ONCO','PAS',...)"
      const enumString = rows[0].COLUMN_TYPE;
      // Regex to extract content between single quotes
      const matches = enumString.match(/'([^']+)'/g);
      
      if (matches) {
        // Remove quotes from result
        const services = matches.map(s => s.replace(/'/g, ''));
        res.json(services);
      } else {
        // Fallback if regex fails (shouldn't happen with standard ENUM)
        res.json(['CE', 'ONCO', 'PAS', 'PAME', 'ACUTE', 'Triage']); 
      }
    } else {
      res.status(404).json({ error: "Service column not found" });
    }
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Roster & Shift Routes =================

// GET Request to fetch ROSTERS with Creator Name
app.get('/api/rosters', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.roster_id, 
        r.month, 
        r.year, 
        r.created_at, 
        r.publish_date, 
        r.remarks,
        r.status,
        u.full_name as creator_name 
      FROM rosters r
      LEFT JOIN users u ON r.creator_user_id = u.user_id
      ORDER BY r.year DESC, r.month DESC
    `;

    const [rows] = await pool.query(query);

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const today = new Date();

    const formattedRosters = rows.map(row => {
      const monthName = monthNames[row.month - 1] || 'Unknown';

      return {
        id: row.roster_id,
        title: `${monthName} Roster ${row.year}`,
        generatedBy: row.creator_name || 'Unknown',
        createdOn: row.created_at,
        deadline: row.publish_date,
        status: row.status,
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

// ================= NEW DASHBOARD HELPERS =================

// 1) Pending leave requests count (leave_has_users)
app.get('/api/leave/pending-count', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS pendingCount
       FROM leave_has_users
       WHERE status = 'Pending'`
    );
    res.json({ pendingCount: rows[0].pendingCount });
  } catch (err) {
    console.error('Error fetching pending leave count:', err);
    res.status(500).json({ error: 'Failed to fetch pending leave count' });
  }
});

// 2) Pending shift preferences count (shiftpref)
app.get('/api/shiftpref/pending-count', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS pendingCount
       FROM shiftpref
       WHERE status = 'Submitted'` // change to your actual "pending" value
    );
    res.json({ pendingCount: rows[0].pendingCount });
  } catch (err) {
    console.error('Error fetching pending shift preference count:', err);
    res.status(500).json({ error: 'Failed to fetch pending shift preference count' });
  }
});

// 3) Next roster status (next month from today in rosters)
app.get('/api/rosters/next', async (req, res) => {
  try {
    // 1. Work out next month & year from today
    const today = new Date();
    let month = today.getMonth() + 1; // JS: 0-11, DB: 1-12
    let year = today.getFullYear();

    month += 1;            // move to next month
    if (month > 12) {
      month = 1;
      year += 1;
    }

    // 2. Query the roster for that month/year
    const [rows] = await pool.query(
      `SELECT roster_id, month, year, status
       FROM rosters
       WHERE month = ? AND year = ?
       LIMIT 1`,
      [month, year]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No roster found for next month' });
    }

    const row = rows[0];

    // 3. Convert numeric month to name for the frontend
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const monthValue = monthNames[row.month - 1];

    res.json({
      roster_id: row.roster_id,
      month: monthValue,
      year: row.year,
      status: row.status,
    });
  } catch (err) {
    console.error('Error fetching next roster:', err);
    res.status(500).json({ error: 'Failed to fetch next roster' });
  }
});


// ================= ROSTER CREATION =================
app.post('/api/rosters', async (req, res) => {
  const { month, year, userId } = req.body;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and Year are required.' });
  }

  try {
    const monthMap = {
      "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
      "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
    };
    const monthInt = monthMap[month] || month;
    const autoRemarks = `${month} ${year} Roster`;
    const creatorId = userId || 1;

    const [existing] = await pool.query(
      "SELECT roster_id FROM rosters WHERE month = ? AND year = ?",
      [monthInt, year]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: `A roster for ${month} ${year} already exists.` });
    }

    const sql = `
      INSERT INTO rosters (month, year, remarks, status, created_at, creator_user_id) 
      VALUES (?, ?, ?, 'Preference Open', NOW(), ?)
    `;

    const [result] = await pool.query(sql, [
      monthInt,
      year,
      autoRemarks,
      creatorId
    ]);

    res.status(201).json({
      message: 'Roster created successfully',
      rosterId: result.insertId
    });
  } catch (err) {
    console.error("Error creating roster:", err);
    res.status(500).json({ message: 'Database error creating roster' });
  }
});

// GET: Fetch all available shift types
app.get('/api/shift-types', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT shift_type_id, shift_code, shift_color_hex, is_work_shift FROM shift_desc');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= WARDS =================
app.get('/api/wards', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT ward_id, ward_name, ward_comments FROM ward');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= SHIFTS UPDATE =================
app.post('/api/shifts/update', async (req, res) => {
  const { userId, date, shiftTypeId, rosterId, wardId } = req.body;

  try {
    if (!shiftTypeId || shiftTypeId === 'OFF') {
      await pool.query('DELETE FROM shifts WHERE user_id = ? AND shift_date = ?', [userId, date]);
      return res.json({ message: 'Shift removed' });
    }

    const sql = `
      INSERT INTO shifts (user_id, shift_date, shift_type_id, roster_id, ward_id)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        shift_type_id = VALUES(shift_type_id), 
        ward_id = VALUES(ward_id)
    `;

    await pool.query(sql, [userId, date, shiftTypeId, rosterId, wardId]);

    res.json({ message: 'Shift updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET Request to fetch SHIFTS
app.get('/api/shifts/:rosterId', async (req, res) => {
  const { rosterId } = req.params;

  try {
    const query = `
      SELECT 
        s.shift_id, 
        s.shift_date, 
        s.user_id,
        s.ward_id,
        s.shift_type_id,
        sd.shift_code,       
        sd.shift_color_hex,  
        sd.is_work_shift,
        w.ward_name
      FROM shifts s
      JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      LEFT JOIN ward w ON s.ward_id = w.ward_id
      WHERE s.roster_id = ?
    `;

    const [rows] = await pool.query(query, [rosterId]);
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update Roster Status
app.post('/api/rosters/update-status', async (req, res) => {
  const { rosterId, status } = req.body;

  try {
    let sql = 'UPDATE rosters SET status = ? WHERE roster_id = ?';
    if (status === 'Published') {
      sql = 'UPDATE rosters SET status = ?, publish_date = NOW() WHERE roster_id = ?';
    }

    await pool.query(sql, [status, rosterId]);

    res.json({ success: true, status });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get Roster Details
app.get('/api/rosters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM rosters WHERE roster_id = ?', [id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'Roster not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE User (PUT /users/:id)
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role, status, password, avatar_url, contact, service } = req.body; // Added service

  try {
    const [check] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    let fields = [];
    let params = [];

    if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (avatar_url !== undefined) { fields.push('avatar_url = ?'); params.push(avatar_url); }
    if (contact !== undefined) { fields.push('contact = ?'); params.push(contact); }
    if (service !== undefined) { fields.push('service = ?'); params.push(service); } // Add service update

    if (password && password.trim() !== "") {
      fields.push('password = ?');
      params.push(password);
    }

    if (fields.length === 0) {
      return res.json({ message: "No changes detected" });
    }

    const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
    params.push(id);

    await pool.query(query, params);

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

// POST Action Logs
app.post('/action-logs', async (req, res) => {
  const { userId, details } = req.body;

  if (!userId || !details) {
    return res.status(400).json({ message: 'Missing userId or details' });
  }

  try {
    await pool.query(
      `INSERT INTO actionlog (log_details, log_datetime, user_id)
       VALUES (?, NOW(), ?)`,
      [details, userId]
    );
    res.status(200).json({ message: 'Action logged successfully' });

  } catch (err) {
    console.error("Failed to write to actionlog:", err);
    res.status(500).json({ error: "Failed to log action" });
  }
});

// Change Password
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
    if (currentPassword !== user.password) {
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

// --- FORCE DELETE USER ---
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM shifts WHERE user_id = ?', [id]);
    await connection.query('DELETE FROM actionlog WHERE user_id = ?', [id]);
    // await connection.query('DELETE FROM leave_requests WHERE user_id = ?', [id]);

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
//  SHIFT DISTRIBUTION ROUTES
// ---------------------------------------------------------

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

app.get('/shift-distribution', async (req, res) => {
  const { year, shiftType } = req.query;
  const targetYear = year || new Date().getFullYear();
  const targetShiftType = (shiftType || 'NNJ').trim().toUpperCase();

  try {
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

    const userMap = new Map();

    rows.forEach(row => {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          name: row.full_name || 'Unknown',
          role: row.role,
          ph_count: 0,
          sun_count: 0,
          al_count: 0, 
          total: 0
        });
      }

      const stats = userMap.get(row.user_id);

      if (row.shift_date) {
        const dbShiftCode = (row.shift_code || 'UNKNOWN').trim().toUpperCase();
        const rawDate = new Date(row.shift_date);
        const yyyy = rawDate.getFullYear();
        const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
        const dd = String(rawDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (targetShiftType === 'AL') {
          if (dbShiftCode === 'AL') {
            stats.al_count += 1;
          }
        } else {
          if (dbShiftCode === targetShiftType) {
            if (rawDate.getDay() === 0) {
              stats.sun_count += 1;
            }
            if (phSet.has(dateStr)) {
              stats.ph_count += 1;
            }
          }
        }
      }
    });

    const results = Array.from(userMap.values()).map(u => ({
      ...u,
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

app.get('/leave_type', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_type');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/leave_has_users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_has_users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create Leave
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

  try {
    const [leaveDetails] = await pool.query(
      `SELECT 
         lhu.user_id, 
         lhu.leave_start,
         lhu.leave_end,   
         u_applicant.full_name AS applicant_name, 
         lt.leave_type
       FROM leave_has_users lhu
       JOIN users u_applicant ON lhu.user_id = u_applicant.user_id
       JOIN leave_type lt ON lhu.leave_id = lt.leave_id
       WHERE lhu.leave_data_id = ?`,
      [id]
    );

    if (leaveDetails.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const { user_id, applicant_name, leave_type, leave_start, leave_end } = leaveDetails[0];

    const [result] = await pool.query(
      'UPDATE leave_has_users SET status = ? WHERE leave_data_id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found during update.' });
    }

    // --- ROSTER UPDATE LOGIC ---
    if (status === 'Approved') {
      const typeMap = {
        'Annual Leave': 'AL',
        'Sick Leave': 'MC',
        'Maternity Leave': 'ML',
        'Hospitalisation Leave': 'HL',
        'Day-Off': 'DO'
      };
      const finalCode = typeMap[leave_type] || 'AL';

      const [typeResult] = await pool.query(
        "SELECT shift_type_id FROM shift_desc WHERE shift_code = ?",
        [finalCode]
      );

      if (typeResult.length > 0) {
        const shiftTypeId = typeResult[0].shift_type_id;
        const start = new Date(leave_start);
        const end = new Date(leave_end);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];

          const [rosterCheck] = await pool.query(
            `SELECT roster_id FROM rosters 
             WHERE month = MONTH(?) AND year = YEAR(?) LIMIT 1`,
            [dateStr, dateStr]
          );

          if (rosterCheck.length > 0) {
            const validRosterId = rosterCheck[0].roster_id;

            await pool.query(
              "DELETE FROM shifts WHERE user_id = ? AND shift_date = ?",
              [user_id, dateStr]
            );

            await pool.query(`
                INSERT INTO shifts (user_id, shift_date, shift_type_id, roster_id, ward_id)
                VALUES (?, ?, ?, ?, 2) 
            `, [user_id, dateStr, shiftTypeId, validRosterId]);
          }
        }
      }
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
  const { firstName, lastName, email, phone, password, role, service, createdByUserId, createdByName, createdByRole } = req.body;

  try {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    // Insert with Service
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, contact, role, password, status, service) 
       VALUES (?, ?, ?, ?, ?, 'Active', ?)`,
      [fullName, email, phone, role, password, service || 'General']
    );

    if (createdByUserId) {
      const creatorRole = (createdByRole || '').toUpperCase();
      const creatorName = createdByName || 'Unknown User';
      const newRole = (role || '').toUpperCase();
      const details = `${creatorRole} ${creatorName} created ${newRole} Account named "${fullName}".`;
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
      'SELECT user_id, email, password, role, full_name, avatar_url, service, contact FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const details = `${user.role || 'User'} ${user.full_name} logged in.`;
    logAction({ userId: user.user_id, details });

    res.json({
      success: true,
      user: {
        service: user.service,
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        phone: user.contact,
        role: user.role || 'user',
        avatar: user.avatar_url || "https://placehold.co/50x50"
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- AUTO-FILL ROSTER ---
app.post('/api/rosters/auto-fill', async (req, res) => {
  const { rosterId, month, year } = req.body;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [users] = await connection.query("SELECT * FROM users WHERE role = 'APN'");
    const [existingShifts] = await connection.query(
      `SELECT s.*, sd.shift_code 
       FROM shifts s 
       JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id 
       WHERE s.roster_id = ?`,
      [rosterId]
    );
    const [shiftTypes] = await connection.query("SELECT shift_type_id, shift_code FROM shift_desc");

    const typeMap = {};
    shiftTypes.forEach(t => typeMap[t.shift_code] = t.shift_type_id);

    const newAssignments = await generateRoster(month, year, users, existingShifts);

    const valuesToInsert = [];
    const newlyAddedSet = new Set();

    for (const item of newAssignments) {
      const shiftKey = `${item.user_id}-${item.shift_date}`;
      const existsInDB = existingShifts.find(e => {
        const dbDate = new Date(e.shift_date);
        const dbDateStr = dbDate.toLocaleDateString('en-CA');
        return e.user_id === item.user_id && dbDateStr === item.shift_date;
      });

      const existsInBatch = newlyAddedSet.has(shiftKey);

      if (!existsInDB && !existsInBatch) {
        const typeId = typeMap[item.shift_code];
        const finalWardId = item.ward_id || null;

        if (typeId) {
          valuesToInsert.push([
            item.user_id,
            rosterId,
            typeId,
            item.shift_date,
            finalWardId
          ]);
          newlyAddedSet.add(shiftKey);
        }
      }
    }

    let addedCount = 0;
    if (valuesToInsert.length > 0) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO shifts 
         (user_id, roster_id, shift_type_id, shift_date, ward_id) 
         VALUES ?`,
        [valuesToInsert]
      );
      addedCount = result.affectedRows;
    }

    await connection.commit();
    connection.release();

    res.json({ success: true, message: `Auto-fill complete! Added ${addedCount} shifts.` });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Auto-Fill Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE ROSTER SETTINGS ---
app.put('/api/rosters/:id/settings', async (req, res) => {
  const { id } = req.params;
  const { remarks, publish_date } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE rosters SET remarks = ?, publish_date = ? WHERE roster_id = ?",
      [remarks, publish_date, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Roster not found" });
    }

    res.json({ success: true, message: "Roster updated successfully" });
  } catch (err) {
    console.error("Update Roster Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE ROSTER ---
app.delete('/api/rosters/:id', async (req, res) => {
  const rosterId = req.params.id;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query('DELETE FROM shifts WHERE roster_id = ?', [rosterId]);
    const [result] = await connection.query('DELETE FROM rosters WHERE roster_id = ?', [rosterId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Roster not found" });
    }

    await connection.commit();
    res.json({ success: true, message: 'Roster and all associated shifts deleted.' });
  } catch (err) {
    await connection.rollback();
    console.error("Delete Roster Error:", err);
    res.status(500).json({ error: "Failed to delete roster" });
  } finally {
    connection.release();
  }
});

// --- EXCEL DOWNLOAD ---
app.get('/api/rosters/:id/download', async (req, res) => {
  const rosterId = req.params.id;

  const connection = await pool.getConnection();
  try {
    const [rosterMeta] = await connection.query("SELECT * FROM rosters WHERE roster_id = ?", [rosterId]);
    if (rosterMeta.length === 0) return res.status(404).send("Roster not found");

    const { month, year } = rosterMeta[0];

    const [shifts] = await connection.query(`
      SELECT 
        s.shift_date, 
        sd.shift_code, 
        sd.shift_color_hex, 
        u.full_name 
      FROM shifts s
      JOIN users u ON s.user_id = u.user_id
      JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      WHERE s.roster_id = ?
      ORDER BY u.full_name, s.shift_date
    `, [rosterId]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${month} ${year}`);

    const daysInMonth = new Date(year, new Date(`${month} 1, 2000`).getMonth() + 1, 0).getDate();
    const columns = [{ header: 'Nurse Name', key: 'name', width: 25 }];
    for (let i = 1; i <= daysInMonth; i++) columns.push({ header: `${i}`, key: `day_${i}`, width: 6 });
    worksheet.columns = columns;

    const nurseMap = {};
    const colorMap = {};

    shifts.forEach(shift => {
      const name = shift.full_name;
      const dateStr = typeof shift.shift_date === 'string'
        ? shift.shift_date.split('T')[0]
        : shift.shift_date.toISOString().split('T')[0];
      const day = parseInt(dateStr.split('-')[2], 10);

      if (!nurseMap[name]) nurseMap[name] = { name: name };
      nurseMap[name][`day_${day}`] = shift.shift_code;

      if (shift.shift_code && shift.shift_color_hex) {
        colorMap[shift.shift_code] = shift.shift_color_hex;
      }
    });

    Object.values(nurseMap).forEach(row => worksheet.addRow(row));

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.font = { bold: true };
        return;
      }

      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        if (colNumber > 1) {
          const code = cell.value;
          const hex = colorMap[code];

          if (hex) {
            const cleanHex = hex.replace('#', '');
            const argbColor = `FF${cleanHex}`;

            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: argbColor }
            };
          }
        }
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${month}_${year}_Roster.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel Generation Error:", err);
    res.status(500).send("Error generating file");
  } finally {
    connection.release();
  }
});

// --- Roster Status API ---
app.get('/api/get-roster-status', async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and Year are required." });
  }

  try {
    const query = `
      SELECT status 
      FROM rosters 
      WHERE month = ? AND year = ? 
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [month, year]);

    if (rows.length > 0) {
      res.json({ status: rows[0].status });
    } else {
      res.json({ status: "No Roster Created" });
    }

  } catch (err) {
    console.error("Error fetching roster status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Shift Preferences APIs ---
app.get('/api/get-shift-preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT 
        sp.shiftPref_id,
        sp.date,
        sp.status,
        sp.remarks,
        sp.roster_id,
        sd.shift_code
      FROM shiftpref sp
      LEFT JOIN shift_desc sd ON sp.shift_type_id = sd.shift_type_id
      WHERE sp.user_id = ?
      ORDER BY sp.date DESC
    `;

    const [rows] = await pool.query(query, [userId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching preferences:", err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

app.post('/api/add-shift-preference', async (req, res) => {
  const { user_id, date, shift_code, remarks } = req.body;

  try {
    const prefDate = new Date(date);
    const targetMonth = prefDate.getMonth() + 1;
    const targetYear = prefDate.getFullYear();

    const [rosterRows] = await pool.query(
      'SELECT roster_id, status FROM rosters WHERE month = ? AND year = ? LIMIT 1',
      [targetMonth, targetYear]
    );

    if (rosterRows.length === 0) {
      return res.status(404).json({ error: "No roster found for this date." });
    }

    if (rosterRows[0].status !== 'Preference Open') {
      return res.status(403).json({ 
        error: `Submission blocked. Roster is currently in '${rosterRows[0].status}' status.` 
      });
    }

    const validRosterId = rosterRows[0].roster_id;
    const [shiftRows] = await pool.query('SELECT shift_type_id FROM shift_desc WHERE shift_code = ?', [shift_code]);
    const shiftTypeId = shiftRows[0].shift_type_id;

    const insertQuery = `INSERT INTO shiftpref (user_id, date, shift_type_id, roster_id, remarks, status) VALUES (?, ?, ?, ?, ?, 'Pending')`;
    await pool.query(insertQuery, [user_id, date, shiftTypeId, validRosterId, remarks]);

    res.json({ message: "Preference request submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put('/api/update-shift-preference/:id', async (req, res) => {
  const { id } = req.params;
  const { date, shift_code, remarks } = req.body;

  if (!date || !shift_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const prefDate = new Date(date);
    const targetMonth = prefDate.getMonth() + 1;
    const targetYear = prefDate.getFullYear();

    const [rosterRows] = await pool.query(
      'SELECT roster_id FROM rosters WHERE month = ? AND year = ? LIMIT 1',
      [targetMonth, targetYear]
    );

    if (rosterRows.length === 0) {
      return res.status(404).json({
        error: `No roster available for ${targetMonth}/${targetYear}. Cannot move preference to this date.`
      });
    }
    const validRosterId = rosterRows[0].roster_id;

    const [shiftRows] = await pool.query(
      'SELECT shift_type_id FROM shift_desc WHERE shift_code = ? LIMIT 1',
      [shift_code]
    );

    if (shiftRows.length === 0) {
      return res.status(400).json({ error: "Invalid Shift Code" });
    }
    const shiftTypeId = shiftRows[0].shift_type_id;

    const updateQuery = `
      UPDATE shiftpref 
      SET date = ?, shift_type_id = ?, roster_id = ?, remarks = ?, status = 'Pending'
      WHERE shiftPref_id = ?
    `;

    await pool.query(updateQuery, [date, shiftTypeId, validRosterId, remarks, id]);

    res.json({ message: "Preference updated successfully" });

  } catch (err) {
    console.error("Error updating preference:", err);
    res.status(500).json({ error: "Failed to update preference" });
  }
});

app.delete('/api/delete-shift-preference/:id', async (req, res) => {
  const { id } = req.params;

  console.log("Server received DELETE request for ID:", id);

  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ error: "Invalid ID provided" });
  }

  try {
    const query = 'DELETE FROM shiftpref WHERE shiftPref_id = ?';
    
    const [result] = await pool.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Preference not found. It may have already been deleted." });
    }

    res.json({ message: "Preference deleted successfully" });

  } catch (err) {
    console.error("Database Error deleting preference:", err);
    res.status(500).json({ error: err.sqlMessage || err.message || "Database error" });
  }
});

// --- START: NEW ENDPOINT TO GET A USER'S UPCOMING SHIFTS ---

// GET: a specific user's shifts from today onwards
app.get('/api/users/:userId/shifts', async (req, res) => {
  const { userId } = req.params;

  try {
    // This query joins shifts with their descriptions (AM/PM) and ward names.
    // It filters for the specific user and ensures we only get shifts from today or in the future.
    // We limit it to 8 to get today's shift + the next 7 days.
    const query = `
      SELECT 
        s.shift_id,
        s.shift_date,
        sd.shift_code,
        sd.shift_color_hex,
        w.ward_name,
        w.ward_comments
      FROM shifts s
      JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      LEFT JOIN ward w ON s.ward_id = w.ward_id
      WHERE s.user_id = ? AND s.shift_date >= CURDATE()
      ORDER BY s.shift_date ASC
      LIMIT 8
    `;

    const [shifts] = await pool.query(query, [userId]);
    res.json(shifts);

  } catch (err) {
    console.error(`Error fetching shifts for user ${userId}:`, err);
    res.status(500).json({ error: "Failed to fetch user shifts" });
  }
});

// --- END: NEW ENDPOINT ---

// --- START: NEW ENDPOINT FOR MONTHLY CALENDAR SHIFTS ---

// GET: a user's shifts for a specific month and year
app.get('/api/users/:userId/shifts-by-month', async (req, res) => {
  const { userId } = req.params;
  const { year, month } = req.query; // e.g., year=2026, month=1

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month query parameters are required.' });
  }

  try {
    const query = `
      SELECT 
        s.shift_id,
        s.shift_date,
        sd.shift_code,
        sd.shift_color_hex,
        w.ward_name
      FROM shifts s
      JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      LEFT JOIN ward w ON s.ward_id = w.ward_id
      WHERE s.user_id = ? 
        AND YEAR(s.shift_date) = ? 
        AND MONTH(s.shift_date) = ?
      ORDER BY s.shift_date ASC
    `;

    const [shifts] = await pool.query(query, [userId, year, month]);
    res.json(shifts);

  } catch (err) {
    console.error(`Error fetching monthly shifts for user ${userId}:`, err);
    res.status(500).json({ error: "Failed to fetch monthly shifts" });
  }
});
  
// --- START: NEW ENDPOINT TO GET PUBLISHED ROSTERS ---

// GET: a list of all published rosters for the calendar dropdown
app.get('/api/rosters/published', async (req, res) => {
  try {
    // We select the necessary fields and convert the month number to a name for easier use on the frontend.
    // Ordering ensures the list is chronological.
    const query = `
      SELECT 
        roster_id, 
        month, 
        year
      FROM rosters 
      WHERE status = 'Published'
      ORDER BY year DESC, month DESC
    `;

    const [rosters] = await pool.query(query);
    res.json(rosters);

  } catch (err) {
    console.error(`Error fetching published rosters:`, err);
    res.status(500).json({ error: "Failed to fetch published rosters" });
  }
});

// --- END: NEW ENDPOINT ---

// ==================================================================
//  NEW DEDICATED PROFILE ENDPOINTS (Updated with Avatar Support)
// ==================================================================

// 1. GET Profile Data
app.get('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT user_id, full_name, email, contact, avatar_url 
       FROM users WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. PUT Profile Data (Now includes avatar_url)
app.put('/api/profile/:id', async (req, res) => {
  const { id } = req.params;
  // Added avatar_url to the destructuring
  const { full_name, email, contact, avatar_url } = req.body;

  try {
    // Added avatar_url to the SQL Update
    const query = `
      UPDATE users 
      SET full_name = ?, email = ?, contact = ?, avatar_url = ? 
      WHERE user_id = ?
    `;

    const [result] = await pool.query(query, [full_name, email, contact, avatar_url, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found or no changes made' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user: { user_id: id, full_name, email, contact, avatar_url }
    });

  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
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