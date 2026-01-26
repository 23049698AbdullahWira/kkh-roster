import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

// --- CONFIGURATION: Service to Shift Mapping ---
// Updated based on your specific requirements
const SERVICE_SHIFTS_CONFIG = {
  'CE':    ['RRT', 'NNJ', 'AM', 'PM', 'ND'],
  'ONCO':  ['RRT', 'AM', 'PM'],
  'PAS':   ['RRT', 'AM'],
  'PAME':  ['KKH@HOME', 'NNJ@HOME', 'NNJ', 'RRT', 'GPAPN', 'AM', 'PM'],
  'ACUTE': ['RRT', 'AM', 'PM'],
  
  // Fallback if the user's service is not found in the list above
  'DEFAULT': ['AM', 'PM', 'RRT'] 
};

function UserShiftPref({
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout,
}) {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(true);

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedPrefId, setSelectedPrefId] = useState(null);

  // --- Delete Confirmation State ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prefToDelete, setPrefToDelete] = useState(null);

  const [formData, setFormData] = useState({
    date: '',
    shift_code: '', 
    remarks: '',
  });

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Load User & Fetch Data
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        
        // Debugging: Check if service is loaded
        console.log("Current User Service:", parsed.service);

        if (parsed.userId) {
            fetchPreferences(parsed.userId);
        } else {
            console.error("User ID not found in local storage");
            setLoading(false);
        }
      } catch (e) {
        console.error("Error parsing user", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Preferences API
  const fetchPreferences = (userId) => {
    setLoading(true);
    fetch(`http://localhost:5000/api/get-shift-preferences/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to connect');
        return res.json();
      })
      .then((data) => {
        const formattedData = data.map((item) => ({
          ...item,
          date: new Date(item.date).toISOString().split('T')[0],
        }));
        setPreferences(formattedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  };

  // --- HELPER: Get Allowed Shifts ---
  const getAllowedShifts = () => {
    // If service is missing or not in config, use DEFAULT
    if (!currentUser || !currentUser.service) {
      return SERVICE_SHIFTS_CONFIG['DEFAULT'];
    }
    // Look up the exact service key, otherwise fall back to DEFAULT
    return SERVICE_SHIFTS_CONFIG[currentUser.service] || SERVICE_SHIFTS_CONFIG['DEFAULT'];
  };

  // 3. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    // Use allowed shifts logic
    const allowedShifts = getAllowedShifts();
    // Default to the first allowed shift if the form is empty or invalid
    const finalShiftCode = formData.shift_code || allowedShifts[0];

    if (modalMode === 'create') {
      try {
        const payload = {
          user_id: currentUser.userId,
          date: formData.date,
          shift_code: finalShiftCode, 
          remarks: formData.remarks,
        };
        const response = await fetch('http://localhost:5000/api/add-shift-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          alert(result.message || 'Preference Request Sent!');
          setShowModal(false);
          fetchPreferences(currentUser.userId);
        } else {
          alert('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Submit error:', error);
      }
    } else if (modalMode === 'edit') {
      try {
        const payload = {
          date: formData.date,
          shift_code: finalShiftCode, 
          remarks: formData.remarks,
        };
        const response = await fetch(`http://localhost:5000/api/update-shift-preference/${selectedPrefId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          alert(result.message || 'Preference Updated!');
          setShowModal(false);
          fetchPreferences(currentUser.userId);
        } else {
          alert('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Update error:', error);
      }
    }
  };

  // 4. Delete Logic
  const handleDeleteClick = (id) => {
    setPrefToDelete(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!prefToDelete) return;
    try {
      const response = await fetch(`http://localhost:5000/api/delete-shift-preference/${prefToDelete}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || "Preference deleted successfully.");
        fetchPreferences(currentUser.userId);
        setShowDeleteConfirm(false);
        setPrefToDelete(null);
      } else {
        console.error("Backend Error:", result);
        alert("Delete Failed: " + (result.error || "Unknown server error"));
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Network/Fetch error:", error);
      alert("Network Error: check console.");
      setShowDeleteConfirm(false);
    }
  };

  // --- Modal Helpers ---
  const handleOpenCreate = () => {
    setModalMode('create');
    const allowed = getAllowedShifts();
    setFormData({ date: '', shift_code: allowed[0], remarks: '' });
    setSelectedPrefId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (pref) => {
    setModalMode('edit');
    setFormData({ 
      date: pref.date, 
      shift_code: pref.shift_code, 
      remarks: pref.remarks 
    });
    setSelectedPrefId(pref.shiftPref_id);
    setShowModal(true);
  };

  const handleOpenView = (pref) => {
    setModalMode('view');
    setFormData({ 
        date: pref.date, 
        shift_code: pref.shift_code, 
        remarks: pref.remarks 
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- UI Helpers ---
  const filteredPreferences = preferences.filter((pref) => {
    if (!filterDate) return true;
    return pref.date.startsWith(filterDate);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPreferences = filteredPreferences.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPreferences.length / itemsPerPage);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

  const getStatusStyle = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const base = { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', display: 'inline-block' };
    if (s === 'approved') return { ...base, background: '#D1FAE5', color: '#065F46' };
    if (s === 'denied') return { ...base, background: '#FEE2E2', color: '#991B1B' };
    return { ...base, background: '#FEF3C7', color: '#92400E' }; 
  };

  const getModalTitle = () => {
      if (modalMode === 'create') return 'New Preference Request';
      if (modalMode === 'edit') return 'Edit Preference Request';
      return 'View Preference Details';
  };

  // --- STYLES ---
  const containerStyle = { width: '100%', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' };
  const headerRowStyle = { maxWidth: 1200, margin: '24px auto 16px', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const titleStyle = { fontSize: 24, fontWeight: 900, color: '#111827', margin: 0 };
  const tableCardStyle = { maxWidth: 1200, margin: '0 auto 40px', padding: '0 32px' };
  const tableContainerStyle = { background: 'white', borderRadius: 10, border: '1px solid #E6E6E6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' };
  const gridLayout = '1fr 0.8fr 1fr 1.2fr 2fr 1fr'; 
  const headerCellStyle = { padding: '16px', background: 'white', borderBottom: '1px solid #E6E6E6', fontWeight: 600, fontSize: 16, color: '#374151' };
  const rowCellStyle = { padding: '12px 16px', fontSize: 14, color: '#1F2937', alignItems: 'center', display: 'flex' };
  const btnNewStyle = { padding: '10px 24px', background: '#5091CD', borderRadius: 68, border: 'none', color: 'white', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' };
  const iconBtnStyle = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F3F4F6', cursor: 'pointer' };
  const paginationButtonStyle = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, color: '#374151', fontSize: 18, lineHeight: 1, transition: 'all 0.2s', outline: 'none' };
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
  const modalContentStyle = { background: 'white', padding: '30px', borderRadius: 12, width: '450px', maxWidth: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
  const inputGroupStyle = { marginBottom: 16 };
  const labelStyle = { display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#374151' };
  const inputStyle = { width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #D1D5DB', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' };
  const cancelButtonStyle = { flex: 1, padding: '10px', borderRadius: 6, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#374151' };
  const deleteButtonStyle = { width: 100, padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };

  return (
    <div style={containerStyle}>
      <UserNavbar active="preference" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoShiftPreference={onGoShiftPreference} onGoApplyLeave={onGoApplyLeave} onGoAccount={onGoAccount} onLogout={onLogout} />

      <div style={headerRowStyle}>
        <div>
          <h1 style={titleStyle}>My Shift Preferences</h1>
          {currentUser && (
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              User: {currentUser.fullName} | Service: <span style={{fontWeight: 600, color: '#5091CD'}}>{currentUser.service || 'Default'}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="month" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', outline: 'none', color: '#374151', fontSize: 14 }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <button style={btnNewStyle} onClick={handleOpenCreate}>New Preference</button>
        </div>
      </div>

      <div style={tableCardStyle}>
        <div style={tableContainerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: gridLayout }}>
            <div style={headerCellStyle}>Date</div>
            <div style={headerCellStyle}>Roster ID</div>
            <div style={headerCellStyle}>Shift Requested</div>
            <div style={headerCellStyle}>Approval Status</div>
            <div style={headerCellStyle}>Remarks</div>
            <div style={headerCellStyle}>Actions</div>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : currentPreferences.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>No Preference Requests Found</div>
          ) : (
            currentPreferences.map((pref, idx) => (
              <div key={pref.shiftPref_id || idx} style={{ display: 'grid', gridTemplateColumns: gridLayout, borderTop: '1px solid #E6E6E6' }}>
                <div style={{ ...rowCellStyle, fontWeight: 500, color: '#111827' }}>{pref.date}</div>
                <div style={rowCellStyle}>{pref.roster_id}</div>
                <div style={{ ...rowCellStyle, fontWeight: 500, color: '#111827' }}>{pref.shift_code}</div>
                <div style={rowCellStyle}>
                  <span style={getStatusStyle(pref.status)}>{pref.status || 'Pending'}</span>
                </div>
                <div style={rowCellStyle}>
                    {pref.remarks && pref.remarks.length > 20 ? pref.remarks.substring(0, 20) + '...' : (pref.remarks || '-')}
                </div>
                <div style={rowCellStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleOpenView(pref)} style={iconBtnStyle} title="View"><EyeIcon /></button>
                        <button onClick={() => handleOpenEdit(pref)} style={iconBtnStyle} title="Edit"><PencilIcon /></button>
                        <button onClick={() => handleDeleteClick(pref.shiftPref_id)} style={{...iconBtnStyle, borderColor: '#FECACA', background: '#FEF2F2'}} title="Delete"><TrashIcon /></button>
                    </div>
                </div>
              </div>
            ))
          )}

          {filteredPreferences.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E6E6E6', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}>«</button>
                <button onClick={handlePrevPage} disabled={currentPage === 1} style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}>‹</button>
                <span style={{ fontSize: 13, color: '#6B7280', margin: '0 12px', fontWeight: 500, minWidth: 60, textAlign: 'center' }}>
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPreferences.length)} of {filteredPreferences.length}
                </span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages} style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}>›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, fontWeight: 700, color: '#111827' }}>{getModalTitle()}</h2>
            <form onSubmit={handleSubmit}>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Date</label>
                <input 
                    type="date" 
                    name="date" 
                    required 
                    disabled={modalMode === 'view'} 
                    value={formData.date} 
                    onChange={handleInputChange} 
                    style={{...inputStyle, background: modalMode === 'view' ? '#F9FAFB' : 'white'}} 
                />
              </div>

              {/* DYNAMIC SHIFT SELECTOR */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Preferred Shift</label>
                <select 
                    name="shift_code" 
                    value={formData.shift_code} 
                    onChange={handleInputChange} 
                    disabled={modalMode === 'view'} 
                    style={{ ...inputStyle, background: modalMode === 'view' ? '#F9FAFB' : 'white' }}
                >
                  {/* Map allowed shifts based on User Service */}
                  {getAllowedShifts().map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
                
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Allowed for {currentUser?.service || 'Default'}: {getAllowedShifts().join(', ')}
                </div>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Remarks</label>
                <textarea 
                    name="remarks" 
                    rows="3" 
                    maxLength={256} 
                    placeholder="Reason (Optional)" 
                    disabled={modalMode === 'view'} 
                    value={formData.remarks} 
                    onChange={handleInputChange} 
                    style={{ ...inputStyle, resize: 'vertical', background: modalMode === 'view' ? '#F9FAFB' : 'white' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                {modalMode === 'view' ? (
                    <button type="button" onClick={() => setShowModal(false)} style={cancelButtonStyle}>Close</button>
                ) : (
                    <>
                        <button type="button" onClick={() => setShowModal(false)} style={cancelButtonStyle}>Cancel</button>
                        <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', background: '#2563EB', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>{modalMode === 'edit' ? 'Save Changes' : 'Submit Request'}</button>
                    </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: 400, textAlign: 'center', padding: 40 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>Confirm Deletion</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 15, color: '#6B7280', lineHeight: 1.5 }}>
              Are you sure you want to delete this preference request?
              <br/>
              <span style={{ color: '#DC2626', fontWeight: 600 }}>This action will not be reversible.</span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                style={{ ...cancelButtonStyle, width: 100, flex: 'none' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete} 
                style={deleteButtonStyle}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
const EyeIcon = () => <svg width="16" height="16" fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const PencilIcon = () => <svg width="16" height="16" fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="16" height="16" fill="none" stroke="#DC2626" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

export default UserShiftPref;