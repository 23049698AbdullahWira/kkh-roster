import React, { useState, useEffect, useMemo } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

function UserRoster({ 
  onBack, 
  onGoHome, 
  onGoRoster, 
  onGoShiftPreference, 
  onGoApplyLeave, 
  onGoAccount, 
  onLogout 
}) {
  // --- STATE ---
  const [availableRosters, setAvailableRosters] = useState([]);
  const [selectedRoster, setSelectedRoster] = useState(null); 
  const [days, setDays] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW: STATE FOR REAL-TIME SHIFT ---
  const [todayShiftData, setTodayShiftData] = useState(null); 

  // --- MODAL STATES ---
  const [viewModalData, setViewModalData] = useState(null); 
  const [showRosterSelector, setShowRosterSelector] = useState(false); 
  
  const [wardOptions, setWardOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    const initData = async () => {
      try {
        let currentUserId = 1; 
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
            try {
                const userObj = JSON.parse(storedUserStr);
                if (userObj.userId) currentUserId = userObj.userId; 
            } catch (e) { console.error("Failed to parse user", e); }
        }
        
        console.log("Logged In User ID found:", currentUserId); 

        const [rosterRes, wardRes, typeRes, myShiftRes] = await Promise.all([
            fetch('http://localhost:5000/api/rosters'),
            fetch('http://localhost:5000/api/wards'),
            fetch('http://localhost:5000/api/shift-types'),
            fetch(`http://localhost:5000/api/users/${currentUserId}/shifts`) 
        ]);

        const rosterData = await rosterRes.json();
        const wardData = await wardRes.json();
        const typeData = await typeRes.json();
        const myShiftData = await myShiftRes.json();

        setWardOptions(wardData);
        setShiftOptions(typeData);
        setTodayShiftData(myShiftData);

        const published = rosterData.filter(r => r.status === 'Published');
        const monthMap = { "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5, "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11 };
        
        const sortedData = published.sort((a, b) => {
           if (Number(a.year) !== Number(b.year)) return Number(b.year) - Number(a.year);
           return monthMap[b.month] - monthMap[a.month];
        });

        setAvailableRosters(sortedData);

        if (sortedData.length > 0) {
          const now = new Date();
          const currentVal = now.getFullYear() * 12 + now.getMonth();
          const getRosterVal = (r) => Number(r.year) * 12 + monthMap[r.month];

          const closestRoster = sortedData.reduce((prev, curr) => {
            const prevDiff = Math.abs(getRosterVal(prev) - currentVal);
            const currDiff = Math.abs(getRosterVal(curr) - currentVal);
            return currDiff < prevDiff ? curr : prev;
          });

          setSelectedRoster(closestRoster);
        } else {
          setLoading(false);
        }

      } catch (err) {
        console.error("Failed to initialize data:", err);
        setLoading(false);
      }
    };

    initData();
  }, []);

  // --- 2. FETCH ROSTER DETAILS ---
  useEffect(() => {
    if (!selectedRoster) return;
    const activeId = selectedRoster.roster_id || selectedRoster.id;
    if (!activeId) return;

    const fetchRosterDetails = async () => {
      try {
        setLoading(true);
        const monthIndex = new Date(`${selectedRoster.month} 1, ${selectedRoster.year}`).getMonth();
        const daysInMonth = new Date(selectedRoster.year, monthIndex + 1, 0).getDate();
        const tempDays = [];
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(selectedRoster.year, monthIndex, i);
          const localDate = date.toLocaleDateString('en-CA'); 
          tempDays.push({ day: i, label: daysOfWeek[date.getDay()], fullDate: localDate });
        }
        setDays(tempDays);

        const [userRes, shiftRes] = await Promise.all([
          fetch('http://localhost:5000/users'),
          fetch(`http://localhost:5000/api/shifts/${activeId}`)
        ]);

        const userData = await userRes.json();
        const shiftData = await shiftRes.json();

        setStaffList(userData.filter(u => u.role === 'APN' && u.status === 'Active'));
        setShifts(shiftData);
        setLoading(false);

      } catch (err) {
        console.error("Error loading roster details:", err);
        setLoading(false);
      }
    };

    fetchRosterDetails();
  }, [selectedRoster]);

  // --- 3. HELPERS ---
  const getShift = (userId, dateStr) => {
    const found = shifts.find(s => s.user_id === userId && s.shift_date.startsWith(dateStr));
    if (found) {
        return { 
            code: found.shift_code, 
            color: found.shift_color_hex, 
            ward_id: found.ward_id,
            shift_type_id: found.shift_type_id 
        }; 
    }
    return { code: '', color: 'white' };
  };

  const getWardName = (wardId) => {
    if (!wardId) return 'Not Assigned';
    const ward = wardOptions.find(w => w.ward_id === Number(wardId));
    return ward ? `${ward.ward_comments} (${ward.ward_name})` : 'Unknown Ward';
  };

  const getShiftTypeDetails = (shiftCode) => {
    const type = shiftOptions.find(t => t.shift_code === shiftCode);
    return type ? (type.is_work_shift === 'Y' ? 'Working Shift' : 'Leave / Off') : 'Unknown';
  };

  const getContrastTextColor = (hexColor) => {
    if (!hexColor || hexColor === 'white') return '#1F2937';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 > 160 ? '#1F2937' : 'white';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const handleCellClick = (staff, dateString, shiftData) => {
    if (shiftData.code) {
        setViewModalData({
            userId: staff.user_id,
            nurseName: staff.full_name,
            date: dateString,
            shiftCode: shiftData.code,
            color: shiftData.color,
            wardId: shiftData.ward_id,
            shiftId: shiftData.shift_type_id
        });
    }
  };

  // --- 4. CALCULATE "MY SHIFT TODAY" ---
  const myTodayShift = useMemo(() => {
    if (!todayShiftData || todayShiftData.length === 0) {
        return { code: 'OFF', color: '#F3F4F6', ward: 'No Shift', desc: 'Rest Day' };
    }

    const localDate = new Date().toLocaleDateString('en-CA'); 
    const upcomingShift = todayShiftData[0];
    const apiDate = upcomingShift.shift_date.split('T')[0];

    if (apiDate === localDate) {
        return {
            code: upcomingShift.shift_code,
            color: upcomingShift.shift_color_hex,
            ward: upcomingShift.ward_name 
                ? `${upcomingShift.ward_comments || ''} (${upcomingShift.ward_name})` 
                : 'Not Assigned',
            desc: getShiftTypeDetails(upcomingShift.shift_code)
        };
    }

    return { code: 'OFF', color: '#F3F4F6', ward: 'No Shift', desc: 'Rest Day' };

  }, [todayShiftData, shiftOptions]);


  // --- 5. GROUPING LOGIC ---
  const SERVICE_PRIORITY = ['Acute', 'CE', 'Onco', 'PAS', 'PAME', 'Neonates'];
  const groupedStaff = useMemo(() => {
    const groups = {};
    SERVICE_PRIORITY.forEach(s => groups[s] = []);
    groups['General / Other'] = [];
    const sorted = [...staffList].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    sorted.forEach(staff => {
      const svc = staff.service ? staff.service.trim() : 'General / Other';
      const foundKey = SERVICE_PRIORITY.find(key => svc.includes(key));
      if (foundKey) groups[foundKey].push(staff);
      else groups['General / Other'].push(staff);
    });
    return groups;
  }, [staffList]);

  // --- 6. RENDER ---
  const todayString = new Date().toLocaleDateString('en-CA');

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <UserNavbar
        active="roster"
        onLogout={onLogout}
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      <main style={{ maxWidth: 1600, margin: '24px auto', padding: '0 32px', boxSizing: 'border-box' }}>
        
        {/* --- HEADER --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', minHeight: 60 }}>
          
          <div style={{ width: 450 }}></div>
          
          {/* CENTER: ROSTER SELECTOR */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: 'max-content', zIndex: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {availableRosters.length > 0 ? (
              <button 
                onClick={() => setShowRosterSelector(true)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px', borderRadius: 8, transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, fontFamily: 'Inter, sans-serif', color: '#1F2937' }}>
                  {selectedRoster ? `${selectedRoster.month} ${selectedRoster.year} Roster` : 'Select Roster'}
                </h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            ) : (
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, fontFamily: 'Inter, sans-serif' }}>No Published Rosters</h1>
            )}
            
            {selectedRoster && (
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Status: <span style={{ color: selectedRoster.status === 'Preference Open' ? '#10B981' : (selectedRoster.status === 'Published' ? '#10B981' : '#F59E0B') }}>{selectedRoster.status}</span>
                </div>
            )}
          </div>
          
          {/* RIGHT: MY SHIFT CARD */}
          <div style={{ zIndex: 10, width: 450, display: 'flex', justifyContent: 'flex-end' }}>
            {myTodayShift && (
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: 16, 
                    background: 'white', 
                    padding: '8px 24px 8px 16px',
                    borderRadius: 12, 
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                    height: 54,
                    minWidth: 200, 
                    maxWidth: 420  
                }}>
                    <div style={{ 
                        minWidth: 38, height: 38, borderRadius: 8, 
                        background: myTodayShift.color, 
                        color: getContrastTextColor(myTodayShift.color),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 14,
                        flexShrink: 0, 
                        padding: '0 8px',
                        whiteSpace: 'nowrap' 
                    }}>
                        {myTodayShift.code}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', lineHeight: 1, marginBottom: 4 }}>
                            TODAY
                        </div>
                        <div 
                            title={myTodayShift.ward !== 'Not Assigned' ? myTodayShift.ward : myTodayShift.desc}
                            style={{ 
                                fontSize: 15, fontWeight: 700, color: '#1F2937', lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '320px' 
                            }}
                        >
                            {myTodayShift.ward !== 'Not Assigned' && myTodayShift.ward !== 'No Shift' 
                                ? myTodayShift.ward 
                                : myTodayShift.desc}
                        </div>
                    </div>
                </div>
            )}
          </div>
          
        </div>

        {/* --- MAIN GRID --- */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 18, color: '#666' }}>Loading Roster Data...</div>
        ) : availableRosters.filter(r => r.status === 'Published').length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 12 }}>No published schedules found.</div>
        ) : (
          <div style={{ background: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderRadius: 8, overflow: 'auto', maxHeight: '75vh' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F9FAFB' }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 20, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: '12px 14px', textAlign: 'left', minWidth: 150 }}>Nurse Name</th>
                  {days.map(d => {
                    const isToday = d.fullDate === todayString;
                    return (
                        <th key={d.day} style={{ 
                            borderLeft: '1px solid #8C8C8C', 
                            borderBottom: '1px solid #8C8C8C', 
                            padding: 6, minWidth: 45, fontSize: 13,
                            // HIGHLIGHT ONLY THE HEADER
                            background: isToday ? '#DBEAFE' : 'inherit', 
                            color: isToday ? '#1E40AF' : 'inherit'       
                        }}>
                            {d.day}<br/>
                            <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}>{d.label}</span>
                        </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedStaff).map(([svc, members]) => {
                  if (members.length === 0) return null;
                  return (
                    <React.Fragment key={svc}>
                      {members.map((staff, idx) => {
                        const isFirstInGroup = idx === 0;
                        return (
                          <tr key={staff.user_id}>
                            <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', borderTop: isFirstInGroup ? '3px solid #374151' : 'none', padding: '10px 14px' }}>
                              {isFirstInGroup && <div style={{ fontSize: 10, fontWeight: 900, color: '#2563EB', textTransform: 'uppercase', marginBottom: 2 }}>{svc}</div>}
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>{staff.full_name}</div>
                            </td>
                            {days.map(d => {
                              const shiftData = getShift(staff.user_id, d.fullDate);
                              return (
                                <td key={d.day} onClick={() => handleCellClick(staff, d.fullDate, shiftData)} style={{ 
                                    background: shiftData.color, 
                                    textAlign: 'center', fontWeight: 700, fontSize: 13, 
                                    borderBottom: '1px solid #8C8C8C', 
                                    borderLeft: '1px solid #8C8C8C', 
                                    height: 40, 
                                    borderTop: isFirstInGroup ? '3px solid #374151' : 'none', 
                                    color: getContrastTextColor(shiftData.color), 
                                    cursor: shiftData.code ? 'pointer' : 'default'
                                }}>
                                  {shiftData.code}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ... Popups ... */}
      {showRosterSelector && (
        <div
          onClick={() => setShowRosterSelector(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 20,
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              width: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Select Roster</h3>
              <button onClick={() => setShowRosterSelector(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
            </div>
            
            <div style={{ padding: 16, overflowY: 'auto' }}>
              {availableRosters.map(r => {
                const isActive = (selectedRoster?.roster_id || selectedRoster?.id) === (r.roster_id || r.id);
                const isPublished = r.status === 'Published';

                return (
                  <button
                    key={r.roster_id || r.id}
                    disabled={!isPublished}
                    onClick={() => {
                      if (isPublished) {
                        setSelectedRoster(r);
                        setShowRosterSelector(false);
                      }
                    }}
                    style={{
                      width: '100%', padding: '16px', marginBottom: 8,
                      background: !isPublished ? '#F3F4F6' : (isActive ? '#EFF6FF' : 'white'),
                      border: isActive ? '2px solid #2563EB' : '1px solid #E5E7EB',
                      borderRadius: 12, 
                      cursor: isPublished ? 'pointer' : 'not-allowed', 
                      textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.2s',
                      opacity: !isPublished ? 0.6 : 1
                    }}
                    onMouseOver={(e) => { if(isPublished && !isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseOut={(e) => { if(isPublished && !isActive) e.currentTarget.style.background = 'white'; }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: !isPublished ? '#9CA3AF' : (isActive ? '#2563EB' : '#1F2937') }}>
                        {r.month} {r.year}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                        Status: <span style={{ fontWeight: 600, color: isPublished ? '#10B981' : '#F59E0B' }}>{r.status}</span>
                      </div>
                    </div>
                    {isActive && <div style={{ color: '#2563EB' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                    {!isPublished && <div style={{ color: '#9CA3AF' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewModalData && (
        <div onClick={() => setViewModalData(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: 440, overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ background: viewModalData.color, padding: '36px 32px', textAlign: 'center', color: getContrastTextColor(viewModalData.color), position: 'relative' }}>
                    <button onClick={() => setViewModalData(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.25)', border: 'none', color: 'currentColor', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900, letterSpacing: '-1.5px' }}>{viewModalData.shiftCode}</h1>
                    <div style={{ display: 'inline-block', marginTop: 12, padding: '6px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>{getShiftTypeDetails(viewModalData.shiftCode)}</div>
                </div>
                <div style={{ padding: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>{getInitials(viewModalData.nurseName)}</div>
                        <div><div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Assigned Nurse</div><div style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>{viewModalData.nurseName}</div></div>
                    </div>
                    <div style={{ display: 'grid', gap: 18 }}>
                        <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                            <div><div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>LOCATION</div><div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{getWardName(viewModalData.wardId)}</div></div>
                        </div>
                        <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                            <div><div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>DATE</div><div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{viewModalData.date.split('-').reverse().join('-')}</div></div>
                        </div>
                    </div>
                    <div style={{ marginTop: 32 }}><button onClick={() => setViewModalData(null)} style={{ width: '100%', padding: '14px', background: '#F3F4F6', color: '#374151', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>Close</button></div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default UserRoster;