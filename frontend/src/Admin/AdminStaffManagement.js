import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../Nav/navbar.js';
import './AdminStaffManagement.css'; 
// 1. Import centralized helper
import { fetchFromApi } from '../services/api';

// --- HELPER: Status Colors ---
const getStatusStyle = (status) => {
  const lowerStatus = status ? status.toLowerCase() : '';
  if (lowerStatus === 'active') return { color: '#166534', bg: '#DCFCE7' };
  if (lowerStatus === 'inactive') return { color: '#991B1B', bg: '#FEE2E2' };
  return { color: '#1E40AF', bg: '#DBEAFE' };
};

const statusOptions = ['All', 'Active', 'Inactive']; // Define options here

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
  // --- STATE ---
  const [staffRows, setStaffRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- FILTER STATES ---
  const [filterRole, setFilterRole] = useState('All'); 
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [filterService, setFilterService] = useState('All'); 

  const [gliderStyle, setGliderStyle] = useState({ left: 0, width: 0 });
  const pillsRef = useRef([]);

  useEffect(() => {
    const activeIndex = statusOptions.indexOf(filterStatus);
    const activeElement = pillsRef.current[activeIndex];

    if (activeElement) {
      setGliderStyle({
        left: activeElement.offsetLeft,
        width: activeElement.offsetWidth
      });
    }
  }, [filterStatus]);

  // Dynamic Dropdown Options
  const [roleOptions, setRoleOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]); 

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // MODAL STATES
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', contact: '', role: '', 
    status: 'Active', avatar_url: '', service: '', ward_id: null, 
  });

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '', contact: '', email: '', role: '', profile_picture: '', service: '' 
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wardOptions, setWardOptions] = useState([]); 

  const visibleRoles = roleOptions.filter(r => r === 'APN' || r === 'ADMIN');

  // --- LOGGING HELPER ---
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

  // --- FETCH DATA ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 3. UPDATED: Using fetchFromApi
      // Fetch Users
      const dataUsers = await fetchFromApi('/users');

      // Fetch Wards (Handle separately incase of error, though api.js throws)
      try {
        const wardsData = await fetchFromApi('/api/wards');
        setWardOptions(wardsData);
      } catch (e) { console.warn("Failed to load wards", e); }

      const filteredData = dataUsers.filter(user => {
        const userRole = user.role ? user.role.toUpperCase() : '';
        return userRole !== 'SUPER ADMIN';
      });

      const formattedStaff = filteredData.map(user => {
        const style = getStatusStyle(user.status);
        return {
          staffId: user.user_id,
          fullName: user.full_name,
          email: user.email,
          password: user.password,
          role: user.role || 'APN',
          status: user.status || 'Active', 
          service: user.service || 'General', 
          avatarUrl: user.avatar_url,
          contact: user.contact || '',
          statusColor: style.color,
          statusBg: style.bg,
          ward_id: user.ward_id || null, 
        };
      });
      setStaffRows(formattedStaff);

      // Fetch Roles
      const rolesData = await fetchFromApi('/roles');
      setRoleOptions(rolesData);

      // Fetch Services
      try {
        const servicesData = await fetchFromApi('/api/services');
        setServiceOptions(servicesData);
        if (servicesData.length > 0) {
            setCreateForm(prev => ({ ...prev, service: servicesData[0] }));
        }
      } catch (e) { console.warn("Failed to load services", e); }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- HANDLERS ---
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
      service: createForm.service, 
      avatar_url: createForm.profile_picture, 
      createdByUserId: loggedInUser?.userId,
      createdByName: loggedInUser?.fullName,
      createdByRole: loggedInUser?.role,
    };

    try {
      // 4. UPDATED: Using fetchFromApi
      const data = await fetchFromApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // API returns success: false if logic fails (e.g. email exists)
      if (!data.success) {
        alert(data.message || 'Failed to create staff account.');
        return;
      }

      await logAction({ userId: loggedInUser?.userId, details: `${currentUserRole} created staff: ${createForm.full_name}` });

      alert('Staff account created successfully!');
      setShowCreate(false);
      setCreateForm({ 
        full_name: '', contact: '', email: '', role: '', profile_picture: '', 
        service: serviceOptions.length > 0 ? serviceOptions[0] : '' 
      });
      fetchInitialData();
    } catch (err) {
      console.error('Error creating staff:', err);
      alert(err.message || 'Unable to connect to server.');
    }
  };

  const isCreateValid = createForm.full_name.trim() && createForm.contact.trim() && createForm.email.trim() && createForm.role.trim();
  const canCreateStaff = currentUserRole === 'SUPERADMIN';

  const populateFormData = (staff) => ({
    full_name: staff.fullName,
    email: staff.email,
    password: staff.password,
    contact: staff.contact,
    role: staff.role,
    status: staff.status, 
    service: staff.service, 
    avatar_url: staff.avatarUrl,
    ward_id: staff.ward_id
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);

  const executeDelete = async () => {
    if (!selectedStaff) return;
    try {
      // 5. UPDATED: Using fetchFromApi
      await fetchFromApi(`/users/${selectedStaff.staffId}`, { method: 'DELETE' });
      
      await logAction({ userId: loggedInUser?.userId, details: `${currentUserRole} deleted staff: ${selectedStaff.fullName}` });
      alert('Staff account deleted successfully.');
      setShowDeleteConfirm(false);
      handleCloseModal(); 
      fetchInitialData();
      
    } catch (err) {
      console.error("Error deleting staff:", err);
      alert(err.message || 'Failed to delete staff account.');
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = () => {
    // 6. UPDATED: Using fetchFromApi
    fetchFromApi(`/users/${selectedStaff.staffId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    })
      .then(async () => {
        await logAction({ userId: loggedInUser?.userId, details: `${currentUserRole} updated staff: ${formData.full_name}` });
        alert("Staff updated successfully!");
        handleCloseModal();
        fetchInitialData();
      })
      .catch((err) => {
        console.error('Error updating:', err);
        alert('Failed to update staff.');
      });
  };

  // --- FILTER & PAGINATION ---
  const filteredStaff = staffRows.filter(staff => {
    const matchRole = filterRole === 'All' || staff.role === filterRole;
    const matchStatus = filterStatus === 'All' || staff.status === filterStatus;
    const matchService = filterService === 'All' || staff.service === filterService;
    return matchRole && matchStatus && matchService;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, filterStatus, filterService]);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage((prev) => prev + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage((prev) => prev - 1); };

  return (
    <div className="admin-staffmanagement-container">
      <Navbar active="staff" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout} />

      <main className="admin-staffmanagement-content">
        
        {/* Header */}
        <div className="admin-staffmanagement-header">
          <h1 className="admin-staffmanagement-title">All Staff Members</h1>
          <div className="admin-staffmanagement-header-actions">
            <button onClick={onGoManageLeave} className="admin-staffmanagement-btn-primary">
              Manage Leave
            </button>
            <button 
              onClick={canCreateStaff ? () => setShowCreate(true) : undefined} 
              disabled={!canCreateStaff} 
              className="admin-staffmanagement-btn-primary"
            >
              New Staff Account
            </button>
          </div>
        </div>

        {/* --- FILTER CARD --- */}
        <div className="admin-staffmanagement-filter-card">
            
            {/* ROW 1: STATUS PILLS */}
            <div className="admin-staffmanagement-filter-pills-row">
                <div className="admin-staffmanagement-pill-group">
                    
                    {/* The Glider */}
                    <div 
                        className="admin-staffmanagement-pill-glider"
                        style={{ left: gliderStyle.left, width: gliderStyle.width }}
                    />

                    {/* The Buttons */}
                    {statusOptions.map((status, index) => (
                        <button
                            key={status}
                            ref={el => pillsRef.current[index] = el} // Store ref
                            onClick={() => setFilterStatus(status)}
                            className={`admin-staffmanagement-pill-btn ${filterStatus === status ? 'active' : ''}`}
                        >
                            {status === 'All' ? 'All Status' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* ROW 2: DROPDOWNS */}
            <div className="admin-staffmanagement-filter-controls-row">
                <div className="admin-staffmanagement-filter-group">
                    <label className="admin-staffmanagement-filter-label">Staff Role</label>
                    <select 
                        value={filterRole} 
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="admin-staffmanagement-filter-select"
                    >
                        <option value="All">All Roles</option>
                        <option value="APN">APN</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>

                <div className="admin-staffmanagement-filter-group">
                    <label className="admin-staffmanagement-filter-label">Service Unit</label>
                    <select 
                        value={filterService} 
                        onChange={(e) => setFilterService(e.target.value)}
                        className="admin-staffmanagement-filter-select"
                    >
                        <option value="All">All Services</option>
                        {serviceOptions.map(svc => (
                            <option key={svc} value={svc}>{svc}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        <div className="admin-staffmanagement-table-card">
          {/* Table Header */}
          <div className="admin-staffmanagement-table-header admin-staffmanagement-grid-layout">
            <div>Staff ID</div>
            <div>Full Name</div>
            <div>Service</div>
            <div>Contact</div>
            <div>Email</div>
            <div>Role</div>
            <div>Actions</div>
          </div>

          {isLoading ? (
            <div className="admin-staffmanagement-loading-state">Loading...</div>
          ) : (
            currentStaff.length > 0 ? (
                currentStaff.map((row) => {
                const isTargetAdmin = row.role === 'ADMIN';
                const canEdit = currentUserRole === 'SUPERADMIN' || !isTargetAdmin;
                const displayName = row.fullName.length > 20 ? row.fullName.substring(0, 20) + '...' : row.fullName;

                return (
                    <div key={row.staffId} className="admin-staffmanagement-table-row admin-staffmanagement-grid-layout">
                        <div>{row.staffId}</div>
                        <div className="admin-staffmanagement-text-medium" title={row.fullName}>{displayName}</div>
                        <div><span className="admin-staffmanagement-service-badge">{row.service}</span></div>
                        <div>{row.contact || '---'}</div>
                        <div className="admin-staffmanagement-table-cell-email" title={row.email}>{row.email}</div>
                        <div>{row.role}</div>
                        
                        <div className="admin-staffmanagement-action-buttons">
                            <button onClick={() => handleViewClick(row)} className="admin-staffmanagement-btn-icon" title="View Details"><EyeIcon /></button>
                            {canEdit && <button onClick={() => handleEditClick(row)} className="admin-staffmanagement-btn-icon" title="Edit Staff"><PencilIcon /></button>}
                        </div>
                    </div>
                );
                })
            ) : (
                <div className="admin-staffmanagement-empty-state">
                    No staff members found matching the selected filters.
                </div>
            )
          )}

          {/* Pagination */}
          {filteredStaff.length > 0 && (
            <div className="admin-staffmanagement-pagination-container">
              <div className="admin-staffmanagement-pagination-controls">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="admin-staffmanagement-btn-pagination">«</button>
                <button onClick={handlePrevPage} disabled={currentPage === 1} className="admin-staffmanagement-btn-pagination">‹</button>
                <span className="admin-staffmanagement-pagination-text">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStaff.length)} of {filteredStaff.length}</span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages} className="admin-staffmanagement-btn-pagination">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="admin-staffmanagement-btn-pagination">»</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- EDIT / VIEW MODAL --- */}
      {showModal && (
        <div className="admin-staffmanagement-modal-overlay">
          <div className="admin-staffmanagement-modal-content">
            <h2 className="admin-staffmanagement-modal-title">
              {isEditing ? 'Edit Staff Details' : 'Staff Details'}
            </h2>
            <div className="admin-staffmanagement-form-stack">
              <div className="admin-staffmanagement-input-group">
                  <label className="admin-staffmanagement-input-label">Full Name</label>
                  <input name="full_name" value={formData.full_name} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control" />
              </div>
              <div className="admin-staffmanagement-input-group">
                  <label className="admin-staffmanagement-input-label">Email</label>
                  <input name="email" type="email" value={formData.email} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control" />
              </div>
              <div className="admin-staffmanagement-input-group">
                  <label className="admin-staffmanagement-input-label">Contact Number</label>
                  <input name="contact" type="text" value={formData.contact} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control" placeholder="+65 1234 5678" />
              </div>
              <div className="admin-staffmanagement-input-group">
                <label className="admin-staffmanagement-input-label">Service Unit</label>
                <select name="service" value={formData.service} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control">
                    <option value="">Select Service</option>
                    {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="admin-staffmanagement-input-group">
                <label className="admin-staffmanagement-input-label">Account Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="admin-staffmanagement-input-group">
                <label className="admin-staffmanagement-input-label">Home Ward</label>
                <select name="ward_id" value={formData.ward_id || ''} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control">
                  <option value="">No Home Ward (Floating)</option>
                    {wardOptions.map(ward => (
                  <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>
                      ))}
                </select>
              </div>
              {currentUserRole === 'SUPERADMIN' && (
                <div className="admin-staffmanagement-input-group">
                    <label className="admin-staffmanagement-input-label">Password</label>
                    <input name="password" type="text" value={formData.password} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control" placeholder="Enter new password" />
                </div>
              )}
              <div className="admin-staffmanagement-input-group">
                  <label className="admin-staffmanagement-input-label">Avatar URL</label>
                  <input name="avatar_url" type="text" value={formData.avatar_url} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control" />
              </div>
              {currentUserRole === 'SUPERADMIN' && (
                <div className="admin-staffmanagement-input-group">
                    <label className="admin-staffmanagement-input-label">Role</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} disabled={!isEditing} className="admin-staffmanagement-form-control">
                        <option value="APN">APN</option>
                        <option value="ADMIN">ADMIN</option>
                    </select>
                </div>
              )}
            </div>
            
            <div className="admin-staffmanagement-modal-actions">
              <div>{isEditing && <button onClick={handleDeleteClick} className="admin-staffmanagement-btn-delete">Delete Account</button>}</div>
              <div className="admin-staffmanagement-modal-actions-right">
                <button onClick={handleCloseModal} className="admin-staffmanagement-btn-cancel">Close</button>
                {isEditing && <button onClick={handleUpdate} className="admin-staffmanagement-btn-save">Save Changes</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {showCreate && canCreateStaff && (
        <div className="admin-staffmanagement-modal-overlay">
          <div className="admin-staffmanagement-modal-content admin-staffmanagement-create-mode">
            <div className="admin-staffmanagement-modal-title">Create New Staff Account</div>
            <div className="admin-staffmanagement-form-stack">
              {[
                { label: 'Full name', field: 'full_name', type: 'text' },
                { label: 'Contact', field: 'contact', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field} className="admin-staffmanagement-input-group">
                  <div className="admin-staffmanagement-input-label">{label}</div>
                  <input type={type} value={createForm[field]} onChange={handleChangeCreate(field)} className="admin-staffmanagement-form-control" />
                </div>
              ))}
              
              <div className="admin-staffmanagement-input-group">
                <div className="admin-staffmanagement-input-label">Service Unit</div>
                <select value={createForm.service} onChange={handleChangeCreate('service')} className="admin-staffmanagement-form-control">
                    <option value="">Select Service</option>
                    {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="admin-staffmanagement-input-group">
                <div className="admin-staffmanagement-input-label">Staff Role</div>
                <select value={createForm.role} onChange={handleChangeCreate('role')} className="admin-staffmanagement-form-control">
                  <option value="">Select a role</option>
                  {visibleRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            
            <div className="admin-staffmanagement-modal-actions admin-staffmanagement-align-right">
              <button onClick={() => setShowCreate(false)} className="admin-staffmanagement-btn-cancel">Cancel</button>
              <button onClick={handleSubmitCreate} disabled={!isCreateValid} className="admin-staffmanagement-btn-save">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {showDeleteConfirm && (
        <div className="admin-staffmanagement-modal-overlay">
          <div className="admin-staffmanagement-modal-content admin-staffmanagement-delete-mode">
            <h3 className="admin-staffmanagement-modal-title">Confirm Deletion</h3>
            <p className="admin-staffmanagement-text-muted">Are you sure? <span className="admin-staffmanagement-text-danger">This action is irreversible.</span></p>
            
            <div className="admin-staffmanagement-modal-actions admin-staffmanagement-align-center">
              <button onClick={() => setShowDeleteConfirm(false)} className="admin-staffmanagement-btn-cancel admin-staffmanagement-btn-fixed">Cancel</button>
              <button onClick={executeDelete} className="admin-staffmanagement-btn-delete admin-staffmanagement-btn-fixed">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
const EyeIcon = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>);
const PencilIcon = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>);

export default AdminStaffManagementPage;