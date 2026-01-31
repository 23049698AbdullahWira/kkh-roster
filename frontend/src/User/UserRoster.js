import React, { useState, useEffect, useMemo, useRef } from 'react'; // Added useRef
import UserNavbar from '../Nav/UserNavbar.js';
import './UserRoster.css';

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
  
  // --- NEW: YEAR FILTER STATE & ANIMATION ---
  const [filterYear, setFilterYear] = useState('All');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 4, width: 0 }); // Default position
  const tabsRef = useRef([]); // To store refs of filter buttons

  const [wardOptions, setWardOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);

  // ... [INITIAL FETCH useEffect remains the same] ...
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

  // ... [FETCH ROSTER DETAILS useEffect remains the same] ...
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
    return { code: '', color: 'transparent' };
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
    if (!hexColor || hexColor === 'transparent' || hexColor === 'white' || hexColor === '#FFFFFF') return '#1F2937';
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

  // --- RESTORED: CALCULATE "MY SHIFT TODAY" ---
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

  // --- 4. UNIQUE YEARS CALCULATION & SLIDER LOGIC ---
  const uniqueYears = useMemo(() => {
    const years = availableRosters.map(r => r.year);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [availableRosters]);

  const filteredRosters = useMemo(() => {
    if (filterYear === 'All') return availableRosters;
    return availableRosters.filter(r => r.year.toString() === filterYear.toString());
  }, [availableRosters, filterYear]);

  // --- Effect to calculate slider position ---
  useEffect(() => {
    // Find the active tab in the refs array based on the filterYear
    const activeTab = tabsRef.current.find(ref => ref && ref.getAttribute('data-year') === filterYear.toString());
    
    if (activeTab) {
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    }
  }, [filterYear, showRosterSelector, uniqueYears]); // Re-run when modal opens or year changes

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
    <div className="user-userroster-container">
      <UserNavbar
        active="roster"
        onLogout={onLogout}
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      <main className="user-userroster-main">
        {/* ... Header & Grid code remains identical ... */}
        <div className="user-userroster-header">
          <div className="user-userroster-selector-container">
            {availableRosters.length > 0 ? (
              <button 
                onClick={() => setShowRosterSelector(true)}
                className="user-userroster-title-btn"
              >
                <h1 className="user-userroster-title-text">
                  {selectedRoster ? `${selectedRoster.month} Roster ${selectedRoster.year}` : 'Select Roster'}
                </h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 4 }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ) : (
              <h1 className="user-userroster-title-text">No Rosters</h1>
            )}
            
            {selectedRoster && (
                <div className="user-userroster-status-line">
                    STATUS: <span className={`user-userroster-status-value ${selectedRoster.status === 'Published' || selectedRoster.status === 'Preference Open' ? 'user-userroster-status-published' : 'user-userroster-status-draft'}`}>{selectedRoster.status.toUpperCase()}</span>
                </div>
            )}
          </div>

          {/* RIGHT: RESTORED MY SHIFT CARD */}
          <div className="user-userroster-myshift-container">
            {myTodayShift && (
                <div className="user-userroster-myshift-card">
                    <div 
                      className="user-userroster-myshift-colorbox"
                      style={{ 
                        background: myTodayShift.color, 
                        color: getContrastTextColor(myTodayShift.color)
                      }}
                    >
                        {myTodayShift.code}
                    </div>

                    <div className="user-userroster-myshift-text">
                        <div className="user-userroster-myshift-label">
                            TODAY
                        </div>
                        <div 
                            className="user-userroster-myshift-value"
                            title={myTodayShift.ward !== 'Not Assigned' ? myTodayShift.ward : myTodayShift.desc}
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

        {loading ? (
          <div className="user-userroster-loading">Loading Roster Data...</div>
        ) : availableRosters.filter(r => r.status === 'Published').length === 0 ? (
          <div className="user-userroster-empty">No published schedules found.</div>
        ) : (
          <div className="user-userroster-table-wrapper">
            <div className="user-userroster-table-scroll">
              <table className="user-userroster-table">
                <thead className="user-userroster-thead">
                  <tr>
                    <th className="user-userroster-th-corner">
                      <div className="user-userroster-nurse-header-text">Nurse Name ↓</div>
                    </th>
                    {days.map(d => {
                      const isToday = d.fullDate === todayString;
                      return (
                          <th key={d.day} className={`user-userroster-th-day ${isToday ? 'user-userroster-th-today' : ''}`}>
                              <div className="user-userroster-day-num">{d.day}</div>
                              <div className="user-userroster-day-name">{d.label}</div>
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
                              <td className="user-userroster-td-nurse">
                                <div className="user-userroster-nurse-cell-content">
                                  {isFirstInGroup && <div className="user-userroster-service-label">{svc}</div>}
                                  <div className="user-userroster-name-row">
                                    <span className="user-userroster-nurse-name">{staff.full_name}</span>
                                    {staff.ward_id && (
                                      <span className="user-userroster-ward-badge">
                                        {wardOptions.find(w => w.ward_id === staff.ward_id)?.ward_name || ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {days.map(d => {
                                const shiftData = getShift(staff.user_id, d.fullDate);
                                return (
                                  <td 
                                    key={d.day} 
                                    onClick={() => handleCellClick(staff, d.fullDate, shiftData)} 
                                    className={`user-userroster-td-shift ${shiftData.code ? 'user-userroster-clickable' : ''}`}
                                    style={{ 
                                        backgroundColor: shiftData.color, 
                                        color: getContrastTextColor(shiftData.color), 
                                    }}
                                  >
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
          </div>
        )}
      </main>

      {/* --- POPUPS --- */}
      
      {/* 1. ROSTER SELECTOR MODAL */}
      {showRosterSelector && (
        <div
          onClick={() => setShowRosterSelector(false)}
          className="user-userroster-modal-overlay"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="user-userroster-modal-content"
          >
            <div className="user-userroster-modal-header">
              <h3 className="user-userroster-modal-title">Select Roster</h3>
              <button onClick={() => setShowRosterSelector(false)} className="user-userroster-modal-close">✕</button>
            </div>

            {/* --- SLIDING YEAR FILTER BAR --- */}
            <div className="user-userroster-filter-container">
                <div className="user-userroster-filter-bar">
                    {/* The Sliding Background Pill */}
                    <div 
                        className="user-userroster-filter-indicator" 
                        style={{ left: indicatorStyle.left, width: indicatorStyle.width }} 
                    />

                    {/* "All" Button */}
                    <button 
                        ref={el => tabsRef.current[0] = el}
                        data-year="All"
                        className={`user-userroster-filter-chip ${filterYear === 'All' ? 'active' : ''}`}
                        onClick={() => setFilterYear('All')}
                    >
                        All Years
                    </button>

                    {/* Dynamic Year Buttons */}
                    {uniqueYears.map((y, index) => (
                        <button 
                            key={y}
                            ref={el => tabsRef.current[index + 1] = el}
                            data-year={y}
                            className={`user-userroster-filter-chip ${filterYear.toString() === y.toString() ? 'active' : ''}`}
                            onClick={() => setFilterYear(y)}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* ROSTER LIST */}
            <div className="user-userroster-roster-list">
              {filteredRosters.length === 0 ? (
                  <div className="user-userroster-empty-filter">No rosters found for {filterYear}</div>
              ) : (
                  filteredRosters.map(r => {
                    const isActive = (selectedRoster?.roster_id || selectedRoster?.id) === (r.roster_id || r.id);
                    const isPublished = r.status === 'Published';
                    const buttonClass = `user-userroster-roster-btn ${!isPublished ? 'user-userroster-btn-disabled' : (isActive ? 'user-userroster-btn-active' : 'user-userroster-btn-default')}`;

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
                        className={buttonClass}
                      >
                        <div>
                          <div className="user-userroster-btn-month">
                            {r.month} {r.year}
                          </div>
                          <div className="user-userroster-btn-status">
                            Status: <span className={isPublished ? 'user-userroster-status-published' : 'user-userroster-status-draft'}>{r.status}</span>
                          </div>
                        </div>
                        {isActive && <div className="user-userroster-icon-active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SHIFT DETAILS MODAL */}
      {viewModalData && (
        <div onClick={() => setViewModalData(null)} className="user-userroster-modal-overlay">
            <div onClick={e => e.stopPropagation()} className="user-userroster-view-modal-content">
                <div 
                  className="user-userroster-view-header"
                  style={{ 
                    background: viewModalData.color, 
                    color: getContrastTextColor(viewModalData.color) 
                  }}
                >
                    <button onClick={() => setViewModalData(null)} className="user-userroster-view-close">✕</button>
                    <h1 className="user-userroster-view-title">{viewModalData.shiftCode}</h1>
                    <div className="user-userroster-view-tag">{getShiftTypeDetails(viewModalData.shiftCode)}</div>
                </div>
                <div className="user-userroster-view-body">
                    <div className="user-userroster-nurse-info">
                        <div className="user-userroster-nurse-avatar">{getInitials(viewModalData.nurseName)}</div>
                        <div>
                            <div className="user-userroster-detail-label-sm">Assigned Nurse</div>
                            <div className="user-userroster-detail-value-lg">{viewModalData.nurseName}</div>
                        </div>
                    </div>
                    <div className="user-userroster-details-grid">
                        <div className="user-userroster-detail-box">
                            <div className="user-userroster-icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                            <div><div className="user-userroster-detail-label">LOCATION</div><div className="user-userroster-detail-value">{getWardName(viewModalData.wardId)}</div></div>
                        </div>
                        <div className="user-userroster-detail-box">
                            <div className="user-userroster-icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                            <div><div className="user-userroster-detail-label">DATE</div><div className="user-userroster-detail-value">{viewModalData.date.split('-').reverse().join('-')}</div></div>
                        </div>
                    </div>
                    <div className="user-userroster-view-footer"><button onClick={() => setViewModalData(null)} className="user-userroster-view-btn-close">Close</button></div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default UserRoster;