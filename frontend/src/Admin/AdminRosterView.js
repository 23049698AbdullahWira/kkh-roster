import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

function AdminRosterView({
  rosterId = 1,   // DEFAULT: 1 (You should pass this from the previous page)
  month = 'December',
  year = 2025,
  onBack,
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
}) {
  // --- 1. STATE: This is the "Memory" of the page ---
  const [days, setDays] = useState([]);       // Stores "Mon 1", "Tue 2"...
  const [staffList, setStaffList] = useState([]); // Stores the list of Nurses
  const [shifts, setShifts] = useState([]);   // Stores the colored blocks from DB
  const [loading, setLoading] = useState(true);

  // --- 2. THE CALENDAR MATH: Calculates columns based on Month/Year ---
  useEffect(() => {
    // Convert "December" to 11 (computers count 0-11)
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    // Get the last day of the month (e.g., 28, 30, or 31)
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    const tempDays = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 1; i <= daysInMonth; i++) {
      // Create a date object for each day to find out if it's Mon/Tue/etc
      // Note: We use Local time here to avoid timezone shifts
      const date = new Date(year, monthIndex, i);
      
      // We need a string like "2025-12-05" to match the database
      // The trick: offset timezone to get local ISO date part
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                        .toISOString()
                        .split('T')[0];

      tempDays.push({
        day: i,
        label: daysOfWeek[date.getDay()],
        fullDate: localDate // "2025-12-01"
      });
    }
    setDays(tempDays);
  }, [month, year]);

  // --- 3. DATA FETCHING: Talks to your Node.js Backend ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // A. Get the rows (The Nurses)
        const userRes = await fetch('http://localhost:5000/users');
        const userData = await userRes.json();
        
        // B. Get the colored cells (The Shifts)
        const shiftRes = await fetch(`http://localhost:5000/api/shifts/${rosterId}`);
        const shiftData = await shiftRes.json();

        setStaffList(userData);
        setShifts(shiftData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading roster:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [rosterId]); // Re-run if rosterId changes


  // --- 4. THE MATCHER: Finds the right color for a specific square ---
  const getShiftForCell = (userId, dateString) => {
    // Search the big list of shifts for one that matches THIS user and THIS day
    const found = shifts.find(s => 
      s.user_id === userId && 
      s.shift_date.startsWith(dateString) // Matches "2025-12-05"
    );
    
    // If found, return the code (PM) and color (#0F9468) from DB
    if (found) {
        return { 
            code: found.shift_code, 
            color: found.shift_color_hex 
        };
    }
    // If not found, return empty white box
    return { code: '', color: 'white' };
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="roster" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} />

      <main style={{ maxWidth: 1400, margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' }}>
        
        {/* Header: Title & Back Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button type="button" onClick={onBack} style={{ padding: '8px 20px', background: 'white', borderRadius: 68, border: '1px solid #DDDDDD', cursor: 'pointer', fontWeight: 600 }}>
             ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>{month} Roster {year}</h1>
          <div style={{ width: 100 }}></div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
            <div style={{textAlign: 'center', padding: 40, fontSize: 18, color: '#666'}}>Loading Roster Data...</div>
        ) : (
            
        /* ROSTER GRID CONTAINER */
        <div style={{ width: '100%', background: 'white', boxShadow: '0 4px 4px rgba(0,0,0,0.25)', borderRadius: 8, overflow: 'auto', maxHeight: '75vh' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
            
            {/* TABLE HEADERS (Days) */}
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 20, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 10, minWidth: 150 }}>
                  Nurse Name
                </th>
                {days.map((d) => (
                  <th key={d.day} style={{ borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 6, minWidth: 40, background: '#F9FAFB', fontSize: 14 }}>
                    {d.day} <br/> <span style={{fontSize: 11, fontWeight: 'normal'}}>{d.label}</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* TABLE BODY (Rows of Nurses) */}
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.user_id}>
                  {/* 1. The Sticky Name Column */}
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 8, fontWeight: 600 }}>
                    {staff.name || staff.email}
                  </td>

                  {/* 2. The 30/31 Day Cells */}
                  {days.map((d) => {
                    // ASK THE HELPER: "What is this user doing on this date?"
                    const shift = getShiftForCell(staff.user_id, d.fullDate);
                    
                    return (
                      <td key={d.day} 
                          style={{ 
                              borderLeft: '1px solid #8C8C8C', 
                              borderBottom: '1px solid #8C8C8C', 
                              textAlign: 'center', 
                              // USE THE COLOR FROM DATABASE
                              background: shift.color, 
                              fontSize: 13, 
                              fontWeight: 700,
                              height: 40,
                              color: shift.color === '#0F9468' ? 'white' : 'black' // Optional: white text for dark green
                          }}>
                        {/* SHOW THE CODE (e.g., 'PM') */}
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
    </div>
  );
}

export default AdminRosterView;