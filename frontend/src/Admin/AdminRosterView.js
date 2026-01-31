import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';
import './AdminRosterView.css';
// 1. Import centralized helper
import { fetchFromApi } from '../services/api';

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
    // 2. UPDATED: Using fetchFromApi
    await fetchFromApi('/action-logs', {
      method: 'POST',
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

  // Pagination State
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
        // 3. UPDATED: Using fetchFromApi for initial load
        // Note: fetchFromApi throws if status is not OK, so we catch error
        
        // Check for pending prefs
        try {
            const prefData = await fetchFromApi(`/api/preferences/${rosterId}`);
            setHasPendingPrefs(prefData.length > 0);
        } catch (e) { /* ignore 404/empty */ }

        const rosterData = await fetchFromApi(`/api/rosters/${rosterId}`);
        if (rosterData && rosterData.status) setRosterStatus(rosterData.status);

        const [userData, shiftData, typeData, wardData] = await Promise.all([
            fetchFromApi('/users'),
            fetchFromApi(`/api/shifts/${rosterId}`),
            fetchFromApi('/api/shift-types'),
            fetchFromApi('/api/wards')
        ]);

        const nursesOnly = userData.filter(user => user.role === 'APN' && user.status === 'Active');

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
      // 4. UPDATED: Using fetchFromApi
      const data = await fetchFromApi(`/api/preferences/${rosterId}`);
      setPreferences(data);
    } catch (err) {
      console.error("Failed to fetch preferences", err);
      setPreferences([]); 
    } finally {
      setLoadingPrefs(false);
    }
  };

