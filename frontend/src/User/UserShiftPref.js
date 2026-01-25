import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

function UserShiftPref({
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(true);

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    status: 'AM',
    remarks: '',
    roster_id: 202602, // Default roster ID for now
  });

  // 1. Load User & Fetch Data on Mount
  useEffect(() => {
    // Read user from localStorage based on your screenshot structure
    const storedUser = localStorage.getItem('user');
    
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        // Fetch data immediately using the ID from local storage
        fetchPreferences(parsed.userId);
      } catch (e) {
        console.error("Error parsing user from local storage", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Preferences Function (Updated to Port 5000)
  const fetchPreferences = (userId) => {
    setLoading(true);
    fetch(`http://localhost:5000/api/get-shift-preferences/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to connect to server');
        }
        return res.json();
      })
      .then((data) => {
        // Format dates to look clean (YYYY-MM-DD)
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

  // 3. Handle Create Submit (Updated to Port 5000)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const payload = {
        ...formData,
        user_id: currentUser.userId, // Include user ID from local storage
      };

      const response = await fetch('http://localhost:5000/api/add-shift-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Preference Added Successfully!');
        setShowModal(false); // Close Modal
        // Reset form slightly but keep roster_id
        setFormData({ date: '', status: 'AM', remarks: '', roster_id: 202602 });
        // Refresh the list
        fetchPreferences(currentUser.userId);
      } else {
        const errorData = await response.json();
        alert('Error: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to connect to server (Port 5000). Check if backend is running.');
    }
  };

  // 4. Handle Form Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- Helpers for Display ---
  const filteredPreferences = preferences.filter((pref) => {
    if (!filterDate) return true;
    return pref.date.startsWith(filterDate);
  });

  const renderRemarks = (text) => {
    if (!text) return '-';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  };

  // Status Badge Logic
  const getStatusStyle = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const base = {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      textTransform: 'uppercase',
      display: 'inline-block',
    };

    if (s === 'approved') return { ...base, background: '#D1FAE5', color: '#065F46' };
    if (s === 'denied') return { ...base, background: '#FEE2E2', color: '#991B1B' };
    return { ...base, background: '#FEF3C7', color: '#92400E' }; // Pending/Default
  };

  // --- Styles ---
  const containerStyle = {
    width: '100%',
    minHeight: '100vh',
    background: '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
  };

  const headerRowStyle = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '30px 20px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle = {
    fontSize: 22,
    fontWeight: 800,
    color: '#111827',
    margin: 0,
  };

  const tableCardStyle = {
    maxWidth: 1200,
    margin: '0 auto 40px',
    background: 'white',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  };

  const thStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid #E5E7EB',
    background: 'white',
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
  };

  const tdStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid #E5E7EB',
    fontSize: 14,
    color: '#6B7280',
    verticalAlign: 'middle',
  };

  const btnNewStyle = {
    background: '#508BC9',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  // Modal Styles
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalContentStyle = {
    background: 'white',
    padding: '30px',
    borderRadius: 12,
    width: '450px',
    maxWidth: '90%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  };

  const inputGroupStyle = { marginBottom: 16 };
  const labelStyle = { display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#374151' };
  const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: 6,
    border: '1px solid #D1D5DB',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <UserNavbar
        active="preference"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
        onLogout={onLogout}
      />

      {/* Header Section */}
      <div style={headerRowStyle}>
        <div>
          <h1 style={titleStyle}>My Shift Preferences</h1>
          {currentUser && (
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              User: {currentUser.fullName}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Month Filter */}
          <input
            type="month"
            style={{ padding: '8px', borderRadius: 6, border: '1px solid #D1D5DB', outline: 'none', color: '#374151' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          
          {/* New Preference Button */}
          <button style={btnNewStyle} onClick={() => setShowModal(true)}>
            <span>+</span> New Preference
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ padding: '0 20px' }}>
        <div style={tableCardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Roster ID</th>
                <th style={thStyle}>Shift</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', padding: 40 }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredPreferences.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', padding: 50 }}>
                    No Preference Entered
                  </td>
                </tr>
              ) : (
                filteredPreferences.map((pref, idx) => (
                  <tr key={pref.id || idx}>
                    <td style={{ ...tdStyle, color: '#111827', fontWeight: 500 }}>
                      {pref.date}
                    </td>
                    <td style={tdStyle}>{pref.roster_id}</td>
                    <td style={{ ...tdStyle, color: '#111827', fontWeight: 500 }}>
                      {pref.status}
                    </td>
                    <td style={tdStyle}>
                      <span style={getStatusStyle(pref.req_status)}>
                        {pref.req_status || 'Pending'}
                      </span>
                    </td>
                    <td style={tdStyle}>{renderRemarks(pref.remarks)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Preference Modal */}
      {showModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>Add Preference</h2>
            
            <form onSubmit={handleCreateSubmit}>
              {/* Date Input */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  style={inputStyle}
                />
              </div>

              {/* Shift Type Input */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Shift Type</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={{ ...inputStyle, background: 'white' }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                  <option value="NNJ">NNJ</option>
                  <option value="RD">Rest Day (RD)</option>
                </select>
              </div>

              {/* Remarks Input */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Remarks</label>
                <textarea
                  name="remarks"
                  rows="3"
                  maxLength={256}
                  placeholder="Reason (Optional)"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 6,
                    border: '1px solid #D1D5DB',
                    background: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#508BC9',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserShiftPref;