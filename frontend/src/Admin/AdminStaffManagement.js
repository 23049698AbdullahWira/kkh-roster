import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar.js';

function AdminStaffManagementPage({ onGoHome, onGoRoster, onGoStaff, onGoShift, onGoNewStaffAccounts, onGoManageLeave }) {
  
  // 1. STATE
  const [staffRows, setStaffRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    contact: '', 
    role: '',
    status: '', 
    avatar_url: ''
  });

  // 2. HELPER: Determine colors based on status
  const getStatusStyle = (status) => {
    const lowerStatus = status ? status.toLowerCase() : '';
    if (lowerStatus === 'on-duty') return { color: '#199325', bg: '#DCFCE7' }; 
    if (lowerStatus === 'leave' || lowerStatus === 'annual leave') return { color: '#B91C1C', bg: '#FEE2E2' };   
    if (lowerStatus === 'day-off') return { color: '#B8B817', bg: '#FEF9C3' }; 
    return { color: '#5091CD', bg: '#E1F0FF' }; 
  };

  // 3. FETCH: Get data from Backend
  const fetchStaff = () => {
    setIsLoading(true);
    fetch('http://localhost:5000/users')
      .then(res => res.json())
      .then(data => {
        const formattedStaff = data.map(user => {
          const style = getStatusStyle(user.status);
          return {
            staffId: user.user_id,
            fullName: user.full_name,
            email: user.email,
            password: user.password,
            role: user.role || 'APN',
            status: user.status || 'On-Duty',
            avatarUrl: user.avatar_url,
            contact: user.contact || '',
            
            statusColor: style.color,
            statusBg: style.bg,
          };
        });
        setStaffRows(formattedStaff);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching staff:", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // --- MODAL HANDLERS ---

  const handleViewClick = (staff) => {
    setSelectedStaff(staff);
    setFormData({
        full_name: staff.fullName,
        email: staff.email,
        password: staff.password,
        contact: staff.contact, 
        role: staff.role,
        status: staff.status,
        avatar_url: staff.avatarUrl
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEditClick = (staff) => {
    setSelectedStaff(staff);
    setFormData({
        full_name: staff.fullName,
        email: staff.email,
        password: staff.password,
        contact: staff.contact,
        role: staff.role,
        status: staff.status,
        avatar_url: staff.avatarUrl
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStaff(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
  };

  const handleUpdate = () => {
    console.log("Sending Update Data:", formData); 

    fetch(`http://localhost:5000/users/${selectedStaff.staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => {
        if(res.ok) {
            alert("Staff updated successfully!");
            handleCloseModal();
            fetchStaff(); 
        } else {
            alert("Failed to update staff. Please check your backend code.");
        }
    })
    .catch(err => console.error("Error updating:", err));
  };

  const gridLayout = '2fr 1.3fr 1.4fr 2.5fr 1fr 0.8fr';

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="staff" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} />

      <main style={{ maxWidth: 1200, margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#111827' }}>All Staff Members</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onGoManageLeave} style={buttonStyle}>Manage Leave</button>
            <button onClick={onGoNewStaffAccounts} style={buttonStyle}>New Staff Account</button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E6E6E6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridLayout, padding: '16px', background: 'white', borderBottom: '1px solid #E6E6E6', fontWeight: 600, fontSize: 16, color: '#374151' }}>
              <div>Full Name</div>
              <div>Staff ID</div>
              <div>Contact</div>
              <div>Email</div>
              <div>Role</div>
              <div>Actions</div>
            </div>

            {isLoading ? (
               <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
            ) : (
               staffRows.map((row, idx) => (
                <div key={row.staffId} style={{ display: 'grid', gridTemplateColumns: gridLayout, padding: '12px 16px', alignItems: 'center', borderTop: idx === 0 ? 'none' : '1px solid #E6E6E6', fontSize: 14, color: '#1F2937' }}>
                  <div style={{fontWeight: 500}}>{row.fullName}</div>
                  <div>{row.staffId}</div>
                  
                  {/* Shows --- if contact is empty */}
                  <div>{row.contact || '---'}</div>

                  <div style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10}}>{row.email}</div>
                  <div>{row.role}</div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* View Button with SVG Icon */}
                    <button onClick={() => handleViewClick(row)} style={iconButtonStyle} title="View Details">
                        <EyeIcon />
                    </button>
                    {/* Edit Button with SVG Icon */}
                    <button onClick={() => handleEditClick(row)} style={iconButtonStyle} title="Edit Staff">
                        <PencilIcon />
                    </button>
                  </div>
                </div>
               ))
            )}
        </div>
      </main>

      {showModal && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                    {isEditing ? 'Edit Staff Details' : 'Staff Details'}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    <div>
                        <label style={labelStyle}>Full Name</label>
                        <input 
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            style={inputStyle} 
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Email</label>
                        <input 
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            style={inputStyle} 
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Contact Number</label>
                        <input 
                            name="contact" 
                            type="text"
                            value={formData.contact} 
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            style={inputStyle} 
                            placeholder="+65 1234 5678"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Password</label>
                        <input 
                            name="password"
                            type="text"
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            style={inputStyle} 
                            placeholder="Enter new password"
                        />
                    </div>
                    
                    <div>
                        <label style={labelStyle}>Avatar URL</label>
                        <input 
                            name="avatar_url"
                            type="text"
                            value={formData.avatar_url}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            style={inputStyle} 
                            placeholder="https://example.com/avatar.png"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Role</label>
                        <select 
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            style={inputStyle}
                        >
                            <option value="APN">APN</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                    <button onClick={handleCloseModal} style={cancelButtonStyle}>Close</button>
                    {isEditing && (
                        <button onClick={handleUpdate} style={saveButtonStyle}>Save Changes</button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// --- ICON COMPONENTS ---
const EyeIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const PencilIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

// --- STYLES ---
const buttonStyle = { padding: '10px 24px', background: '#5091CD', borderRadius: 68, border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' };
const iconButtonStyle = { width: 32, height: 32, background: '#F3F4F6', borderRadius: 6, cursor: 'pointer', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' };
const modalContentStyle = { background: 'white', padding: 32, borderRadius: 16, width: 520, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 14, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' };
const saveButtonStyle = { padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const cancelButtonStyle = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };

export default AdminStaffManagementPage;