// --- HANDLE PREFERENCE ACTION (Accept/Reject) ---
  const handlePrefAction = async (prefId, newStatus, staffName, shiftDate) => {
    const pref = preferences.find(p => p.shiftPref_id === prefId);
    if (!pref) return;

    try {
      // 5. UPDATED: Using fetchFromApi (POST)
      await fetchFromApi('/api/preferences/update-status', {
        method: 'POST',
        body: JSON.stringify({ prefId, status: newStatus })
      });

      // If successful:
      setPreferences(prev => {
        const newList = prev.filter(p => p.shiftPref_id !== prefId);
        if (newList.length === 0) {
            setHasPendingPrefs(false);
        }
        return newList;
      });
      
      const actionWord = newStatus === 'Approved' ? 'Approved' : 'Rejected';
      await logAction({ 
        userId: adminId, 
        details: `${adminName} ${actionWord} preference for ${staffName} on ${shiftDate}` 
      });

      if (newStatus === 'Approved') {
          const dateStr = pref.shift_date.split('T')[0];
          const shiftType = shiftOptions.find(t => t.shift_type_id === pref.shift_type_id);
          const targetUser = staffList.find(u => u.user_id === pref.user_id);
          const defaultWard = targetUser?.ward_id || (wardOptions[0] ? wardOptions[0].ward_id : null);
          const finalWardId = shiftType?.shift_code === 'OFF' ? null : defaultWard;

          if (shiftType) {
              // 6. UPDATED: Using fetchFromApi
              await fetchFromApi('/api/shifts/update', {
                  method: 'POST',
                  body: JSON.stringify({ 
                      userId: pref.user_id, 
                      date: dateStr, 
                      shiftTypeId: pref.shift_type_id, 
                      rosterId, 
                      wardId: finalWardId 
                  })
              });

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
      }

    } catch (err) {
      console.error("Error updating preference:", err);
      alert("Server connection error or failed update.");
    }
  };

  const updateRosterShiftLocal = async (pref) => {
    const dateStr = pref.shift_date.split('T')[0];
    const shiftType = shiftOptions.find(t => t.shift_type_id === pref.shift_type_id);
    const targetUser = staffList.find(u => u.user_id === pref.user_id);
    const defaultWard = targetUser?.ward_id || (wardOptions[0] ? wardOptions[0].ward_id : null);
    const finalWardId = shiftType?.shift_code === 'OFF' ? null : defaultWard;

    if (shiftType) {
        // 7. UPDATED: Using fetchFromApi
        await fetchFromApi('/api/shifts/update', {
            method: 'POST',
            body: JSON.stringify({ 
                userId: pref.user_id, 
                date: dateStr, 
                shiftTypeId: pref.shift_type_id, 
                rosterId, 
                wardId: finalWardId 
            })
        });

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
            // 8. UPDATED: Using fetchFromApi
            await fetchFromApi('/api/preferences/update-status', {
                method: 'POST',
                body: JSON.stringify({ prefId: id, status: 'Approved' })
            });

            successCount++;
            updateRosterShiftLocal(pref); 
            
        } catch (e) {
            console.error(`Failed to approve ${id}`, e);
        }
    }

    if (successCount > 0) {
        await logAction({ 
            userId: adminId, 
            details: `${adminName} bulk Approved ${successCount} shift preferences.` 
        });
        
        setPreferences(prev => {
            const newList = prev.filter(p => !selectedPrefIds.includes(p.shiftPref_id));
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
      // 9. UPDATED: Using fetchFromApi
      await fetchFromApi('/api/shifts/update', {
        method: 'POST',
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
      // 10. UPDATED: Using fetchFromApi
      await fetchFromApi('/api/shifts/update', {
        method: 'POST',
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

  const handleClosePreferences = () => {
    showNotification({ type: 'confirm', title: 'Close Preferences?', message: "This will stop staff from submitting requests and move the roster to 'Drafting' mode.", theme: 'neutral', onConfirm: executeClosePreferences });
  };

  const executeClosePreferences = async () => {
    closeNotification();
    try {
      // 11. UPDATED: Using fetchFromApi
      await fetchFromApi('/api/rosters/update-status', {
        method: 'POST',
        body: JSON.stringify({ rosterId, status: 'Drafting' })
      });
      
      setRosterStatus('Drafting');
      showNotification({ type: 'alert', title: 'Success', message: 'Roster is now in Drafting mode.', theme: 'success' });
      await logAction({ 
        userId: adminId, 
        details: `${adminName} closed preferences for Roster ID ${rosterId}` 
      });
      
    } catch (err) {
      showNotification({ type: 'alert', title: 'Error', message: 'Error updating status.', theme: 'danger' });
    }
  };

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
      // 12. UPDATED: Using fetchFromApi
      await fetchFromApi('/api/rosters/update-status', {
        method: 'POST',
        body: JSON.stringify({ rosterId, status: 'Published' })
      });
      
      setRosterStatus('Published');
      showNotification({ type: 'alert', title: 'Success', message: 'Roster is now Published.', theme: 'success' });
      await logAction({ 
        userId: adminId, 
        details: `${adminName} PUBLISHED Roster ID ${rosterId}` 
      });
      
    } catch (err) {
      showNotification({ type: 'alert', title: 'Error', message: 'Server connection error.', theme: 'danger' });
    }
  };

  const handleAutoFillClick = () => {
    showNotification({ type: 'confirm', title: 'Run Auto-Fill?', message: "This follows the Roster Rules to assign shifts. This may take a few seconds.", theme: 'neutral', onConfirm: executeAutoFill });
  };

  const executeAutoFill = async () => {
    closeNotification();
    try {
      document.body.style.cursor = 'wait';
      // 13. UPDATED: Using fetchFromApi
      const data = await fetchFromApi('/api/rosters/auto-fill', {
        method: 'POST',
        body: JSON.stringify({ rosterId, month, year })
      });
      
      document.body.style.cursor = 'default';
      setRefreshTrigger(prev => prev + 1);
      await logAction({ 
        userId: adminId, 
        details: `${adminName} ran Auto-Fill for Roster ID ${rosterId}` 
      });
      showNotification({ type: 'alert', title: 'Auto-Fill Complete', message: data.message, theme: 'success' });
      
    } catch(e) {
      document.body.style.cursor = 'default';
      showNotification({ type: 'alert', title: 'Auto-Fill Failed', message: 'Check console for details.', theme: 'danger' });
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

  const handleSelectAllPrefs = (e) => {
    if (e.target.checked) {
        const allIds = currentPrefs.map(p => p.shiftPref_id);
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

  return (
    <div className="admin-rosterview-container">
      <Navbar active="roster" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout}/>

      <main className="admin-rosterview-main">
        
        {/* HEADER SECTION */}
        <div className="admin-rosterview-header-row">
          
          <div className="admin-rosterview-back-container">
            <button type="button" onClick={onBack} className="admin-rosterview-back-btn">← Back</button>
          </div>

          <div className="admin-rosterview-title-group">
            {rosterStatus === 'Preference Open' && (
              <button 
                onClick={handleOpenPreferences}
                title="View Pending Preferences"
                className="admin-rosterview-circular-btn"
              >
                <IconList />
                {hasPendingPrefs && (
                  <div className="admin-rosterview-notification-dot" />
                )}
              </button>
            )}

            <div style={{ textAlign: 'center' }}>
              <h1 className="admin-rosterview-page-title">{month} Roster {year}</h1>
              <div className="admin-rosterview-status-label">
                Status: <span style={{ color: rosterStatus === 'Preference Open' ? '#10B981' : '#F59E0B' }}>{rosterStatus}</span>
              </div>
            </div>
          </div>

          <div className="admin-rosterview-actions">
            {rosterStatus === 'Preference Open' && (
              <button type="button" onClick={handleClosePreferences} className="admin-rosterview-btn btn-purple">
                Close Preferences
              </button>
            )}

            {rosterStatus === 'Drafting' && (
              <button type="button" onClick={handlePublishRoster} disabled={!isComplete} className="admin-rosterview-btn btn-blue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Publish Roster
              </button>
            )}

            {rosterStatus === 'Drafting' && (
              <button type="button" onClick={handleAutoFillClick} className="admin-rosterview-btn btn-green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                Auto-Fill
              </button>
            )}

            <button type="button" onClick={() => setIsEditing(!isEditing)} className={`admin-rosterview-btn btn-outline-blue ${isEditing ? 'active' : ''}`}>
              {isEditing ? 'Done Editing' : 'Edit Roster'}
            </button>
          </div>
        </div>

        {/* GRID TABLE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 18, color: '#666' }}>Loading Roster Data...</div>
        ) : (
          <div className="admin-rosterview-table-wrapper">
            <table className="admin-rosterview-table">
              <thead className="admin-rosterview-thead">
                <tr>
                  <th onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="admin-rosterview-th-nurse">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>Nurse Name <IconSort direction={sortOrder} /></div>
                  </th>
                  {days.map((d) => (
                    <th key={d.day} className="admin-rosterview-th-date">
                      {d.day} <br /> <span className="admin-rosterview-day-label">{d.label}</span>
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
                            <td className={`admin-rosterview-td-nurse ${isFirstInGroup ? 'admin-rosterview-tr-top-border' : ''}`}>
                              {isFirstInGroup && (
                                <div className="admin-rosterview-service-header">{serviceName === 'General / Other' ? 'General' : serviceName}</div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <span className="admin-rosterview-staff-name">{staff.full_name}</span>
                                {staff.ward_id && (
                                  <span className="admin-rosterview-ward-badge">
                                    {wardOptions.find(w => w.ward_id === staff.ward_id)?.ward_name || ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            {days.map((d) => {
                              const shift = getShiftForCell(staff.user_id, d.fullDate);
                              const isSelected = selectedCell && selectedCell.userId === staff.user_id && selectedCell.dateString === d.fullDate;
                              return (
                                <td 
                                  key={d.day} 
                                  onClick={() => handleCellClick(staff.user_id, d.fullDate, shift.code, staff.full_name)} 
                                  className={`admin-rosterview-td-shift ${isFirstInGroup ? 'admin-rosterview-tr-top-border' : ''} ${isSelected ? 'selected' : ''}`}
                                  style={{ background: shift.color, color: getContrastTextColor(shift.color) }}
                                >
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

      {/* --- PREFERENCES MODAL --- */}
      {showPrefModal && (
        <div className="admin-rosterview-modal-overlay" onClick={() => setShowPrefModal(false)}>
          <div className="admin-rosterview-pref-content" onClick={e => e.stopPropagation()}>
            <div className="admin-rosterview-pref-header">
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
            
            <div className="admin-rosterview-pref-body">
              {loadingPrefs ? (
                <div style={{ textAlign: 'center', color: '#6B7280', paddingTop: 40 }}>Loading requests...</div>
              ) : preferences.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', paddingTop: 40 }}>No pending requests found for this period.</div>
              ) : (
                <>
                  <table className="admin-rosterview-pref-table">
                    <thead>
                      <tr>
                        <th className="admin-rosterview-pref-th" style={{ width: 40, textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAllPrefs}
                            checked={currentPrefs.length > 0 && currentPrefs.every(p => selectedPrefIds.includes(p.shiftPref_id))}
                          />
                        </th>
                        <th className="admin-rosterview-pref-th">Staff</th>
                        <th className="admin-rosterview-pref-th">Date</th>
                        <th className="admin-rosterview-pref-th" style={{ textAlign: 'center' }}>Shift</th>
                        <th className="admin-rosterview-pref-th">Reason</th>
                        <th className="admin-rosterview-pref-th" style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPrefs.map((p) => (
                        <tr key={p.shiftPref_id} className="admin-rosterview-pref-tr">
                          <td className="admin-rosterview-pref-td" style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedPrefIds.includes(p.shiftPref_id)}
                              onChange={() => handleSelectOnePref(p.shiftPref_id)}
                            />
                          </td>
                          <td className="admin-rosterview-pref-td" style={{ fontWeight: 600, color: '#374151' }}>{p.full_name}</td>
                          <td className="admin-rosterview-pref-td" style={{ color: '#6B7280' }}>{p.shift_date.split('T')[0]}</td>
                          <td className="admin-rosterview-pref-td" style={{ textAlign: 'center' }}>
                            <span style={{ padding: '4px 8px', background: '#DBEAFE', color: '#1E40AF', borderRadius: 4, fontWeight: 700, fontSize: '12px' }}>{p.shift_code}</span>
                          </td>
                          <td className="admin-rosterview-pref-td" style={{ color: '#6B7280', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.reason || '-'}>
                            {p.reason || '-'}
                          </td>
                          <td className="admin-rosterview-pref-td" style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button 
                                onClick={() => handlePrefAction(p.shiftPref_id, 'Approved', p.full_name, p.shift_date.split('T')[0])}
                                title="Accept"
                                className="admin-rosterview-pref-btn-approve"
                              >
                                <IconCheck />
                              </button>
                              <button 
                                onClick={() => handlePrefAction(p.shiftPref_id, 'Denied', p.full_name, p.shift_date.split('T')[0])}
                                title="Reject"
                                className="admin-rosterview-pref-btn-reject"
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
            
            <div className="admin-rosterview-pref-footer">
              <button onClick={() => setShowPrefModal(false)} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1px solid #D1D5DB', background: 'white', color: '#374151' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODE MODAL --- */}
      {selectedCell && (() => {
        const workingShifts = shiftOptions.filter(s => s.is_work_shift === 'Y');
        const nonWorkingShifts = shiftOptions.filter(s => s.is_work_shift !== 'Y');
        return (
          <div className="admin-rosterview-modal-overlay" onClick={() => setSelectedCell(null)}>
            <div className="admin-rosterview-edit-content" onClick={e => e.stopPropagation()}>
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
                <div className="admin-rosterview-edit-grid" style={{ marginBottom: 24 }}>
                  {workingShifts.map(opt => (
                    <button 
                      key={opt.shift_type_id} 
                      onClick={() => setTempSelectedShift({ id: opt.shift_type_id, code: opt.shift_code, color: opt.shift_color_hex })} 
                      className={`admin-rosterview-shift-btn ${tempSelectedShift?.id === opt.shift_type_id ? 'selected' : ''}`}
                      style={{ background: opt.shift_color_hex, color: getContrastTextColor(opt.shift_color_hex) }}
                    >
                      {opt.shift_code}
                    </button>
                  ))}
                </div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 }}>Leave & Other</label>
                <div className="admin-rosterview-edit-grid">
                  {nonWorkingShifts.map(opt => (
                    <button 
                      key={opt.shift_type_id} 
                      onClick={() => setTempSelectedShift({ id: opt.shift_type_id, code: opt.shift_code, color: opt.shift_color_hex })} 
                      className={`admin-rosterview-shift-btn ${tempSelectedShift?.id === opt.shift_type_id ? 'selected' : ''}`}
                      style={{ background: opt.shift_color_hex, color: getContrastTextColor(opt.shift_color_hex) }}
                    >
                      {opt.shift_code}
                    </button>
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
          <div className="admin-rosterview-modal-overlay" onClick={() => setViewModalData(null)}>
            <div className="admin-rosterview-view-content" onClick={e => e.stopPropagation()}>
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
                  <div className="admin-rosterview-view-info-row">
                    <div style={{ background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>LOCATION</div><div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{getWardName(viewModalData.wardId)}</div></div>
                  </div>
                  <div className="admin-rosterview-view-info-row">
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
        <div className="admin-rosterview-modal-overlay" onClick={closeNotification}>
          <div className="admin-rosterview-notify-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: '#111827' }}>{notification.title}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#6B7280', lineHeight: 1.5 }}>{notification.message}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {notification.type === 'confirm' && (
                <>
                  <button onClick={closeNotification} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1px solid #D1D5DB', background: 'white', color: '#374151', minWidth: '100px' }}>Cancel</button>
                  <button onClick={notification.onConfirm} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none', background: notification.theme === 'danger' ? '#DC2626' : (notification.theme === 'success' ? '#10B981' : '#2563EB'), color: 'white', minWidth: '100px' }}>Confirm</button>
                </>
              )}
              {notification.type === 'alert' && (
                <button onClick={closeNotification} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none', background: notification.theme === 'danger' ? '#DC2626' : (notification.theme === 'success' ? '#10B981' : '#374151'), color: 'white', minWidth: '100px' }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminRosterView;