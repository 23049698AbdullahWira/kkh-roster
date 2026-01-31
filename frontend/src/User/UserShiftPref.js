import React, { useState, useEffect, useCallback } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';
import './UserShiftPref.css'; 

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

  // Helper for CSS Class lookup
  const getStatusClassName = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const baseClass = 'user-usershiftpref-status-badge';
    if (s === 'approved') return `${baseClass} user-usershiftpref-status-approved`;
    if (s === 'denied') return `${baseClass} user-usershiftpref-status-denied`;
    return `${baseClass} user-usershiftpref-status-pending`;
  };

  return (
    <div className="user-usershiftpref-container">
      <UserNavbar active="preference" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoShiftPreference={onGoShiftPreference} onGoApplyLeave={onGoApplyLeave} onGoAccount={onGoAccount} onLogout={onLogout} />
      
      <div className="user-usershiftpref-header-row">
        <div>
          <h1 className="user-usershiftpref-page-title">My Shift Preferences</h1>
          {currentUser && (
            <div className="user-usershiftpref-user-info">
              {currentUser.fullName} | Service: <span className="user-usershiftpref-service-highlight">{currentUser.service || 'CE'}</span>
            </div>
          )}
        </div>
        <div className="user-usershiftpref-header-actions">
          <input 
            type="month" 
            value={filterDate} 
            onChange={(e) => {setFilterDate(e.target.value); setCurrentPage(1);}} 
            className="user-usershiftpref-month-filter"
          />
          <button onClick={handleOpenCreate} className="user-usershiftpref-btn-new-pref">New Preference</button>
        </div>
      </div>

      <div className="user-usershiftpref-table-card">
        <div className="user-usershiftpref-table-container">
          <div className="user-usershiftpref-grid-row user-usershiftpref-table-header">
            <div>Date</div><div>Roster ID</div><div>Shift</div><div>Status</div><div>Remarks</div><div>Actions</div>
          </div>
          
          {!loading && currentPreferences.length > 0 ? (
            currentPreferences.map((pref) => (
              <div key={pref.shiftPref_id} className="user-usershiftpref-grid-row user-usershiftpref-table-data-row">
                <div className="user-usershiftpref-row-cell">{pref.date}</div>
                <div className="user-usershiftpref-row-cell">{pref.roster_id}</div>
                <div className="user-usershiftpref-row-cell">{pref.shift_code}</div>
                <div className="user-usershiftpref-row-cell">
                  <span className={getStatusClassName(pref.status)}>{pref.status || 'Pending'}</span>
                </div>
                <div className="user-usershiftpref-row-cell">{pref.remarks || '-'}</div>
                <div className="user-usershiftpref-row-cell">
                  <div className="user-usershiftpref-action-group">
                    <button onClick={() => handleOpenView(pref)} className="user-usershiftpref-icon-btn" title="View"><EyeIcon /></button>
                    <button onClick={() => handleOpenEdit(pref)} className="user-usershiftpref-icon-btn" title="Edit"><PencilIcon /></button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            !loading && (
              <div className="user-usershiftpref-empty-state">
                No shift preferences found.
              </div>
            )
          )}
          
          {totalPages > 1 && (
            <div className="user-usershiftpref-pagination-container">
                <div className="user-usershiftpref-pagination-wrapper">
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => handlePageChange(1)} 
                        className="user-usershiftpref-pagination-btn"
                    >«</button>
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        className="user-usershiftpref-pagination-btn"
                    >‹</button>
                    
                    <span className="user-usershiftpref-pagination-info">
                        {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPreferences.length)} of {filteredPreferences.length}
                    </span>

                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        className="user-usershiftpref-pagination-btn"
                    >›</button>
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => handlePageChange(totalPages)} 
                        className="user-usershiftpref-pagination-btn"
                    >»</button>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="user-usershiftpref-modal-overlay">
          <div className="user-usershiftpref-modal-content">
            <h2 className="user-usershiftpref-modal-title">{getModalTitle()}</h2>
            <form onSubmit={handleSubmit}>
              <div className="user-usershiftpref-form-group">
                <label className="user-usershiftpref-form-label">Date</label>
                <input 
                  type="date" 
                  required 
                  disabled={modalMode === 'view'} 
                  value={formData.date} 
                  onChange={handleDateChangeInModal} 
                  className="user-usershiftpref-form-input" 
                />
                {modalMode !== 'view' && modalRosterStatus && (
                    <div className={`user-usershiftpref-roster-status-msg ${isModalDateValid ? 'user-usershiftpref-status-valid' : 'user-usershiftpref-status-invalid'}`}>
                        {checkingStatus ? "Checking..." : `Roster Status: ${modalRosterStatus} ${isModalDateValid ? '(OPEN)' : '(LOCKED)'}`}
                    </div>
                )}
              </div>
              <div className="user-usershiftpref-form-group">
                <label className="user-usershiftpref-form-label">Shift Code</label>
                <select 
                  name="shift_code" 
                  value={formData.shift_code} 
                  onChange={handleInputChange} 
                  disabled={modalMode === 'view'} 
                  className="user-usershiftpref-form-input"
                >
                  {getAllowedShifts().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="user-usershiftpref-form-label">Remarks</label>
                <textarea 
                  name="remarks" 
                  rows="3" 
                  disabled={modalMode === 'view'} 
                  value={formData.remarks} 
                  onChange={handleInputChange} 
                  className="user-usershiftpref-form-input user-usershiftpref-form-textarea" 
                  placeholder="Notes..." 
                />
              </div>
              
              <div className="user-usershiftpref-modal-actions">
                <div>
                  {modalMode === 'edit' && (
                    <button type="button" onClick={() => handleDeleteClick(selectedPrefId)} className="user-usershiftpref-btn-common user-usershiftpref-btn-delete">Delete Request</button>
                  )}
                </div>
                <div className="user-usershiftpref-action-buttons-right">
                  <button type="button" onClick={() => setShowModal(false)} className="user-usershiftpref-btn-common user-usershiftpref-btn-cancel">
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode !== 'view' && (
                    <button 
                      type="submit" 
                      disabled={!isModalDateValid || checkingStatus} 
                      className="user-usershiftpref-btn-common user-usershiftpref-btn-save"
                    >
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
        <div className="user-usershiftpref-modal-overlay user-usershiftpref-confirm-overlay">
          <div className="user-usershiftpref-confirm-content">
            <h3 className="user-usershiftpref-confirm-title">Confirm Deletion</h3>
            <p className="user-usershiftpref-confirm-text">Are you sure you want to delete this preference request?</p>
            <p className="user-usershiftpref-confirm-warning">This action will not be reversible.</p>
            <div className="user-usershiftpref-confirm-actions">
              <button onClick={() => setShowDeleteConfirm(false)} className="user-usershiftpref-btn-common user-usershiftpref-btn-cancel user-usershiftpref-btn-wide">Cancel</button>
              <button onClick={executeDelete} className="user-usershiftpref-btn-common user-usershiftpref-btn-delete user-usershiftpref-btn-wide">Delete</button>
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