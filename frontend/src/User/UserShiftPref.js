import React, { useState, useEffect, useCallback } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

// --- CONFIGURATION: Service to Shift Mapping ---
const SERVICE_SHIFTS_CONFIG = {
  'CE':    ['RRT', 'NNJ', 'AM', 'PM', 'ND'],
  'ONCO':  ['RRT', 'AM', 'PM'],
  'PAS':   ['RRT', 'AM'],
  'PAME':  ['KKH@HOME', 'NNJ@HOME', 'NNJ', 'RRT', 'GPAPN', 'AM', 'PM'],
  'ACUTE': ['RRT', 'AM', 'PM'],
  'DEFAULT': ['AM', 'PM', 'RRT'] 
};

function UserShiftPref({ onGoHome, onGoRoster, onGoShiftPreference, onGoApplyLeave, onGoAccount, onLogout }) {
  // --- 1. STATE INITIALIZATION ---
  const [currentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [preferences, setPreferences] = useState([]);
  const [filterDate, setFilterDate] = useState(''); 
  const [loading, setLoading] = useState(true);
  
  // Modal Validation & Roster Status
  const [modalRosterStatus, setModalRosterStatus] = useState(null);
  const [isModalDateValid, setIsModalDateValid] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Main Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedPrefId, setSelectedPrefId] = useState(null);
  const [formData, setFormData] = useState({ date: '', shift_code: '', remarks: '' });

  // Delete Confirmation States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prefToDelete, setPrefToDelete] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- 2. LOGIC FUNCTIONS ---
  const logAction = async ({ userId, details }) => {
    try {
      if (!userId) return;
      await fetch('http://localhost:5000/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, details })
      });
    } catch (err) { console.error('Logging failed:', err); }
  };

  const fetchPreferences = useCallback((userId) => {
    setLoading(true);
    fetch(`http://localhost:5000/api/get-shift-preferences/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((item) => ({
          ...item,
          date: new Date(item.date).toISOString().split('T')[0],
        }));
        setPreferences(formattedData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentUser?.userId) {
      fetchPreferences(currentUser.userId);
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchPreferences]);

  const checkRosterStatusForModal = async (dateString) => {
    if (!dateString) return;
    setCheckingStatus(true);
    const dateObj = new Date(dateString);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    try {
      const response = await fetch(`http://localhost:5000/api/get-roster-status?month=${month}&year=${year}`);
      const data = await response.json();
      setModalRosterStatus(data.status || "No Roster Created");
      setIsModalDateValid(data.status === 'Preference Open');
    } catch (error) {
      setModalRosterStatus("Error checking status");
      setIsModalDateValid(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDateChangeInModal = (e) => {
    const selectedDate = e.target.value;
    setFormData(prev => ({ ...prev, date: selectedDate }));
    checkRosterStatusForModal(selectedDate);
  };

  const getModalTitle = () => {
    if (modalMode === 'create') return 'New Preference Request';
    if (modalMode === 'edit') return 'Edit Preference Request';
    return 'View Preference Details';
  };

  const handleDeleteClick = (id) => {
    setPrefToDelete(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!prefToDelete) return;
    try {
      const response = await fetch(`http://localhost:5000/api/delete-shift-preference/${prefToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        await logAction({ userId: currentUser.userId, details: `APN ${currentUser.fullName} deleted shift preference request.` });
        fetchPreferences(currentUser.userId);
        setShowDeleteConfirm(false);
        setShowModal(false);
      }
    } catch (error) { console.error(error); }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    const allowed = getAllowedShifts();
    setFormData({ date: '', shift_code: allowed[0], remarks: '' });
    setModalRosterStatus(null);
    setIsModalDateValid(false);
    setShowModal(true);
  };

  const handleOpenEdit = (pref) => {
    setModalMode('edit');
    setFormData({ date: pref.date, shift_code: pref.shift_code, remarks: pref.remarks });
    setSelectedPrefId(pref.shiftPref_id);
    checkRosterStatusForModal(pref.date);
    setShowModal(true);
  };

  const handleOpenView = (pref) => {
    setModalMode('view');
    setFormData({ date: pref.date, shift_code: pref.shift_code, remarks: pref.remarks });
    setModalRosterStatus(null);
    setShowModal(true);
  };

  const getAllowedShifts = () => {
    if (!currentUser || !currentUser.service) return SERVICE_SHIFTS_CONFIG['DEFAULT'];
    return SERVICE_SHIFTS_CONFIG[currentUser.service] || SERVICE_SHIFTS_CONFIG['DEFAULT'];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || (!isModalDateValid && modalMode !== 'view')) return;

    const allowedShifts = getAllowedShifts();
    const finalShiftCode = formData.shift_code || allowedShifts[0];

    const endpoint = modalMode === 'create' 
      ? 'http://localhost:5000/api/add-shift-preference'
      : `http://localhost:5000/api/update-shift-preference/${selectedPrefId}`;
    
    const method = modalMode === 'create' ? 'POST' : 'PUT';
    const body = modalMode === 'create' 
      ? { user_id: currentUser.userId, date: formData.date, shift_code: finalShiftCode, remarks: formData.remarks }
      : { date: formData.date, shift_code: finalShiftCode, remarks: formData.remarks };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        await logAction({ 
          userId: currentUser.userId, 
          details: `APN ${currentUser.fullName} ${modalMode === 'create' ? 'created' : 'updated'} preference for ${formData.date}.` 
        });
        setShowModal(false);
        fetchPreferences(currentUser.userId);
      }
    } catch (error) { console.error(error); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- 3. UI RENDER HELPERS ---
  const filteredPreferences = preferences.filter((pref) => !filterDate || pref.date.startsWith(filterDate));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPreferences = filteredPreferences.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPreferences.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const getStatusStyle = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const base = { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' };
    if (s === 'approved') return { ...base, background: '#D1FAE5', color: '#065F46' };
    if (s === 'denied') return { ...base, background: '#FEE2E2', color: '#991B1B' };
    return { ...base, background: '#FEF3C7', color: '#92400E' };
  };

  // --- STYLES ---
  const containerStyle = { width: '100%', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' };
  const headerRowStyle = { maxWidth: 1200, margin: '24px auto 16px', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const tableCardStyle = { maxWidth: 1200, margin: '0 auto 40px', padding: '0 32px' };
  const tableContainerStyle = { background: 'white', borderRadius: 10, border: '1px solid #E6E6E6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' };
  const gridLayout = '1.2fr 1fr 1.2fr 1.2fr 2fr 1fr'; 
  const rowCellStyle = { padding: '12px 16px', fontSize: 14, color: '#1F2937', display: 'flex', alignItems: 'center' };
  const iconBtnStyle = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F3F4F6', cursor: 'pointer' };

  // Pagination Styles
  const paginationBtnStyle = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#374151',
    fontSize: '14px',
    margin: '0 4px',
    transition: 'all 0.2s'
  };

  // Modal Styles
  const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
  const modalContentStyle = { background: 'white', padding: '32px', borderRadius: '16px', width: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'Inter, sans-serif' };
  const deleteButtonStyle = { padding: '10px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' };
  const cancelButtonStyle = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' };
  const saveButtonStyle = { padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      <UserNavbar active="preference" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoShiftPreference={onGoShiftPreference} onGoApplyLeave={onGoApplyLeave} onGoAccount={onGoAccount} onLogout={onLogout} />
      
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>My Shift Preferences</h1>
          {currentUser && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{currentUser.fullName} | Service: <span style={{ fontWeight: 600 }}>{currentUser.service || 'CE'}</span></div>}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input type="month" value={filterDate} onChange={(e) => {setFilterDate(e.target.value); setCurrentPage(1);}} style={{ padding: '8px', borderRadius: 6, border: '1px solid #D1D5DB' }} />
          <button onClick={handleOpenCreate} style={{ padding: '10px 24px', borderRadius: 68, background: '#5091CD', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>New Preference</button>
        </div>
      </div>

      <div style={tableCardStyle}>
        <div style={tableContainerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: gridLayout, background: '#F9FAFB', fontWeight: 600, borderBottom: '1px solid #E6E6E6', padding: '16px' }}>
            <div>Date</div><div>Roster ID</div><div>Shift</div><div>Status</div><div>Remarks</div><div>Actions</div>
          </div>
          {!loading && currentPreferences.map((pref) => (
            <div key={pref.shiftPref_id} style={{ display: 'grid', gridTemplateColumns: gridLayout, borderTop: '1px solid #E6E6E6' }}>
              <div style={rowCellStyle}>{pref.date}</div>
              <div style={rowCellStyle}>{pref.roster_id}</div>
              <div style={rowCellStyle}>{pref.shift_code}</div>
              <div style={rowCellStyle}><span style={getStatusStyle(pref.status)}>{pref.status || 'Pending'}</span></div>
              <div style={rowCellStyle}>{pref.remarks || '-'}</div>
              <div style={rowCellStyle}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleOpenView(pref)} style={iconBtnStyle} title="View"><EyeIcon /></button>
                  <button onClick={() => handleOpenEdit(pref)} style={iconBtnStyle} title="Edit"><PencilIcon /></button>
                </div>
              </div>
            </div>
          ))}
          
          {/* UPDATED PAGINATION UI: Centered */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E6E6E6', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => handlePageChange(1)} 
                        style={{ ...paginationBtnStyle, opacity: currentPage === 1 ? 0.5 : 1 }}
                    >«</button>
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        style={{ ...paginationBtnStyle, opacity: currentPage === 1 ? 0.5 : 1 }}
                    >‹</button>
                    
                    <span style={{ fontSize: '13px', color: '#6B7280', margin: '0 12px', fontWeight: 500 }}>
                        {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPreferences.length)} of {filteredPreferences.length}
                    </span>

                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        style={{ ...paginationBtnStyle, opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >›</button>
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => handlePageChange(totalPages)} 
                        style={{ ...paginationBtnStyle, opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >»</button>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '700', color: '#111827' }}>{getModalTitle()}</h2>
            <form onSubmit={handleSubmit}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" required disabled={modalMode === 'view'} value={formData.date} onChange={handleDateChangeInModal} style={inputStyle} />
                {modalMode !== 'view' && modalRosterStatus && (
                    <div style={{ fontSize: '12px', marginTop: '-12px', marginBottom: '16px', color: isModalDateValid ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                        {checkingStatus ? "Checking..." : `Roster Status: ${modalRosterStatus} ${isModalDateValid ? '(OPEN)' : '(LOCKED)'}`}
                    </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Shift Code</label>
                <select name="shift_code" value={formData.shift_code} onChange={handleInputChange} disabled={modalMode === 'view'} style={inputStyle}>
                  {getAllowedShifts().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Remarks</label>
                <textarea name="remarks" rows="3" disabled={modalMode === 'view'} value={formData.remarks} onChange={handleInputChange} style={{ ...inputStyle, resize: 'none' }} placeholder="Notes..." />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {modalMode === 'edit' && (
                    <button type="button" onClick={() => handleDeleteClick(selectedPrefId)} style={deleteButtonStyle}>Delete Request</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={cancelButtonStyle}>{modalMode === 'view' ? 'Close' : 'Cancel'}</button>
                  {modalMode !== 'view' && (
                    <button type="submit" disabled={!isModalDateValid || checkingStatus} style={{ ...saveButtonStyle, background: isModalDateValid ? '#2563EB' : '#9CA3AF', cursor: isModalDateValid ? 'pointer' : 'not-allowed' }}>
                      {modalMode === 'create' ? 'Submit Request' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '40px 32px', borderRadius: '16px', width: '450px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>Confirm Deletion</h3>
            <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px 0' }}>Are you sure you want to delete this preference request?</p>
            <p style={{ color: '#DC2626', fontSize: '15px', fontWeight: '700', margin: '0 0 24px 0' }}>This action will not be reversible.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ ...cancelButtonStyle, minWidth: '120px' }}>Cancel</button>
              <button onClick={executeDelete} style={{ ...deleteButtonStyle, minWidth: '120px' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EyeIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const PencilIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;

export default UserShiftPref;