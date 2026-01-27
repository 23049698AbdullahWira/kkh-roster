const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
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

// ================= ROSTERS LIST =================
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

    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];

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

// ================= SHIFT TYPES =================
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

// ================= SHIFTS FETCH =================
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

// ================= ROSTER STATUS UPDATE =================
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

// ================= ROSTER DETAILS =================
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

// ================= UPDATE USER =================
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

// ================= CHANGE PASSWORD =================
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

// ================= SHIFT DISTRIBUTION =================
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
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  try {
    const query = `
      SELECT 
        u.user_id,
        u.full_name,
        u.role,
        COALESCE(SUM(CASE 
          WHEN sd.shift_code IN ('PH', 'PHO', 'HOL') THEN 1 
          ELSE 0 
        END), 0) AS ph_count,
        COALESCE(SUM(CASE 
          WHEN DAYOFWEEK(s.shift_date) = 1 THEN 1 
          ELSE 0 
        END), 0) AS sun_count
      FROM users u
      LEFT JOIN shifts s ON u.user_id = s.user_id AND YEAR(s.shift_date) = ?
      LEFT JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
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

// ================= LEAVE TYPES =================
app.get('/leave_type', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_type');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= ROLES =================
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

// ================= LEAVE APPLICATIONS =================
app.get('/leave_has_users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_has_users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

app.patch('/leave_has_users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, approverId } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid status provided.' });
  }

  if (!approverId) {
    console.warn(`Action Log Warning: approverId not provided for leave status update (ID: ${id}).`);
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
      return res
        .status(404)
        .json({ success: false, message: 'Leave request not found.' });
    }

    const { user_id, applicant_name, leave_type, leave_start, leave_end } = leaveDetails[0];

    const [result] = await pool.query(
      'UPDATE leave_has_users SET status = ? WHERE leave_data_id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Leave request not found during update.' });
    }

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
             WHERE month = MONTH(?) 
             AND year = YEAR(?) LIMIT 1`,
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
          } else {
            console.warn(`Skipping roster update: No roster found for ${dateStr}.`);
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
      } else {
        console.warn(`Could not find approver with ID ${approverId} to log the action.`);
      }
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

// ================= AUTH =================
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

    if (createdByUserId) {
      const creatorRole = (createdByRole || '').toUpperCase();
      const creatorName = createdByName || 'Unknown User';
      const newRole = (role || '').toUpperCase();

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

// ================= AUTO-FILL ROSTER =================
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

// ================= ROSTER SETTINGS UPDATE =================
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

// ================= DELETE ROSTER =================
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

// ================= ROSTER DOWNLOAD =================
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

// ================= ACTION LOGS =================
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
