import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

// --- STYLES FOR THE UNIFIED MODAL ---
const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 
};

const modalContentStyle = {
  background: 'white', padding: '32px', borderRadius: '16px',
  width: '400px', textAlign: 'center',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};

const modalBtnBase = {
  padding: '10px 24px', borderRadius: '8px', fontSize: '14px',
  fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s', minWidth: '100px'
};

// --- ICON COMPONENTS ---
const IconSort = ({ direction }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
    {direction === 'asc' ? <path d="M12 5v14M19 12l-7 7-7-7" /> : <path d="M12 19V5M5 12l7-7 7 7" />}
  </svg>
);

// New Icon for Preferences
const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const logAction = async ({ userId, details }) => {
  try {
    if (!userId) return;
    await fetch('http://localhost:5000/action-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, details })
    });
  } catch (err) { console.error('Failed to insert action log:', err); }
};

function AdminRosterView({
  rosterId = 1,
  month = 'December',
  year = 2025,
  onBack,
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
  loggedInUser, 
  onLogout,
}) {
  const [days, setDays] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rosterStatus, setRosterStatus] = useState('Preference Open');

  // Dynamic Data
  const [shiftOptions, setShiftOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal States
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [tempSelectedShift, setTempSelectedShift] = useState(null);
  const [viewModalData, setViewModalData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- NEW STATES FOR PREFERENCE MODAL ---
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [preferences, setPreferences] = useState([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  // [NEW] Pagination State
  const [prefPage, setPrefPage] = useState(1); 
  const prefsPerPage = 5;

  const [selectedPrefIds, setSelectedPrefIds] = useState([]);
  const [hasPendingPrefs, setHasPendingPrefs] = useState(false);

  // --- NEW: UNIFIED NOTIFICATION STATE ---
  const [notification, setNotification] = useState(null);

  // --- HELPER FOR LOGGING USER DETAILS ---
  const adminName = loggedInUser?.full_name || loggedInUser?.fullName || 'Admin';
  const adminId = loggedInUser?.user_id || loggedInUser?.userId;

  const showNotification = ({ type, title, message, theme = 'neutral', onConfirm = null }) => {
    setNotification({ type, title, message, theme, onConfirm });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const sortedStaffList = React.useMemo(() => {
    return [...staffList].sort((a, b) => {
      const nameA = (a.full_name || '').toLowerCase();
      const nameB = (b.full_name || '').toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [staffList, sortOrder]);

  // 1. Calendar Math
  useEffect(() => {
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const tempDays = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, monthIndex, i);
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      tempDays.push({ day: i, label: daysOfWeek[date.getDay()], fullDate: localDate });
    }
    setDays(tempDays);
  }, [month, year]);

  // 2. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const prefRes = await fetch(`http://localhost:5000/api/preferences/${rosterId}`);
        if (prefRes.ok) {
            const prefData = await prefRes.json();
            // Show dot if there is at least 1 pending request
            setHasPendingPrefs(prefData.length > 0);
        }
        const rosterRes = await fetch(`http://localhost:5000/api/rosters/${rosterId}`);
        const rosterData = await rosterRes.json();
        if (rosterData && rosterData.status) setRosterStatus(rosterData.status);

        const userRes = await fetch('http://localhost:5000/users');
        const userData = await userRes.json();
        const nursesOnly = userData.filter(user => user.role === 'APN' && user.status === 'Active');

        const shiftRes = await fetch(`http://localhost:5000/api/shifts/${rosterId}`);
        const shiftData = await shiftRes.json();

        const typeRes = await fetch('http://localhost:5000/api/shift-types');
        const typeData = await typeRes.json();

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
  }, [rosterId, refreshTrigger]);

  // Helpers
  const getShiftForCell = (userId, dateString) => {
    const found = shifts.find(s => s.user_id === userId && s.shift_date.startsWith(dateString));
    return found ? { code: found.shift_code, color: found.shift_color_hex } : { code: '', color: 'white' };
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

  // --- NEW: FETCH PREFERENCES ---
  const handleOpenPreferences = async () => {
    setShowPrefModal(true);
    setLoadingPrefs(true);
    setPrefPage(1);
    try {
      const res = await fetch(`http://localhost:5000/api/preferences/${rosterId}`);
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      } else {
        setPreferences([]); // Reset if fail
      }
    } catch (err) {
      console.error("Failed to fetch preferences", err);
    } finally {
      setLoadingPrefs(false);
    }
  };

// --- HANDLE PREFERENCE ACTION (Accept/Reject) ---
  const handlePrefAction = async (prefId, newStatus, staffName, shiftDate) => {
    // 1. Find the specific preference object to get details
    const pref = preferences.find(p => p.shiftPref_id === prefId);
    if (!pref) return;

    try {
      // 2. Call Backend to update preference status
      const res = await fetch('http://localhost:5000/api/preferences/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefId, status: newStatus })
      });

      if (res.ok) {
        setPreferences(prev => {
        const newList = prev.filter(p => p.shiftPref_id !== prefId);
        
        // If the list is now empty, turn off the red dot
        if (newList.length === 0) {
            setHasPendingPrefs(false);
        }
        
        return newList;
      });
        
        // 4. Log the Action
        const actionWord = newStatus === 'Approved' ? 'Approved' : 'Rejected';
        await logAction({ 
          userId: adminId, 
          details: `${adminName} ${actionWord} preference for ${staffName} on ${shiftDate}` 
        });

        // 5. [NEW] IF APPROVED -> UPDATE THE ROSTER SHIFT
        if (newStatus === 'Approved') {
            const dateStr = pref.shift_date.split('T')[0];
            
            // Find the shift details from your options so we have the color/code
            const shiftType = shiftOptions.find(t => t.shift_type_id === pref.shift_type_id);
            
            // Determine Ward: Use User's Home Ward, or fallback to first available ward
            const targetUser = staffList.find(u => u.user_id === pref.user_id);
            const defaultWard = targetUser?.ward_id || (wardOptions[0] ? wardOptions[0].ward_id : null);
            
            // Handle "OFF" shifts (usually don't need a ward)
            const finalWardId = shiftType?.shift_code === 'OFF' ? null : defaultWard;

            if (shiftType) {
                // A. Update Database Shift
                await fetch('http://localhost:5000/api/shifts/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId: pref.user_id, 
                        date: dateStr, 
                        shiftTypeId: pref.shift_type_id, 
                        rosterId, 
                        wardId: finalWardId 
                    })
                });

                // B. Update Local Grid State (Instant Reflection)
                setShifts(prevShifts => {
                    // Remove any existing shift for this user/date
                    const filtered = prevShifts.filter(s => !(s.user_id === pref.user_id && s.shift_date.startsWith(dateStr)));
                    
                    // Add the new approved shift
                    return [...filtered, {
                        user_id: pref.user_id,
                        shift_date: dateStr,
                        shift_code: shiftType.shift_code,
                        shift_color_hex: shiftType.shift_color_hex,
                        roster_id: rosterId,
                        ward_id: finalWardId,
                        shift_type_id: pref.shift_type_id
                    }];
                });
            }
        }

      } else {
        alert("Failed to update preference.");
      }
    } catch (err) {
      console.error("Error updating preference:", err);
      alert("Server connection error.");
    }
  };

  // Helper to update the main roster grid locally
  const updateRosterShiftLocal = async (pref) => {
    const dateStr = pref.shift_date.split('T')[0];
    const shiftType = shiftOptions.find(t => t.shift_type_id === pref.shift_type_id);
    const targetUser = staffList.find(u => u.user_id === pref.user_id);
    const defaultWard = targetUser?.ward_id || (wardOptions[0] ? wardOptions[0].ward_id : null);
    const finalWardId = shiftType?.shift_code === 'OFF' ? null : defaultWard;

    if (shiftType) {
        // Update DB Shift
        await fetch('http://localhost:5000/api/shifts/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: pref.user_id, 
                date: dateStr, 
                shiftTypeId: pref.shift_type_id, 
                rosterId, 
                wardId: finalWardId 
            })
        });

        // Update Local State
        setShifts(prevShifts => {
            const filtered = prevShifts.filter(s => !(s.user_id === pref.user_id && s.shift_date.startsWith(dateStr)));
            return [...filtered, {
                user_id: pref.user_id,
                shift_date: dateStr,
                shift_code: shiftType.shift_code,
                shift_color_hex: shiftType.shift_color_hex,
                roster_id: rosterId,
                ward_id: finalWardId,
                shift_type_id: pref.shift_type_id
            }];
        });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPrefIds.length === 0) return;
    
    let successCount = 0;
    
    for (const id of selectedPrefIds) {
        const pref = preferences.find(p => p.shiftPref_id === id);
        if (!pref) continue;

        try {
            const res = await fetch('http://localhost:5000/api/preferences/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefId: id, status: 'Approved' })
            });

            if (res.ok) {
                successCount++;
                updateRosterShiftLocal(pref); 
            }
        } catch (e) {
            console.error(`Failed to approve ${id}`, e);
        }
    }

    if (successCount > 0) {
        await logAction({ 
            userId: adminId, 
            details: `${adminName} bulk Approved ${successCount} shift preferences.` 
        });
        
        // Remove approved items
        setPreferences(prev => {
            // 1. Create the new list without the approved items
            const newList = prev.filter(p => !selectedPrefIds.includes(p.shiftPref_id));
            
            // 2. Check if the new list is empty to turn off the red dot
            if (newList.length === 0) {
                setHasPendingPrefs(false);
            }
            
            return newList;
        });
        setSelectedPrefIds([]); 
    } else {
        alert("Failed to approve selected items.");
    }
  };
  // -------------------

  // --- ACTIONS ---

  // 1. SAVE SHIFT
  const handleSelectShift = async (typeId, code, color) => {
    if (!selectedCell) return;
    if (code !== 'OFF' && !selectedWardId) {
      showNotification({ type: 'alert', title: 'Missing Information', message: 'Please select a Ward first.', theme: 'neutral' });
      return;
    }
    const { userId, dateString } = selectedCell;
    setShifts(prevShifts => {
      const filtered = prevShifts.filter(s => !(s.user_id === userId && s.shift_date.startsWith(dateString)));
      if (code === 'OFF') return filtered;
      return [...filtered, { user_id: userId, shift_date: dateString, shift_code: code, shift_color_hex: color, roster_id: rosterId, ward_id: selectedWardId, shift_type_id: typeId }];
    });
    setSelectedCell(null);

    try {
      await fetch('http://localhost:5000/api/shifts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: dateString, shiftTypeId: typeId, rosterId, wardId: selectedWardId })
      });
      const targetStaff = staffList.find(s => s.user_id === userId);
      const targetName = targetStaff ? targetStaff.full_name : `User ID ${userId}`;
      await logAction({ 
        userId: adminId, 
        details: `${adminName} assigned shift ${code} to ${targetName} on ${dateString}` 
      });
    } catch (err) { console.error("Failed to save shift", err); }
  };

  // 2. DELETE SHIFT (From View Modal)
  const handleDeleteFromModal = () => {
    if (!viewModalData) return;
    showNotification({ type: 'confirm', title: 'Delete Shift', message: `Are you sure you want to delete this ${viewModalData.shiftCode} shift?`, theme: 'danger', onConfirm: confirmDeleteShift });
  };

  const confirmDeleteShift = async () => {
    const { userId, date } = viewModalData;
    setShifts(prevShifts => prevShifts.filter(s => !(s.user_id === userId && s.shift_date.startsWith(date))));
    setViewModalData(null);
    closeNotification();

    try {
      await fetch('http://localhost:5000/api/shifts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, shiftTypeId: 'OFF', rosterId, wardId: null })
      });
      const targetStaff = staffList.find(s => s.user_id === userId);
      const targetName = targetStaff ? targetStaff.full_name : `User ID ${userId}`;
      await logAction({ 
        userId: adminId, 
        details: `${adminName} deleted shift for ${targetName} on ${date}` 
      });
    } catch (err) {
      console.error("Failed to delete shift", err);
      showNotification({ type: 'alert', title: 'Error', message: 'Failed to delete shift on server.', theme: 'danger' });
    }
  };

  // 3. CLOSE PREFERENCES
  const handleClosePreferences = () => {
    showNotification({ type: 'confirm', title: 'Close Preferences?', message: "This will stop staff from submitting requests and move the roster to 'Drafting' mode.", theme: 'neutral', onConfirm: executeClosePreferences });
  };

  const executeClosePreferences = async () => {
    closeNotification();
    try {
      const res = await fetch('http://localhost:5000/api/rosters/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId, status: 'Drafting' })
      });
      if (res.ok) {
        setRosterStatus('Drafting');
        showNotification({ type: 'alert', title: 'Success', message: 'Roster is now in Drafting mode.', theme: 'success' });
        await logAction({ 
          userId: adminId, 
          details: `${adminName} closed preferences for Roster ID ${rosterId}` 
        });
      }
    } catch (err) {
      showNotification({ type: 'alert', title: 'Error', message: 'Error updating status.', theme: 'danger' });
    }
  };

  // 4. PUBLISH ROSTER
  const handlePublishRoster = () => {
    const isComplete = checkIfRosterComplete();
    if (!isComplete) {
      showNotification({ type: 'alert', title: 'Cannot Publish', message: "Please ensure every single cell has a shift assigned (use 'OFF' for rest days).", theme: 'neutral' });
      return;
    }
    showNotification({ type: 'confirm', title: 'Publish Roster?', message: "Are you sure? It will become visible to all staff.", theme: 'success', onConfirm: executePublishRoster });
  };

  const executePublishRoster = async () => {
    closeNotification();
    try {
      const res = await fetch('http://localhost:5000/api/rosters/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId, status: 'Published' })
      });
      if (res.ok) {
        setRosterStatus('Published');
        showNotification({ type: 'alert', title: 'Success', message: 'Roster is now Published.', theme: 'success' });
        await logAction({ 
          userId: adminId, 
          details: `${adminName} PUBLISHED Roster ID ${rosterId}` 
        });
      }
    } catch (err) {
      showNotification({ type: 'alert', title: 'Error', message: 'Server connection error.', theme: 'danger' });
    }
  };

  // 5. AUTO-FILL
  const handleAutoFillClick = () => {
    showNotification({ type: 'confirm', title: 'Run Auto-Fill?', message: "This follows the Roster Rules to assign shifts. This may take a few seconds.", theme: 'neutral', onConfirm: executeAutoFill });
  };

  const executeAutoFill = async () => {
    closeNotification();
    try {
      document.body.style.cursor = 'wait';
      const res = await fetch('http://localhost:5000/api/rosters/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId, month, year })
      });
      document.body.style.cursor = 'default';
      if (res.ok) {
        const data = await res.json();
        setRefreshTrigger(prev => prev + 1);
        await logAction({ 
          userId: adminId, 
          details: `${adminName} ran Auto-Fill for Roster ID ${rosterId}` 
        });
        showNotification({ type: 'alert', title: 'Auto-Fill Complete', message: data.message, theme: 'success' });
      } else {
        showNotification({ type: 'alert', title: 'Auto-Fill Failed', message: 'Check console for details.', theme: 'danger' });
      }
    } catch(e) {
      document.body.style.cursor = 'default';
      showNotification({ type: 'alert', title: 'Error', message: 'Error connecting to server.', theme: 'danger' });
    }
  };

  const handleCellClick = (userId, dateString, currentShiftCode, staffName) => {
    const existingShift = shifts.find(s => s.user_id === userId && s.shift_date.startsWith(dateString));
    if (!isEditing) {
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

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getContrastTextColor = (hexColor) => {
    if (!hexColor) return 'white';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 160 ? '#1F2937' : 'white';
  };

  const checkIfRosterComplete = () => {
    if (staffList.length === 0 || days.length === 0) return false;
    for (const staff of staffList) {
      for (const day of days) {
        const hasShift = shifts.find(s => s.user_id === staff.user_id && s.shift_date.startsWith(day.fullDate));
        if (!hasShift) return false; 
      }
    }
    return true;
  };

  const isComplete = checkIfRosterComplete();

  const SERVICE_PRIORITY = ['Acute', 'CE', 'Onco', 'PAS', 'PAME', 'Neonates'];
  const getStaffByService = () => {
    const groups = {};
    SERVICE_PRIORITY.forEach(s => groups[s] = []);
    groups['General / Other'] = []; 
    sortedStaffList.forEach(staff => {
      const svc = staff.service ? staff.service.trim() : 'General / Other';
      const foundKey = SERVICE_PRIORITY.find(key => svc.includes(key));
      if (foundKey) groups[foundKey].push(staff);
      else groups['General / Other'].push(staff);
    });
    return groups;
  };
  const groupedStaff = getStaffByService();

  const indexOfLastPref = prefPage * prefsPerPage;
  const indexOfFirstPref = indexOfLastPref - prefsPerPage;
  const currentPrefs = preferences.slice(indexOfFirstPref, indexOfLastPref);
  const totalPrefPages = Math.ceil(preferences.length / prefsPerPage);

  // --- INSERT HERE ---
  const handleSelectAllPrefs = (e) => {
    if (e.target.checked) {
        const allIds = currentPrefs.map(p => p.shiftPref_id);
        // Combine unique IDs
        const combined = [...new Set([...selectedPrefIds, ...allIds])];
        setSelectedPrefIds(combined);
    } else {
        const currentIds = currentPrefs.map(p => p.shiftPref_id);
        setSelectedPrefIds(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectOnePref = (id) => {
    if (selectedPrefIds.includes(id)) {
        setSelectedPrefIds(prev => prev.filter(i => i !== id));
    } else {
        setSelectedPrefIds(prev => [...prev, id]);
    }
  };
  // -------------------

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="roster" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout}/>

      <main style={{ maxWidth: 1400, margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' }}>
        
        {/* HEADER SECTION - UPDATED */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', minHeight: 50 }}>
          
          {/* Left: Back Button */}
          <div style={{ zIndex: 10 }}>
            <button type="button" onClick={onBack} style={{ padding: '8px 20px', background: 'white', borderRadius: 68, border: '1px solid #DDDDDD', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
          </div>

          {/* Center: Title Group WITH BUTTON ON LEFT */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
            
            {/* NEW PREFERENCE BUTTON */}
            {rosterStatus === 'Preference Open' && (
              <button 
                onClick={handleOpenPreferences}
                title="View Pending Preferences"
                style={{
                  width: 40, height: 40, borderRadius: '50%', 
                  background: 'white', border: '1px solid #E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#7C3AED', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <IconList />
                {hasPendingPrefs && (
                  <div style={{
                      position: 'absolute', 
                      top: 0, 
                      right: 0, 
                      width: 10, 
                      height: 10, 
                      background: '#EF4444', // Bright Red
                      borderRadius: '50%',
                      border: '2px solid white' // Adds a clean cut from the icon
                  }} />
                )}
              </button>
            )}

            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{month} Roster {year}</h1>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Status: <span style={{ color: rosterStatus === 'Preference Open' ? '#10B981' : '#F59E0B' }}>{rosterStatus}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, zIndex: 10 }}>
            {rosterStatus === 'Preference Open' && (
              <button type="button" onClick={handleClosePreferences} style={{ padding: '10px 24px', background: '#7C3AED', color: 'white', borderRadius: 68, border: 'none', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)' }}>
                Close Preferences
              </button>
            )}

            {rosterStatus === 'Drafting' && (
              <button type="button" onClick={handlePublishRoster} disabled={!isComplete} style={{ padding: '10px 24px', background: isComplete ? '#1E40AF' : '#E5E7EB', color: isComplete ? 'white' : '#9CA3AF', borderRadius: 68, border: 'none', cursor: isComplete ? 'pointer' : 'not-allowed', fontWeight: 700, boxShadow: isComplete ? '0 4px 6px rgba(30, 64, 175, 0.3)' : 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Publish Roster
              </button>
            )}

            {rosterStatus === 'Drafting' && (
              <button type="button" onClick={handleAutoFillClick} style={{ padding: '10px 24px', background: '#10B981', color: 'white', borderRadius: 68, border: 'none', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                Auto-Fill
              </button>
            )}

            <button type="button" onClick={() => setIsEditing(!isEditing)} style={{ padding: '10px 24px', background: isEditing ? '#2F80ED' : 'white', color: isEditing ? 'white' : '#2F80ED', borderRadius: 68, border: '1px solid #2F80ED', cursor: 'pointer', fontWeight: 700 }}>
              {isEditing ? 'Done Editing' : 'Edit Roster'}
            </button>
          </div>
        </div>

        {/* GRID TABLE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 18, color: '#666' }}>Loading Roster Data...</div>
        ) : (
          <div style={{ width: '100%', background: 'white', boxShadow: '0 4px 4px rgba(0,0,0,0.25)', borderRadius: 8, overflow: 'auto', maxHeight: '75vh' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={{ position: 'sticky', left: 0, zIndex: 20, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: '10px 14px', minWidth: 150, cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>Nurse Name <IconSort direction={sortOrder} /></div>
                  </th>
                  {days.map((d) => (
                    <th key={d.day} style={{ borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', padding: 6, minWidth: 40, background: '#F9FAFB', fontSize: 14 }}>
                      {d.day} <br /> <span style={{ fontSize: 11, fontWeight: 'normal' }}>{d.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...SERVICE_PRIORITY, 'General / Other'].map(serviceName => {
                  const staffInGroup = groupedStaff[serviceName];
                  if (!staffInGroup || staffInGroup.length === 0) return null;
                  return (
                    <React.Fragment key={serviceName}>
                      {staffInGroup.map((staff, index) => {
                        const isFirstInGroup = index === 0;
                        return (
                          <tr key={staff.user_id}>
                            <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'white', borderRight: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', borderTop: isFirstInGroup ? '3px solid #374151' : 'none', padding: '8px 14px', verticalAlign: 'middle' }}>
                              {isFirstInGroup && (
                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#2563EB', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px' }}>{serviceName === 'General / Other' ? 'General' : serviceName}</div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1F2937' }}>{staff.full_name}</span>
                                {staff.ward_id && (
                                  <span style={{ fontSize: '11px', color: '#4B5563', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E5E7EB', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {wardOptions.find(w => w.ward_id === staff.ward_id)?.ward_name || ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            {days.map((d) => {
                              const shift = getShiftForCell(staff.user_id, d.fullDate);
                              return (
                                <td key={d.day} onClick={() => handleCellClick(staff.user_id, d.fullDate, shift.code, staff.full_name)} style={{ borderLeft: '1px solid #8C8C8C', borderBottom: '1px solid #8C8C8C', borderTop: isFirstInGroup ? '3px solid #374151' : 'none', textAlign: 'center', background: shift.color, height: 40, fontSize: 13, fontWeight: 700, color: getContrastTextColor(shift.color), cursor: 'pointer', outline: (selectedCell && selectedCell.userId === staff.user_id && selectedCell.dateString === d.fullDate) ? '3px solid #F59E0B' : 'none' }}>
                                  {shift.code}
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

      {/* --- PREFERENCES MODAL (UPDATED WITH ACTIONS & PAGINATION) --- */}
      {showPrefModal && (
        <div style={modalOverlayStyle} onClick={() => setShowPrefModal(false)}>
          <div style={{ ...modalContentStyle, width: 680, textAlign: 'left', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Pending Requests ({month} {year})</h3>
                  {selectedPrefIds.length > 0 && (
                    <button 
                      onClick={handleBulkApprove}
                      style={{ padding: '6px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Approve Selected ({selectedPrefIds.length})
                    </button>
                  )}
              </div>
            <button onClick={() => setShowPrefModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>
            
            <div style={{ padding: '24px', minHeight: '300px' }}>
              {loadingPrefs ? (
                <div style={{ textAlign: 'center', color: '#6B7280', paddingTop: 40 }}>Loading requests...</div>
              ) : preferences.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', paddingTop: 40 }}>No pending requests found for this period.</div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#6B7280', textTransform: 'uppercase', fontSize: '12px' }}>
                        <th style={{ paddingBottom: 8, width: 40, textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAllPrefs}
                            checked={currentPrefs.length > 0 && currentPrefs.every(p => selectedPrefIds.includes(p.shiftPref_id))}
                          />
                        </th>
                        <th style={{ textAlign: 'left', paddingBottom: 8 }}>Staff</th>
                        <th style={{ textAlign: 'left', paddingBottom: 8 }}>Date</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8 }}>Shift</th>
                        <th style={{ textAlign: 'left', paddingBottom: 8 }}>Reason</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPrefs.map((p) => (
                        <tr key={p.shiftPref_id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '14px 0', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedPrefIds.includes(p.shiftPref_id)}
                              onChange={() => handleSelectOnePref(p.shiftPref_id)}
                            />
                          </td>
                          <td style={{ padding: '14px 0', fontWeight: 600, color: '#374151' }}>{p.full_name}</td>
                          <td style={{ padding: '14px 0', color: '#6B7280' }}>{p.shift_date.split('T')[0]}</td>
                          <td style={{ padding: '14px 0', textAlign: 'center' }}>
                            <span style={{ padding: '4px 8px', background: '#DBEAFE', color: '#1E40AF', borderRadius: 4, fontWeight: 700, fontSize: '12px' }}>{p.shift_code}</span>
                          </td>
                          <td style={{ padding: '14px 0', color: '#6B7280', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.reason || '-'}>
                            {p.reason || '-'}
                          </td>
                          <td style={{ padding: '14px 0', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button 
                                onClick={() => handlePrefAction(p.shiftPref_id, 'Approved', p.full_name, p.shift_date.split('T')[0])}
                                title="Accept"
                                style={{ width: 32, height: 32, borderRadius: 6, background: '#DCFCE7', color: '#166534', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <IconCheck />
                              </button>
                              <button 
                                onClick={() => handlePrefAction(p.shiftPref_id, 'Denied', p.full_name, p.shift_date.split('T')[0])}
                                title="Reject"
                                style={{ width: 32, height: 32, borderRadius: 6, background: '#FEE2E2', color: '#991B1B', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <IconX />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  {preferences.length > prefsPerPage && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 16 }}>
                      <button 
                        onClick={() => setPrefPage(p => Math.max(1, p - 1))}
                        disabled={prefPage === 1}
                        style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: 'white', borderRadius: 6, cursor: prefPage === 1 ? 'not-allowed' : 'pointer', opacity: prefPage === 1 ? 0.5 : 1 }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '13px', color: '#6B7280' }}>Page {prefPage} of {totalPrefPages}</span>
                      <button 
                        onClick={() => setPrefPage(p => Math.min(totalPrefPages, p + 1))}
                        disabled={prefPage === totalPrefPages}
                        style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: 'white', borderRadius: 6, cursor: prefPage === totalPrefPages ? 'not-allowed' : 'pointer', opacity: prefPage === totalPrefPages ? 0.5 : 1 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div style={{ padding: '20px 24px', borderTop: '1px solid #E5E7EB', textAlign: 'right', background: '#F9FAFB', borderRadius: '0 0 16px 16px' }}>
              <button onClick={() => setShowPrefModal(false)} style={{ ...modalBtnBase, background: 'white', color: '#374151', border: '1px solid #D1D5DB' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODE MODAL --- */}
      {selectedCell && (() => {
        const workingShifts = shiftOptions.filter(s => s.is_work_shift === 'Y');
        const nonWorkingShifts = shiftOptions.filter(s => s.is_work_shift !== 'Y');
        return (
          <div onClick={() => setSelectedCell(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #F3F4F6' }}>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1F2937' }}>Assign Shift</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#6B7280', fontSize: 14, fontWeight: 500 }}>{selectedCell.dateString.split('-').reverse().join('-')}</div>
              </div>
              <div style={{ padding: 32, overflowY: 'auto' }}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>Select Location</label>
                  <div style={{ position: 'relative' }}>
                    <select value={selectedWardId} onChange={(e) => setSelectedWardId(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 15, fontWeight: 600, color: '#374151', appearance: 'none', cursor: 'pointer', outline: 'none' }}>
                      <option value="">-- Choose Ward --</option>
                      {wardOptions.map(ward => <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_comments} ({ward.ward_name})</option>)}
                    </select>
                  </div>
                </div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12, marginTop: 8 }}>Working Shifts</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {workingShifts.map(opt => (
                    <button key={opt.shift_type_id} onClick={() => setTempSelectedShift({ id: opt.shift_type_id, code: opt.shift_code, color: opt.shift_color_hex })} style={{ padding: '14px', borderRadius: 12, border: tempSelectedShift?.id === opt.shift_type_id ? '3px solid #1F2937' : '1px solid transparent', background: opt.shift_color_hex, color: getContrastTextColor(opt.shift_color_hex), fontWeight: 800, cursor: 'pointer', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: tempSelectedShift?.id === opt.shift_type_id ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.1s' }}>{opt.shift_code}</button>
                  ))}
                </div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 }}>Leave & Other</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {nonWorkingShifts.map(opt => (
                    <button key={opt.shift_type_id} onClick={() => setTempSelectedShift({ id: opt.shift_type_id, code: opt.shift_code, color: opt.shift_color_hex })} style={{ padding: '14px', borderRadius: 12, border: tempSelectedShift?.id === opt.shift_type_id ? '3px solid #1F2937' : '1px solid transparent', background: opt.shift_color_hex, color: getContrastTextColor(opt.shift_color_hex), fontWeight: 800, cursor: 'pointer', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: tempSelectedShift?.id === opt.shift_type_id ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.1s' }}>{opt.shift_code}</button>
                  ))}
                </div>
                <div style={{ margin: '24px 0 16px', borderTop: '1px solid #E5E7EB', position: 'relative' }}><span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 8px', color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>OR</span></div>
                <button onClick={() => setTempSelectedShift({ id: 'OFF', code: 'OFF', color: 'white' })} style={{ width: '100%', marginTop: 24, padding: '14px', borderRadius: 12, border: tempSelectedShift?.id === 'OFF' ? '3px solid #EF4444' : '1px solid #E5E7EB', background: tempSelectedShift?.id === 'OFF' ? '#FEF2F2' : 'white', color: tempSelectedShift?.id === 'OFF' ? '#DC2626' : '#374151', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.1s' }}>Clear Shift</button>
              </div>
              <div style={{ padding: '24px 32px 32px', borderTop: '1px solid #F3F4F6', background: 'white', display: 'flex', gap: 12 }}>
                <button onClick={() => { if (tempSelectedShift) { handleSelectShift(tempSelectedShift.id, tempSelectedShift.code, tempSelectedShift.color); } }} disabled={!tempSelectedShift} style={{ flex: 2, padding: '14px', background: '#2563EB', color: 'white', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: tempSelectedShift ? 'pointer' : 'not-allowed', opacity: tempSelectedShift ? 1 : 0.5, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>Confirm</button>
                <button onClick={() => setSelectedCell(null)} style={{ flex: 1, padding: '14px', background: '#F3F4F6', color: '#374151', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- VIEW DETAILS MODAL --- */}
      {viewModalData && (() => {
        const textColor = getContrastTextColor(viewModalData.color);
        const isDarkText = textColor !== 'white';
        const subtleBg = isDarkText ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.25)';
        return (
          <div onClick={() => setViewModalData(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: 440, overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ background: viewModalData.color, padding: '36px 32px', textAlign: 'center', color: textColor, position: 'relative' }}>
                <button onClick={() => setViewModalData(null)} style={{ position: 'absolute', top: 20, right: 20, background: subtleBg, border: 'none', color: textColor, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>✕</button>
                <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900, letterSpacing: '-1.5px' }}>{viewModalData.shiftCode}</h1>
                <div style={{ display: 'inline-block', marginTop: 12, padding: '6px 16px', borderRadius: 20, background: subtleBg, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{getShiftTypeDetails(viewModalData.shiftCode)}</div>
              </div>
              <div style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>{getInitials(viewModalData.nurseName)}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Assigned Nurse</div><div style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>{viewModalData.nurseName}</div></div>
                </div>
                <div style={{ display: 'grid', gap: 18 }}>
                  <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>LOCATION</div><div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{getWardName(viewModalData.wardId)}</div></div>
                  </div>
                  <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>DATE</div><div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{viewModalData.date.split('-').reverse().join('-')}</div></div>
                  </div>
                </div>
                <div style={{ padding: '24px 32px 32px', display: 'flex', gap: 12 }}>
                  <button onClick={handleDeleteFromModal} style={{ flex: 1, padding: '14px', background: '#FEE2E2', color: '#DC2626', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onMouseOver={(e) => e.currentTarget.style.background = '#FECACA'} onMouseOut={(e) => e.currentTarget.style.background = '#FEE2E2'}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete</button>
                  <button onClick={() => setViewModalData(null)} style={{ flex: 1, padding: '14px', background: '#F3F4F6', color: '#374151', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#E5E7EB'} onMouseOut={(e) => e.currentTarget.style.background = '#F3F4F6'}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- UNIFIED NOTIFICATION MODAL --- */}
      {notification && (
        <div style={modalOverlayStyle} onClick={closeNotification}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: '#111827' }}>{notification.title}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#6B7280', lineHeight: 1.5 }}>{notification.message}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {/* Confirm Buttons (Cancel + Action) */}
              {notification.type === 'confirm' && (
                <>
                  <button onClick={closeNotification} style={{ ...modalBtnBase, background: 'white', color: '#374151', border: '1px solid #D1D5DB' }}>Cancel</button>
                  <button onClick={notification.onConfirm} style={{ ...modalBtnBase, background: notification.theme === 'danger' ? '#DC2626' : (notification.theme === 'success' ? '#10B981' : '#2563EB'), color: 'white' }}>Confirm</button>
                </>
              )}
              {/* Alert Button (Close only) */}
              {notification.type === 'alert' && (
                <button onClick={closeNotification} style={{ ...modalBtnBase, background: notification.theme === 'danger' ? '#DC2626' : (notification.theme === 'success' ? '#10B981' : '#374151'), color: 'white' }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminRosterView;