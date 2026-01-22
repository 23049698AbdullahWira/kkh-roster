const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const { generateRoster } = require('./services/rosterEngine');
const ExcelJS = require('exceljs'); // Import at the top
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
        r.status,
        u.full_name as creator_name 
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
        // let status = 'Draft';
        // if (row.publish_date && new Date(row.publish_date) <= today) {
        //     status = 'Published';
        // }

        // Convert month number (1-12) to name (January)
        // We subtract 1 because array starts at 0
        const monthName = monthNames[row.month - 1] || 'Unknown';

        return {
            id: row.roster_id,
            title: `${monthName} Roster ${row.year}`,
            generatedBy: row.creator_name || 'Unknown', // This will show their email
            createdOn: row.created_at,
            deadline: row.publish_date,
            // status: status,
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

// POST /api/rosters
app.post('/api/rosters', async (req, res) => {
  // 1. EXTRACT DATA
  // We no longer need 'title' or 'notes' from the body
  const { month, year, userId } = req.body; 

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and Year are required.' });
  }

  try {
    // 2. PREPARE DATA
    // Convert "January" -> 1 (if your DB stores months as Integers)
    const monthMap = {
      "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
      "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
    };
    const monthInt = monthMap[month] || month; 
    
    // Auto-Generate the Title (Remarks)
    const autoRemarks = `${month} ${year} Roster`;
    
    // Fallback ID
    const creatorId = userId || 1; 

    // --- 3. DUPLICATE CHECK ---
    // Before inserting, check if this month/year combo exists
    const [existing] = await pool.query(
      "SELECT roster_id FROM rosters WHERE month = ? AND year = ?",
      [monthInt, year]
    );

    if (existing.length > 0) {
      // Return 409 Conflict so the frontend knows to show the red error box
      return res.status(409).json({ message: `A roster for ${month} ${year} already exists.` });
    }

    // --- 4. INSERT ---
    const sql = `
      INSERT INTO rosters (month, year, remarks, status, created_at, creator_user_id) 
      VALUES (?, ?, ?, 'Preference Open', NOW(), ?)
    `;

    const [result] = await pool.query(sql, [
      monthInt, 
      year, 
      autoRemarks, // Use the auto-generated title
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

// GET: Fetch all available shift types from the database
app.get('/api/shift-types', async (req, res) => {
  try {
    // --- CHANGED: Added 'shift_type_id' ---
    const [rows] = await pool.query('SELECT shift_type_id, shift_code, shift_color_hex, is_work_shift FROM shift_desc');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Fetch all wards
app.get('/api/wards', async (req, res) => {
  try {
    // We select ward_name (the code) and ward_comments (the full name)
    const [rows] = await pool.query('SELECT ward_id, ward_name, ward_comments FROM ward'); 
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST: Create or Update a Shift
app.post('/api/shifts/update', async (req, res) => {
  const { userId, date, shiftTypeId, rosterId, wardId } = req.body;

  try {
    // If shiftTypeId is missing or "OFF", delete the shift
    if (!shiftTypeId || shiftTypeId === 'OFF') {
      await pool.query('DELETE FROM shifts WHERE user_id = ? AND shift_date = ?', [userId, date]);
      return res.json({ message: 'Shift removed' });
    }

    // Insert or Update (Upsert)
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
// POST /api/rosters/update-status
app.post('/api/rosters/update-status', async (req, res) => {
  const { rosterId, status } = req.body;

  try {
    let sql = 'UPDATE rosters SET status = ? WHERE roster_id = ?';
    
    // --- NEW LOGIC: If Publishing, also set the date ---
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

// Get Roster Details (To know the current status)
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

// UPDATE User (PUT /users/:id) - Handles Contact Update
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
  } catch (err) {
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

// ================= Create Leave =================
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

// --- AUTO-FILL ROSTER ROUTE (Optimized: Bulk Insert) ---
app.post('/api/rosters/auto-fill', async (req, res) => {
  const { rosterId, month, year } = req.body;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Fetch Data
    const [users] = await connection.query("SELECT * FROM users WHERE role = 'APN'");
    const [existingShifts] = await connection.query(
      `SELECT s.*, sd.shift_code 
       FROM shifts s 
       JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id 
       WHERE s.roster_id = ?`,
      [rosterId]
    );
    const [shiftTypes] = await connection.query("SELECT shift_type_id, shift_code FROM shift_desc");

    // 2. Map Codes -> IDs
    const typeMap = {};
    shiftTypes.forEach(t => typeMap[t.shift_code] = t.shift_type_id);

    // 3. Run Engine (Fast in-memory calculation)
    const newAssignments = await generateRoster(month, year, users, existingShifts);

    // 4. Prepare Data for Bulk Insert
    const valuesToInsert = [];
    const newlyAddedSet = new Set(); // Internal Duplicate Guard

    for (const item of newAssignments) {
      // Create a unique key for this batch (User + Date)
      const shiftKey = `${item.user_id}-${item.shift_date}`;

      // Check 1: Does it exist in DB? (JS Check)
      const existsInDB = existingShifts.find(e => {
        const dbDate = new Date(e.shift_date);
        const dbDateStr = dbDate.toLocaleDateString('en-CA');
        return e.user_id === item.user_id && dbDateStr === item.shift_date;
      });

      // Check 2: Did we already add it to the 'valuesToInsert' list in this loop?
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

          // Mark this slot as 'filled' for this batch
          newlyAddedSet.add(shiftKey);
        }
      }
    }

    // 5. Execute ONE Big Query (With Safety)
    let addedCount = 0;
    if (valuesToInsert.length > 0) {
      // FIX: Use 'INSERT IGNORE' to safely skip any database duplicates
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

// --- UPDATE ROSTER SETTINGS ROUTE (FIXED FIELD NAMES) ---
app.put('/api/rosters/:id/settings', async (req, res) => {
  const { id } = req.params;
  const { remarks, publish_date } = req.body; // <--- Reading correct DB column names

  try {
    const [result] = await pool.query(
      "UPDATE rosters SET remarks = ?, publish_date = ? WHERE roster_id = ?",
      [remarks, publish_date, id] // <--- Mapping to correct DB columns
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

// --- DELETE ROSTER ROUTE ---
app.delete('/api/rosters/:id', async (req, res) => {
  const rosterId = req.params.id;
  
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. First, delete all shifts belonging to this roster
    // (We must do this first, or the database will block us for safety)
    await connection.query('DELETE FROM shifts WHERE roster_id = ?', [rosterId]);

    // 2. Now it is safe to delete the roster itself
    const [result] = await connection.query('DELETE FROM rosters WHERE roster_id = ?', [rosterId]);

    if (result.affectedRows === 0) {
      // If no rows were deleted, the ID didn't exist
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

// GET /api/rosters/:id/download
app.get('/api/rosters/:id/download', async (req, res) => {
  const rosterId = req.params.id;

  const connection = await pool.getConnection();
  try {
    // 1. Fetch Roster Info
    const [rosterMeta] = await connection.query("SELECT * FROM rosters WHERE roster_id = ?", [rosterId]);
    if (rosterMeta.length === 0) return res.status(404).send("Roster not found");
    
    const { month, year } = rosterMeta[0];

    // 2. Fetch Shifts + Colors
    // We now grab 'shift_color_hex' from the database
    const [shifts] = await connection.query(`
      SELECT 
        s.shift_date, 
        sd.shift_code, 
        sd.shift_color_hex,  /* <--- Get the Hex Color */
        u.full_name 
      FROM shifts s
      JOIN users u ON s.user_id = u.user_id
      JOIN shift_desc sd ON s.shift_type_id = sd.shift_type_id
      WHERE s.roster_id = ?
      ORDER BY u.full_name, s.shift_date
    `, [rosterId]);

    // 3. Setup Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${month} ${year}`);

    // 4. Columns
    const daysInMonth = new Date(year, new Date(`${month} 1, 2000`).getMonth() + 1, 0).getDate();
    const columns = [{ header: 'Nurse Name', key: 'name', width: 25 }];
    for (let i = 1; i <= daysInMonth; i++) columns.push({ header: `${i}`, key: `day_${i}`, width: 6 });
    worksheet.columns = columns;

    // 5. Process Data & Build Color Map
    const nurseMap = {};
    const colorMap = {}; // <--- Stores 'AM' -> '#10B981'

    shifts.forEach(shift => {
      const name = shift.full_name;
      const dateStr = typeof shift.shift_date === 'string' 
        ? shift.shift_date.split('T')[0] 
        : shift.shift_date.toISOString().split('T')[0];
      const day = parseInt(dateStr.split('-')[2], 10);

      // Store Row Data
      if (!nurseMap[name]) nurseMap[name] = { name: name };
      nurseMap[name][`day_${day}`] = shift.shift_code;

      // Store Color Mapping (if exists)
      if (shift.shift_code && shift.shift_color_hex) {
        colorMap[shift.shift_code] = shift.shift_color_hex;
      }
    });

    // 6. Add Rows
    Object.values(nurseMap).forEach(row => worksheet.addRow(row));

    // 7. Styling with Database Colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.font = { bold: true };
        return;
      }

      row.eachCell((cell, colNumber) => {
        // Basic Alignment & Border
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        // Apply Color if it's a shift cell
        if (colNumber > 1) { 
            const code = cell.value;
            const hex = colorMap[code]; // Look up the color from DB

            if (hex) {
                // Excel expects ARGB (FF + Hex without #)
                // Example: #10B981 -> FF10B981
                const cleanHex = hex.replace('#', '');
                const argbColor = `FF${cleanHex}`;

                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: argbColor }
                };

                // OPTIONAL: Make text white if background is dark?
                // For now, let's keep it black unless you want "smart text color" logic.
                // cell.font = { color: { argb: 'FFFFFFFF' } }; 
            }
        }
      });
    });

    // 8. Send File
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
