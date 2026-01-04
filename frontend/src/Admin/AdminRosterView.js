import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

function AdminRosterView({
  rosterId = 1,
  month = 'December',
  year = 2025,
  onBack,
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
}) {
  const [days, setDays] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rosterStatus, setRosterStatus] = useState('Preference Open'); // Default

  // Dynamic Data
  const [shiftOptions, setShiftOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);

  const [isEditing, setIsEditing] = useState(false);

  // --- STATE FOR EDIT MODAL ---
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [tempSelectedShift, setTempSelectedShift] = useState(null);

  // --- STATE FOR VIEW DETAILS MODAL (NEW) ---
  const [viewModalData, setViewModalData] = useState(null);

  // --- NEW: REFRESH TRIGGER (The Fix for Logout Issue) ---
  const [refreshTrigger, setRefreshTrigger] = useState(0); // <--- ADDED THIS LINE

  // 1. Calendar Math
  useEffect(() => {
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const tempDays = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, monthIndex, i);
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];

      tempDays.push({
        day: i,
        label: daysOfWeek[date.getDay()],
        fullDate: localDate
      });
    }
    setDays(tempDays);
  }, [month, year]);

  // 2. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // --- NEW: Fetch Roster Status ---
        const rosterRes = await fetch(`http://localhost:5000/api/rosters/${rosterId}`);
        const rosterData = await rosterRes.json();
        if (rosterData && rosterData.status) {
          setRosterStatus(rosterData.status);
        }

        // Fetch Users
        const userRes = await fetch('http://localhost:5000/users');
        const userData = await userRes.json();
        const nursesOnly = userData.filter(user => user.role === 'APN');

        // Fetch Shifts
        const shiftRes = await fetch(`http://localhost:5000/api/shifts/${rosterId}`);
        const shiftData = await shiftRes.json();

        // Fetch Shift Types
        const typeRes = await fetch('http://localhost:5000/api/shift-types');
        const typeData = await typeRes.json();

        // Fetch Wards
        const wardRes = await fetch('http://localhost:5000/api/wards');
        const wardData = await wardRes.json();

        setStaffList(nursesOnly);
        setShifts(shiftData);
        setShiftOptions(typeData);
        setWardOptions(wardData);

        setLoading(false);
      } catch (err) {
        console.error("Error loading roster:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [rosterId, refreshTrigger]); // <--- ADDED refreshTrigger as dependency

  // Helper: Find Shift for Cell
  const getShiftForCell = (userId, dateString) => {
    const found = shifts.find(s =>
      s.user_id === userId &&
      s.shift_date.startsWith(dateString)
    );
    if (found) {
      return { code: found.shift_code, color: found.shift_color_hex };
    }
    return { code: '', color: 'white' };
  };

  // Helper: Get Full Ward Name from ID
  const getWardName = (wardId) => {
    if (!wardId) return 'Not Assigned';

    // FIX: Convert wardId to a Number so we can use '===' safely
    const ward = wardOptions.find(w => w.ward_id === Number(wardId));

    return ward ? `${ward.ward_comments} (${ward.ward_name})` : 'Unknown Ward';
  };

  // Helper: Check if it is a working shift
  const getShiftTypeDetails = (shiftCode) => {
    const type = shiftOptions.find(t => t.shift_code === shiftCode);
    return type ? (type.is_work_shift === 'Y' ? 'Working Shift' : 'Leave / Off') : 'Unknown';
  };

  // --- UPDATED CLICK HANDLER ---
  const handleCellClick = (userId, dateString, currentShiftCode, staffName) => {

    // Find existing shift data
    const existingShift = shifts.find(s => s.user_id === userId && s.shift_date.startsWith(dateString));

    // SCENARIO 1: VIEW MODE (Read Only)
    if (!isEditing) {
      // If there is a shift, show details. If empty, do nothing.
      if (existingShift) {
        setViewModalData({
          userId: userId,
          nurseName: staffName,
          date: dateString,
          shiftCode: existingShift.shift_code,
          color: existingShift.shift_color_hex,
          wardId: existingShift.ward_id,
          shiftId: existingShift.shift_type_id
        });
      }
      return;
    }

    // SCENARIO 2: EDIT MODE
    const defaultWard = existingShift ? existingShift.ward_id : (wardOptions[0]?.ward_id || '');

    if (existingShift) {
      setTempSelectedShift({
        id: existingShift.shift_type_id,
        code: existingShift.shift_code,
        color: existingShift.shift_color_hex
      });
    } else {
      setTempSelectedShift(null);
    }

    setSelectedWardId(defaultWard);
    setSelectedCell({ userId, dateString, currentShiftCode });
  };

  // Save Shift Logic
  const handleSelectShift = async (typeId, code, color) => {
    if (!selectedCell) return;

    if (code !== 'OFF' && !selectedWardId) {
      alert("Please select a Ward first.");
      return;
    }

    const { userId, dateString } = selectedCell;

    setShifts(prevShifts => {
      const filtered = prevShifts.filter(s =>
        !(s.user_id === userId && s.shift_date.startsWith(dateString))
      );
      if (code === 'OFF') return filtered;

      return [...filtered, {
        user_id: userId,
        shift_date: dateString,
        shift_code: code,
        shift_color_hex: color,
        roster_id: rosterId,
        ward_id: selectedWardId,
        shift_type_id: typeId // Store this so view modal can find it later
      }];
    });

    setSelectedCell(null);

    try {
      await fetch('http://localhost:5000/api/shifts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: dateString,
          shiftTypeId: typeId,
          rosterId,
          wardId: selectedWardId
        })
      });
    } catch (err) {
      console.error("Failed to save shift", err);
    }
  };

  // Handle Delete from View Modal
  const handleDeleteFromModal = async () => {
    if (!viewModalData) return;

    // 1. Confirm with user
    if (!window.confirm(`Are you sure you want to delete this ${viewModalData.shiftCode} shift?`)) {
      return;
    }

    const { userId, date } = viewModalData;

    // 2. Optimistic Update (Remove from screen immediately)
    setShifts(prevShifts => prevShifts.filter(s =>
      !(s.user_id === userId && s.shift_date.startsWith(date))
    ));

    // 3. Close Modal
    setViewModalData(null);

    // 4. Send "OFF" to backend (which deletes/clears it)
    try {
      await fetch('http://localhost:5000/api/shifts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date,
          shiftTypeId: 'OFF', // Treat as removing
          rosterId,
          wardId: null
        })
      });
    } catch (err) {
      console.error("Failed to delete shift", err);
      alert("Error deleting shift");
    }
  };

  // Helper: Get initials from name (e.g. "Sarah Lim" -> "SL")
  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper: Determine text color (black/white) based on background HEX contrast
  const getContrastTextColor = (hexColor) => {
    if (!hexColor) return 'white';

    // Remove hex hash
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate brightness (YIQ formula)
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Return dark gray for bright backgrounds, white for dark backgrounds
    // Threshold of 160 is a good balance for pastel colors like your "DO" shift
    return brightness > 160 ? '#1F2937' : 'white';
  };

  // Handle Status Change
  const handleClosePreferences = async () => {
    const confirmClose = window.confirm(
      "Are you sure you want to Close Preferences?\n\nThis will stop staff from submitting requests and move the roster to 'Drafting' mode."
    );

    if (!confirmClose) return;

    try {
      const res = await fetch('http://localhost:5000/api/rosters/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId, status: 'Drafting' })
      });

      if (res.ok) {
        setRosterStatus('Drafting');
        alert("Success! Roster is now in Drafting mode.");
      }
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Error updating status");
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="roster" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} />

      <main style={{ maxWidth: 1400, margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' }}>

        {/* Header - Fixed Centering */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          position: 'relative', // <--- 1. Anchor point
          minHeight: 50 // Ensures height doesn't collapse
        }}>

          {/* Left: Back Button */}
          {/* We wrap it in a div to ensure z-index priority if needed */}
          <div style={{ zIndex: 10 }}>
            <button type="button" onClick={onBack} style={{ padding: '8px 20px', background: 'white', borderRadius: 68, border: '1px solid #DDDDDD', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
          </div>

          {/* Center: Title & Status Badge (ABSOLUTELY POSITIONED) */}
          <div style={{
            position: 'absolute', // <--- 2. Remove from flow
            left: '50%',          // <--- 3. Move to middle
            transform: 'translateX(-50%)', // <--- 4. Center itself
            textAlign: 'center',
            width: 'max-content', // Ensure it doesn't stretch
            zIndex: 0
          }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{month} Roster {year}</h1>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Status: <span style={{ color: rosterStatus === 'Preference Open' ? '#10B981' : '#F59E0B' }}>{rosterStatus}</span>
            </div>
          </div>

          {/* Right: Actions Group */}
          <div style={{ display: 'flex', gap: 12, zIndex: 10 }}>

            {/* Close Preferences Button (Only in Preference Open) */}
            {rosterStatus === 'Preference Open' && (
              <button
                type="button"
                onClick={handleClosePreferences}
                style={{
                  padding: '10px 24px',
                  background: '#7C3AED',
                  color: 'white',
                  borderRadius: 68, border: 'none', cursor: 'pointer', fontWeight: 700,
                  boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)'
                }}
              >
                Close Preferences
              </button>
            )}

            {/* --- NEW: Auto-Fill Button (Only in Drafting) --- */}
            {rosterStatus === 'Drafting' && (
              <button
                type="button"
                onClick={async () => {
                    if(!window.confirm("Run Auto-Fill? This follows the Roster Rules to assign shifts.\n\nThis may take a few seconds.")) return;
                    
                    try {
                        // Show simple loading state (optional, or just wait)
                        document.body.style.cursor = 'wait'; 
                        
                        const res = await fetch('http://localhost:5000/api/rosters/auto-fill', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rosterId, month, year })
                        });
                        
                        document.body.style.cursor = 'default';

                        if (res.ok) {
                            const data = await res.json();
                            alert(data.message); // "Auto-fill complete! Added X shifts."
                            setRefreshTrigger(prev => prev + 1); // <--- ADDED THIS LINE
                        } else {
                            alert("Failed to auto-fill. Check console for details.");
                        }
                    } catch(e) { 
                        document.body.style.cursor = 'default';
                        console.error(e);
                        alert("Error connecting to server."); 
                    }
                }}
                style={{
                  padding: '10px 24px',
                  background: '#10B981', // Emerald Green
                  color: 'white',
                  borderRadius: 68, border: 'none', cursor: 'pointer', fontWeight: 700,
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                {/* Magic Star Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                Auto-Fill
              </button>
            )}

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '10px 24px',
                background: isEditing ? '#2F80ED' : 'white',
                color: isEditing ? 'white' : '#2F80ED',
                borderRadius: 68, border: '1px solid #2F80ED', cursor: 'pointer', fontWeight: 700
              }}
            >
              {isEditing ? 'Done Editing' : 'Edit Roster'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 18, color: '#666' }}>Loading Roster Data...</div>
        ) : (

          /* TABLE GRID */
          <div style={{ width: '100%', background: 'white', boxShadow: '0 4px 4px rgba(0,0,0,0.25)', borderRadius: 8, overflow: 'auto', maxHeight: '75vh' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 20, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 10, minWidth: 150 }}>Nurse Name</th>
                  {days.map((d) => (
                    <th key={d.day} style={{ borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 6, minWidth: 40, background: '#F9FAFB', fontSize: 14 }}>
                      {d.day} <br /> <span style={{ fontSize: 11, fontWeight: 'normal' }}>{d.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.user_id}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 8, fontWeight: 600 }}>
                      {staff.full_name}
                    </td>
                    {days.map((d) => {
                      const shift = getShiftForCell(staff.user_id, d.fullDate);
                      return (
                        <td key={d.day}
                          // Pass staff.full_name to the handler so the modal knows who it is
                          onClick={() => handleCellClick(staff.user_id, d.fullDate, shift.code, staff.full_name)}
                          style={{
                            borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', textAlign: 'center',
                            background: shift.color, height: 40, fontSize: 13, fontWeight: 700,
                            color: ['#0F9468', '#3366FF', '#4A4A4A', '#FBBF24', '#0EA5E9', '#F87171', '#059669', '#10B981', '#1E3A8A'].includes(shift.color) ? 'white' : 'black',
                            cursor: 'pointer', // Always pointer now
                            outline: (selectedCell && selectedCell.userId === staff.user_id && selectedCell.dateString === d.fullDate) ? '3px solid #F59E0B' : 'none',
                          }}>
                          {shift.code}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* --- MODAL 1: EDIT MODE (ORGANIZED SHIFT GROUPS) --- */}
      {selectedCell && (() => {
        // 1. Separate shifts into two groups
        const workingShifts = shiftOptions.filter(s => s.is_work_shift === 'Y');
        const nonWorkingShifts = shiftOptions.filter(s => s.is_work_shift !== 'Y');

        return (
          <div
            onClick={() => setSelectedCell(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 20,
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                width: 440,
                maxHeight: '90vh', // Prevent it from being too tall on small screens
                display: 'flex', flexDirection: 'column', // Flex layout for scrolling
                animation: 'fadeIn 0.2s ease-out'
              }}
            >

              {/* 1. HEADER (Fixed) */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #F3F4F6' }}>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1F2937' }}>Assign Shift</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#6B7280', fontSize: 14, fontWeight: 500 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  {selectedCell.dateString.split('-').reverse().join('-')}
                </div>
              </div>

              {/* 2. SCROLLABLE BODY */}
              <div style={{ padding: 32, overflowY: 'auto' }}>

                {/* WARD SELECTION */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    Select Location
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedWardId}
                      onChange={(e) => setSelectedWardId(e.target.value)}
                      style={{
                        width: '100%', padding: '16px', paddingLeft: '16px',
                        borderRadius: 12, border: '1px solid #E5E7EB',
                        background: '#F9FAFB', fontSize: 15, fontWeight: 600, color: '#374151',
                        appearance: 'none', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      <option value="">-- Choose Ward --</option>
                      {wardOptions.map(ward => (
                        <option key={ward.ward_id} value={ward.ward_id}>
                          {ward.ward_comments} ({ward.ward_name})
                        </option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

                {/* --- GROUP 1: WORKING SHIFTS --- */}
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12, marginTop: 8 }}>
                  Working Shifts
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {workingShifts.map(opt => (
                    <button
                      key={opt.shift_type_id}
                      onClick={() => setTempSelectedShift({ id: opt.shift_type_id, code: opt.shift_code, color: opt.shift_color_hex })}
                      style={{
                        padding: '14px', borderRadius: 12,
                        border: tempSelectedShift?.id === opt.shift_type_id ? '3px solid #1F2937' : '1px solid transparent',
                        background: opt.shift_color_hex,
                        color: getContrastTextColor(opt.shift_color_hex),
                        fontWeight: 800, cursor: 'pointer', fontSize: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transform: tempSelectedShift?.id === opt.shift_type_id ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.1s'
                      }}
                    >
                      {opt.shift_code}
                    </button>
                  ))}
                </div>

                {/* --- GROUP 2: NON-WORKING / LEAVE --- */}
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 }}>
                  Leave & Other
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {nonWorkingShifts.map(opt => (
                    <button
                      key={opt.shift_type_id}
                      onClick={() => setTempSelectedShift({ id: opt.shift_type_id, code: opt.shift_code, color: opt.shift_color_hex })}
                      style={{
                        padding: '14px', borderRadius: 12,
                        border: tempSelectedShift?.id === opt.shift_type_id ? '3px solid #1F2937' : '1px solid transparent',
                        background: opt.shift_color_hex,
                        color: getContrastTextColor(opt.shift_color_hex),
                        fontWeight: 800, cursor: 'pointer', fontSize: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transform: tempSelectedShift?.id === opt.shift_type_id ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.1s'
                      }}
                    >
                      {opt.shift_code}
                    </button>
                  ))}
                </div>
                {/* --- NEW: VISUAL DIVIDER --- */}
                <div style={{
                  margin: '24px 0 16px',       // Top margin pushes it away from the list
                  borderTop: '1px solid #E5E7EB', // The grey line
                  position: 'relative'
                }}>
                  {/* Optional: Label on the line */}
                  <span style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: 'white', padding: '0 8px', color: '#9CA3AF', fontSize: 11, fontWeight: 700
                  }}>
                    OR
                  </span>
                </div>
                {/* CLEAR SHIFT BUTTON */}
                <button
                  onClick={() => setTempSelectedShift({ id: 'OFF', code: 'OFF', color: 'white' })}
                  style={{
                    width: '100%', marginTop: 24, padding: '14px', borderRadius: 12,
                    border: tempSelectedShift?.id === 'OFF' ? '3px solid #EF4444' : '1px solid #E5E7EB',
                    background: tempSelectedShift?.id === 'OFF' ? '#FEF2F2' : 'white',
                    color: tempSelectedShift?.id === 'OFF' ? '#DC2626' : '#374151',
                    fontWeight: 700, cursor: 'pointer', fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.1s'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"></path><path d="M17 17L7 7"></path></svg>
                  Clear Shift
                </button>

              </div>

              {/* 3. FOOTER ACTIONS (Fixed at bottom) */}
              <div style={{ padding: '24px 32px 32px', borderTop: '1px solid #F3F4F6', background: 'white', display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    if (tempSelectedShift) {
                      handleSelectShift(tempSelectedShift.id, tempSelectedShift.code, tempSelectedShift.color);
                    }
                  }}
                  disabled={!tempSelectedShift}
                  style={{
                    flex: 2, padding: '14px',
                    background: '#2563EB', color: 'white',
                    borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '15px',
                    cursor: tempSelectedShift ? 'pointer' : 'not-allowed',
                    opacity: tempSelectedShift ? 1 : 0.5,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  Confirm
                </button>

                <button
                  onClick={() => setSelectedCell(null)}
                  style={{
                    flex: 1, padding: '14px',
                    background: '#F3F4F6', color: '#374151',
                    borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- MODAL 2: VIEW DETAILS MODE (ENHANCED UI & CONTRAST FIX) --- */}
      {viewModalData && (() => {
        // 1. Calculate contrast color before rendering
        const textColor = getContrastTextColor(viewModalData.color);
        const isDarkText = textColor !== 'white';
        // Define subtle semi-transparent backgrounds for buttons based on contrast
        const subtleBg = isDarkText ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.25)';

        return (
          <div
            onClick={() => setViewModalData(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 20,
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                width: 440, // <- INCREASED WIDTH from 360
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >

              {/* 1. HEADER: Colorful & Bold (With Contrast Fix) */}
              <div style={{
                background: viewModalData.color,
                padding: '36px 32px', // Slightly more padding
                textAlign: 'center',
                color: textColor, // <- DYNAMIC TEXT COLOR
                position: 'relative'
              }}>

                {/* Close "X" Icon */}
                <button
                  onClick={() => setViewModalData(null)}
                  style={{
                    position: 'absolute', top: 20, right: 20,
                    background: subtleBg, // <- DYNAMIC BACKGROUND
                    border: 'none',
                    color: textColor, // <- DYNAMIC ICON COLOR
                    width: 36, height: 36, borderRadius: '50%',
                    cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = isDarkText ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'}
                  onMouseOut={(e) => e.currentTarget.style.background = subtleBg}
                >✕</button>

                <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900, letterSpacing: '-1.5px' }}>
                  {viewModalData.shiftCode}
                </h1>

                {/* Status Badge */}
                <div style={{
                  display: 'inline-block', marginTop: 12, padding: '6px 16px',
                  borderRadius: 20,
                  background: subtleBg, // <- DYNAMIC BACKGROUND
                  fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {getShiftTypeDetails(viewModalData.shiftCode)}
                </div>
              </div>

              {/* 2. BODY: Info Cards */}
              <div style={{ padding: 32 }}> {/* Increased padding */}

                {/* STAFF SECTION */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', // Slightly larger avatar
                    background: '#F3F4F6', color: '#9CA3AF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}>
                    {getInitials(viewModalData.nurseName)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Assigned Nurse</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>{viewModalData.nurseName}</div>
                  </div>
                </div>

                {/* DETAILS GRID */}
                <div style={{ display: 'grid', gap: 18 }}>

                  {/* Location Row */}
                  <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>LOCATION</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>
                        {getWardName(viewModalData.wardId)}
                      </div>
                    </div>
                  </div>

                  {/* Date Row */}
                  <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>DATE</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>
                        {viewModalData.date.split('-').reverse().join('-')}
                      </div>
                    </div>
                  </div>
                </div>
                {/* 3. FOOTER: Actions */}
                <div style={{ padding: '24px 32px 32px', display: 'flex', gap: 12 }}>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={handleDeleteFromModal}
                    style={{
                      flex: 1, padding: '14px',
                      background: '#FEE2E2', color: '#DC2626', // Red Styling
                      borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '14px',
                      cursor: 'pointer', transition: 'background 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#FECACA'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#FEE2E2'}
                  >
                    {/* Trash Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                  </button>

                  {/* CLOSE BUTTON */}
                  <button
                    onClick={() => setViewModalData(null)}
                    style={{
                      flex: 1, padding: '14px',
                      background: '#F3F4F6', color: '#374151',
                      borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '14px',
                      cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#E5E7EB'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  >
                    Close
                  </button>

                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

export default AdminRosterView;