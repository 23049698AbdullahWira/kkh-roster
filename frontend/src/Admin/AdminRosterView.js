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
  // --- STATE ---
  const [days, setDays] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW: STATE FOR DYNAMIC SHIFT OPTIONS ---
  const [shiftOptions, setShiftOptions] = useState([]); 

  const [isEditing, setIsEditing] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  // --- 1. CALENDAR MATH (Same as before) ---
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

  // --- 2. FETCH DATA (Updated to fetch Shift Types) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // A. Get Users
        const userRes = await fetch('http://localhost:5000/users');
        const userData = await userRes.json();
        const nursesOnly = userData.filter(user => user.role === 'APN');

        // B. Get Existing Shifts
        const shiftRes = await fetch(`http://localhost:5000/api/shifts/${rosterId}`);
        const shiftData = await shiftRes.json();

        // C. NEW: Get Shift Types from Database
        const typeRes = await fetch('http://localhost:5000/api/shift-types');
        const typeData = await typeRes.json();

        setStaffList(nursesOnly);
        setShifts(shiftData);
        setShiftOptions(typeData); // Store the types from DB
        setLoading(false);
      } catch (err) {
        console.error("Error loading roster:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [rosterId]);

  // --- HELPER (Same as before) ---
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

  const handleCellClick = (userId, dateString, currentShiftCode) => {
    if (!isEditing) return;
    setSelectedCell({ userId, dateString, currentShiftCode });
  };

  const handleSelectShift = async (code, color) => {
    if (!selectedCell) return;
    const { userId, dateString } = selectedCell;

    // Optimistic Update
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
            roster_id: rosterId
        }];
    });

    setSelectedCell(null);

    // Send to Backend
    try {
        await fetch('http://localhost:5000/api/shifts/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                date: dateString,
                shiftCode: code,
                color: color,
                rosterId
            })
        });
    } catch (err) {
        console.error("Failed to save shift", err);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="roster" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} />

      <main style={{ maxWidth: 1400, margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button type="button" onClick={onBack} style={{ padding: '8px 20px', background: 'white', borderRadius: 68, border: '1px solid #DDDDDD', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>{month} Roster {year}</h1>
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

        {/* LOADING */}
        {loading ? (
            <div style={{textAlign: 'center', padding: 40, fontSize: 18, color: '#666'}}>Loading Roster Data...</div>
        ) : (
            
        /* TABLE GRID */
        <div style={{ width: '100%', background: 'white', boxShadow: '0 4px 4px rgba(0,0,0,0.25)', borderRadius: 8, overflow: 'auto', maxHeight: '75vh' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 20, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 10, minWidth: 150 }}>Nurse Name</th>
                {days.map((d) => (
                  <th key={d.day} style={{ borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 6, minWidth: 40, background: '#F9FAFB', fontSize: 14 }}>
                    {d.day} <br/> <span style={{fontSize: 11, fontWeight: 'normal'}}>{d.label}</span>
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
                          onClick={() => handleCellClick(staff.user_id, d.fullDate, shift.code)}
                          style={{ 
                              borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', textAlign: 'center', 
                              background: shift.color, height: 40, fontSize: 13, fontWeight: 700,
                              color: ['#0F9468', '#3366FF', '#4A4A4A', '#FBBF24'].includes(shift.color) ? 'white' : 'black',
                              cursor: isEditing ? 'pointer' : 'default',
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

      {/* --- NEW: DYNAMIC MODAL --- */}
      {selectedCell && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedCell(null)}>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: 300 }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: 16 }}>Select Shift</h3>
                <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Date: {selectedCell.dateString}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* 1. Map through Database Types */}
                    {shiftOptions.map(opt => (
                        <button 
                            key={opt.shift_code}
                            onClick={() => handleSelectShift(opt.shift_code, opt.shift_color_hex)}
                            style={{
                                padding: '16px', borderRadius: 8, border: 'none',
                                background: opt.shift_color_hex,
                                color: 'white', // Assuming dark colors for shifts
                                fontWeight: 700, cursor: 'pointer', fontSize: '16px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                            }}
                        >
                            {opt.shift_code}
                        </button>
                    ))}

                    {/* 2. Manual "OFF" Button (To clear a shift) */}
                    <button 
                        onClick={() => handleSelectShift('OFF', 'white')}
                        style={{
                            padding: '16px', borderRadius: 8, border: '1px solid #CCC',
                            background: 'white', color: '#333',
                            fontWeight: 700, cursor: 'pointer', fontSize: '16px'
                        }}
                    >
                        OFF
                    </button>
                </div>
                
                <button onClick={() => setSelectedCell(null)} style={{ marginTop: 20, width: '100%', padding: 10, background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
            </div>
        </div>
      )}

    </div>
  );
}

export default AdminRosterView;