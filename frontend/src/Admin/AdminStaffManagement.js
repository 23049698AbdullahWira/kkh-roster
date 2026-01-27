import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../Nav/navbar.js';

// --- HELPER: Status Colors ---
const getStatusStyle = (status) => {
  const lowerStatus = status ? status.toLowerCase() : '';
  if (lowerStatus === 'active') return { color: '#166534', bg: '#DCFCE7' };
  if (lowerStatus === 'inactive') return { color: '#991B1B', bg: '#FEE2E2' };
  return { color: '#1E40AF', bg: '#DBEAFE' };
};

function AdminStaffManagementPage({
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
  onGoManageLeave,
  currentUserRole = 'SUPERADMIN', 
  onLogout,
  loggedInUser, 
}) {

  // --- 1. STATE ---
  const [staffRows, setStaffRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dynamic Dropdown Options
  const [roleOptions, setRoleOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]); 

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // MODAL 1: EDIT/VIEW STAFF
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', contact: '', role: '', 
    status: 'Active', avatar_url: '', service: '' 
  });

  // MODAL 2: CREATE STAFF
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '', contact: '', email: '', role: '', profile_picture: '', service: '' 
  });

  // MODAL 3: DELETE CONFIRMATION
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const visibleRoles = roleOptions.filter(r => r === 'APN' || r === 'ADMIN');

  // --- LOGGING HELPER ---
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

  // --- 3. FETCH DATA (Initial) ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const resUsers = await fetch('http://localhost:5000/users');
      const dataUsers = await resUsers.json();

      const filteredData = dataUsers.filter(user => {
        const userRole = user.role ? user.role.toUpperCase() : '';
        return userRole !== 'SUPER ADMIN';
      });

      // Map DB columns to Frontend State
      const formattedStaff = filteredData.map(user => {
        const style = getStatusStyle(user.status);
        return {
          staffId: user.user_id,
          fullName: user.full_name,
          email: user.email,
          password: user.password,
          role: user.role || 'APN',
          status: user.status || 'Active', // Live Status
          service: user.service || 'General', // Live Service
          avatarUrl: user.avatar_url,
          contact: user.contact || '',
          statusColor: style.color,
          statusBg: style.bg,
        };
      });
      setStaffRows(formattedStaff);

      // 2. Fetch Roles
      const resRoles = await fetch('http://localhost:5000/roles'); 
      const rolesData = await resRoles.json();
      setRoleOptions(rolesData);

      // 3. Fetch Services (Dynamic from DB)
      const resServices = await fetch('http://localhost:5000/api/services');
      if (resServices.ok) {
        const servicesData = await resServices.json();
        setServiceOptions(servicesData);
        // Set default for create form if options exist
        if (servicesData.length > 0) {
            setCreateForm(prev => ({ ...prev, service: servicesData[0] }));
        }
      }

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- 5. HANDLER: CREATE STAFF ---
  const handleChangeCreate = (field) => (e) => {
    setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmitCreate = async () => {
    const [firstName, ...restName] = createForm.full_name.trim().split(' ');
    const lastName = restName.join(' ');

    const payload = {
      firstName: firstName || createForm.full_name,
      lastName: lastName || '',
      email: createForm.email,
      phone: createForm.contact,
      password: 'Temp1234!',
      role: createForm.role || 'staff',
      service: createForm.service, // Live Service Value
      avatar_url: createForm.profile_picture, 
      createdByUserId: loggedInUser?.userId,
      createdByName: loggedInUser?.fullName,
      createdByRole: loggedInUser?.role,
    };

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to create staff account.');
        return;
      }

      await logAction({ userId: loggedInUser?.userId, details: `${currentUserRole} created staff: ${createForm.full_name}` });

      alert('Staff account created successfully!');
      setShowCreate(false);
      // Reset form
      setCreateForm({ 
        full_name: '', contact: '', email: '', role: '', profile_picture: '', 
        service: serviceOptions.length > 0 ? serviceOptions[0] : '' 
      });
      fetchInitialData();
    } catch (err) {
      console.error('Error creating staff:', err);
      alert('Unable to connect to server.');
    }
  };

  const isCreateValid = createForm.full_name.trim() && createForm.contact.trim() && createForm.email.trim() && createForm.role.trim();
  const canCreateStaff = currentUserRole === 'SUPERADMIN';

  // --- 6. HANDLERS: EDIT/VIEW STAFF ---
  const populateFormData = (staff) => ({
    full_name: staff.fullName,
    email: staff.email,
    password: staff.password,
    contact: staff.contact,
    role: staff.role,
    status: staff.status,   // Live Status Value
    service: staff.service, // Live Service Value
    avatar_url: staff.avatarUrl
  });

  const handleViewClick = (staff) => {
    setSelectedStaff(staff);
    setFormData(populateFormData(staff));
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEditClick = (staff) => {
    setSelectedStaff(staff);
    setFormData(populateFormData(staff));
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStaff(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- DELETE LOGIC ---
  const handleDeleteClick = () => setShowDeleteConfirm(true);

  const executeDelete = async () => {
    if (!selectedStaff) return;
    try {
      const res = await fetch(`http://localhost:5000/users/${selectedStaff.staffId}`, { method: 'DELETE' });
      if (res.ok) {
        await logAction({ userId: loggedInUser?.userId, details: `${currentUserRole} deleted staff: ${selectedStaff.fullName}` });
        alert('Staff account deleted successfully.');
        setShowDeleteConfirm(false);
        handleCloseModal(); 
        fetchInitialData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete staff account.');
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Error deleting staff:", err);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = () => {
    fetch(`http://localhost:5000/users/${selectedStaff.staffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(async res => {
        if (res.ok) {
          await logAction({ userId: loggedInUser?.userId, details: `${currentUserRole} updated staff: ${formData.full_name}` });
          alert("Staff updated successfully!");
          handleCloseModal();
          fetchInitialData();
        } else {
          alert("Failed to update staff.");
        }
      })
      .catch(err => console.error("Error updating:", err));
  };

  // --- 7. PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = staffRows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(staffRows.length / itemsPerPage);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

  // === UPDATED GRID LAYOUT ===
  // StaffID(0.8) | Name(1.3) | Service(1) | Contact(1.2) | Email(1.8) | Role(0.8) | Actions(0.8)
  const gridLayout = '0.8fr 1.3fr 1fr 1.2fr 1.8fr 0.8fr 0.8fr'; 

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="staff" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout} />

      <main style={{ maxWidth: 1200, margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#111827' }}>All Staff Members</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onGoManageLeave} style={{ padding: '10px 24px', background: '#5091CD', borderRadius: 68, border: 'none', color: 'white', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>Manage Leave</button>
            <button onClick={canCreateStaff ? () => setShowCreate(true) : undefined} disabled={!canCreateStaff} style={{ padding: '10px 24px', background: canCreateStaff ? '#5091CD' : '#A9C3E0', borderRadius: 68, border: 'none', color: 'white', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: canCreateStaff ? 'pointer' : 'not-allowed', opacity: canCreateStaff ? 1 : 0.7 }}>New Staff Account</button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E6E6E6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridLayout, padding: '16px', background: 'white', borderBottom: '1px solid #E6E6E6', fontWeight: 600, fontSize: 16, color: '#374151' }}>
            <div>Staff ID</div>
            <div>Full Name</div>
            <div>Service</div>
            <div>Contact</div>
            <div>Email</div>
            <div>Role</div>
            <div>Actions</div>
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : (
            currentStaff.map((row, idx) => {
              const isTargetAdmin = row.role === 'ADMIN';
              const canEdit = currentUserRole === 'SUPERADMIN' || !isTargetAdmin;

              // Truncate logic
              const displayName = row.fullName.length > 20 ? row.fullName.substring(0, 20) + '...' : row.fullName;

              return (
                <div key={row.staffId} style={{ display: 'grid', gridTemplateColumns: gridLayout, padding: '12px 16px', alignItems: 'center', borderTop: idx === 0 ? 'none' : '1px solid #E6E6E6', fontSize: 14, color: '#1F2937' }}>
                  <div>{row.staffId}</div>
                  {/* Truncated Name with Tooltip */}
                  <div style={{ fontWeight: 500 }} title={row.fullName}>{displayName}</div>
                  <div><span style={{ padding: '2px 8px', background: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{row.service}</span></div>
                  <div>{row.contact || '---'}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{row.email}</div>
                  <div>{row.role}</div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleViewClick(row)} style={iconButtonStyle} title="View Details"><EyeIcon /></button>
                    {canEdit && <button onClick={() => handleEditClick(row)} style={iconButtonStyle} title="Edit Staff"><PencilIcon /></button>}
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {staffRows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E6E6E6', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.4 : 1 }}>«</button>
                <button onClick={handlePrevPage} disabled={currentPage === 1} style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
                <span style={{ fontSize: 13, color: '#6B7280', margin: '0 12px', fontWeight: 500 }}>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, staffRows.length)} of {staffRows.length}</span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages} style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1 }}>»</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: VIEW/EDIT STAFF */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700, color: '#111827' }}>
              {isEditing ? 'Edit Staff Details' : 'Staff Details'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Full Name</label><input name="full_name" value={formData.full_name} onChange={handleInputChange} disabled={!isEditing} style={inputStyle} /></div>
              <div><label style={labelStyle}>Email</label><input name="email" type="email" value={formData.email} onChange={handleInputChange} disabled={!isEditing} style={inputStyle} /></div>
              <div><label style={labelStyle}>Contact Number</label><input name="contact" type="text" value={formData.contact} onChange={handleInputChange} disabled={!isEditing} style={inputStyle} placeholder="+65 1234 5678" /></div>
              
              {/* Dynamic Service Dropdown */}
              <div>
                <label style={labelStyle}>Service Unit</label>
                <select name="service" value={formData.service} onChange={handleInputChange} disabled={!isEditing} style={inputStyle}>
                    <option value="">Select Service</option>
                    {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Status Dropdown */}
              <div>
                <label style={labelStyle}>Account Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} disabled={!isEditing} style={inputStyle}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
              </div>

              {currentUserRole === 'SUPERADMIN' && (
                <div><label style={labelStyle}>Password</label><input name="password" type="text" value={formData.password} onChange={handleInputChange} disabled={!isEditing} style={inputStyle} placeholder="Enter new password" /></div>
              )}

              <div><label style={labelStyle}>Avatar URL</label><input name="avatar_url" type="text" value={formData.avatar_url} onChange={handleInputChange} disabled={!isEditing} style={inputStyle} /></div>
              
              {currentUserRole === 'SUPERADMIN' && (
                <div><label style={labelStyle}>Role</label><select name="role" value={formData.role} onChange={handleInputChange} disabled={!isEditing} style={inputStyle}><option value="APN">APN</option><option value="ADMIN">ADMIN</option></select></div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
              <div>{isEditing && <button onClick={handleDeleteClick} style={deleteButtonStyle}>Delete Account</button>}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleCloseModal} style={cancelButtonStyle}>Close</button>
                {isEditing && <button onClick={handleUpdate} style={saveButtonStyle}>Save Changes</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE STAFF */}
      {showCreate && canCreateStaff && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 720, background: '#EDF0F5', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ color: 'black', fontSize: 22, fontWeight: 600 }}>Create New Staff Account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Full name', field: 'full_name', type: 'text' },
                { label: 'Contact', field: 'contact', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ color: 'black', fontSize: 13, fontWeight: 500 }}>{label}</div>
                  <input type={type} value={createForm[field]} onChange={handleChangeCreate(field)} style={inputStyle} />
                </div>
              ))}
              
              {/* Dynamic Service Selection */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: 'black', fontSize: 13, fontWeight: 500 }}>Service Unit</div>
                <select value={createForm.service} onChange={handleChangeCreate('service')} style={inputStyle}>
                    <option value="">Select Service</option>
                    {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: 'black', fontSize: 13, fontWeight: 500 }}>Staff Role</div>
                <select value={createForm.role} onChange={handleChangeCreate('role')} style={inputStyle}>
                  <option value="">Select a role</option>
                  {visibleRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button onClick={handleSubmitCreate} disabled={!isCreateValid} style={{ ...saveButtonStyle, opacity: isCreateValid ? 1 : 0.6, cursor: isCreateValid ? 'pointer' : 'not-allowed' }}>Create</button>
              <button onClick={() => setShowCreate(false)} style={cancelButtonStyle}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: 400, textAlign: 'center', padding: 40 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>Confirm Deletion</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 15, color: '#6B7280' }}>Are you sure? <span style={{ color: '#DC2626', fontWeight: 600 }}>This action is irreversible.</span></p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ ...cancelButtonStyle, width: 100 }}>Cancel</button>
              <button onClick={executeDelete} style={{ ...deleteButtonStyle, width: 100 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons & Styles
const EyeIcon = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>);
const PencilIcon = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>);
const iconButtonStyle = { width: 32, height: 32, background: '#F3F4F6', borderRadius: 6, cursor: 'pointer', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' };
const paginationButtonStyle = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, color: '#374151', fontSize: 18, lineHeight: 1, transition: 'all 0.2s', outline: 'none' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' };
const modalContentStyle = { background: 'white', padding: 32, borderRadius: 16, width: 520, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 14, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' };
const saveButtonStyle = { padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const cancelButtonStyle = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const deleteButtonStyle = { padding: '10px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: 14 };

export default AdminStaffManagementPage;