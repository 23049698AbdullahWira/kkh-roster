import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar.js';

function AdminStaffManagementPage({
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
  onGoNewStaffAccounts, // now unused
  onGoManageLeave,
  currentUserRole = {currentUserRole}, // e.g. "SUPERADMIN", "ADMIN", etc.
}) {
  // 1. STATE: staff list
  const [staffRows, setStaffRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // dropdown options
  const [roleOptions, setRoleOptions] = useState([]);

  // 2. STATE: popup create-staff form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    contact: '',
    email: '',
    role: '',
    profile_picture: null, // optional
  });

  const handleChangeCreate = (field) => (e) => {
    if (field === 'profile_picture') {
      setCreateForm((prev) => ({
        ...prev,
        profile_picture: e.target.files[0] || null,
      }));
    } else {
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));
    }
  };

  const handleSubmitCreate = async () => {
    const [firstName, ...restName] = createForm.full_name.trim().split(' ');
    const lastName = restName.join(' ');

    const payload = {
      firstName: firstName || createForm.full_name,
      lastName: lastName || '',
      email: createForm.email,
      phone: createForm.contact,
      password: 'Temp1234!',        // adjust as needed
      role: createForm.role || 'staff',
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

      // Close popup
      setShowCreate(false);

      // Refetch staff list so new staff appears
      setIsLoading(true);
      const resUsers = await fetch('http://localhost:5000/users');
      const dataUsers = await resUsers.json();

      const formattedStaff = dataUsers.map((user) => {
        const style = getStatusStyle(user.status);

        return {
          fullName: user.full_name,
          staffId: user.user_id,
          email: user.email,
          role: user.role || 'Staff',
          status: user.status || 'Active',
          contact: user.contact || '---',
          service: '---',
          statusColor: style.color,
          statusBg: style.bg,
        };
      });

      setStaffRows(formattedStaff);
      setIsLoading(false);

      // Reset form
      setCreateForm({
        full_name: '',
        contact: '',
        email: '',
        role: '',
        profile_picture: null,
      });
    } catch (err) {
      console.error('Error creating staff:', err);
      alert('Unable to connect to server. Please try again later.');
      setIsLoading(false);
    }
  };

  const isCreateValid =
    createForm.full_name.trim() &&
    createForm.contact.trim() &&
    createForm.email.trim() &&
    createForm.role.trim();

  // 3. HELPER: status style
  const getStatusStyle = (status) => {
    const lowerStatus = status ? status.toLowerCase() : '';

    if (lowerStatus === 'on-duty') return { color: '#199325', bg: '#DCFCE7' };
    if (lowerStatus === 'leave') return { color: '#B91C1C', bg: '#FEE2E2' };
    if (lowerStatus === 'day-off') return { color: '#B8B817', bg: '#FEF9C3' };

    return { color: '#5091CD', bg: '#E1F0FF' };
  };

  const canCreateStaff = currentUserRole === 'SUPERADMIN';

  // 4. FETCH: users + role data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // fetch staff
        const resUsers = await fetch('http://localhost:5000/users');
        const dataUsers = await resUsers.json();

        const formattedStaff = dataUsers.map((user) => {
          const style = getStatusStyle(user.status);

          return {
            fullName: user.full_name,
            staffId: user.user_id,
            email: user.email,
            role: user.role || 'Staff',
            status: user.status || 'Active',
            contact: user.contact || '---',
            service: '---',
            statusColor: style.color,
            statusBg: style.bg,
          };
        });

        setStaffRows(formattedStaff);

        // fetch role enum options
        const resRoles = await fetch('http://localhost:5000/roles');
        const rolesData = await resRoles.json(); // e.g. ["admin","staff","manager"]
        setRoleOptions(rolesData);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#EDF0F5',
        overflowX: 'hidden',
        overflowY: 'auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Navbar
        active="home"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoStaff={onGoStaff}
        onGoShift={onGoShift}
      />

      {/* MAIN CONTENT */}
      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto 40px',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Title + buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
            All Staff Members
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={onGoManageLeave}
              style={{
                padding: '10px 24px',
                background: '#5091CD',
                borderRadius: 68,
                border: 'none',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              Manage Leave
            </button>
            <button
              type="button"
              onClick={canCreateStaff ? () => setShowCreate(true) : undefined}
              disabled={!canCreateStaff}
              style={{
                padding: '10px 24px',
                background: canCreateStaff ? '#5091CD' : '#A9C3E0',
                borderRadius: 68,
                border: 'none',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: canCreateStaff ? 'pointer' : 'not-allowed',
                opacity: canCreateStaff ? 1 : 0.7,
              }}
              title={
                canCreateStaff
                  ? 'Create a new staff account'
                  : 'Only SUPERADMIN can create staff accounts'
              }
            >
              New Staff Account
            </button>
          </div>
        </div>

        {/* TABLE HEADER */}
        <div
          style={{
            background: 'white',
            borderRadius: '10px 10px 0 0',
            border: '1px solid #E6E6E6',
            borderBottom: 'none',
            display: 'grid',
            gridTemplateColumns:
              '2fr 1.3fr 1.4fr 2fr 1.5fr 1fr 1fr 0.8fr',
            alignItems: 'center',
            height: 56,
            padding: '0 16px',
            boxSizing: 'border-box',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          <div>Full Name</div>
          <div>Staff ID</div>
          <div>Contact</div>
          <div>Email</div>
          <div>Status</div>
          <div>Role</div>
          <div>Service</div>
          <div>Actions</div>
        </div>

        {/* TABLE BODY */}
        <div
          style={{
            background: 'white',
            borderRadius: '0 0 10px 10px',
            border: '1px solid #E6E6E6',
            borderTop: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              Loading database data...
            </div>
          ) : staffRows.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              No staff found in database.
            </div>
          ) : (
            staffRows.map((row, idx) => (
              <div
                key={row.staffId}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '2fr 1.3fr 1.4fr 2fr 1.5fr 1fr 1fr 0.8fr',
                  alignItems: 'center',
                  padding: '12px 16px',
                  boxSizing: 'border-box',
                  fontSize: 14,
                  borderTop:
                    idx === 0 ? 'none' : '1px solid #E6E6E6',
                }}
              >
                <div>{row.fullName}</div>
                <div>{row.staffId}</div>
                <div>{row.contact}</div>
                <div
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '10px',
                  }}
                >
                  {row.email}
                </div>
                <div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: row.statusBg,
                      color: row.statusColor,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <div>{row.role}</div>
                <div>{row.service}</div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      background: '#EDF0F5',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      background: '#EDF0F5',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            ))
          )}

          {/* Pagination Footer */}
          <div
            style={{
              height: 60,
              background: 'white',
              borderTop: '1px solid #EEE',
              borderRadius: '0 0 10px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, color: '#656575' }}>
              Showing {staffRows.length} members
            </span>
          </div>
        </div>
      </main>

      {/* POPUP: Create Staff Account */}
      {showCreate && canCreateStaff && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            boxSizing: 'border-box',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              background: '#EDF0F5',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              padding: 24,
              gap: 16,
            }}
          >
            {/* Title */}
            <div>
              <div
                style={{
                  color: 'black',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                Create New Staff Account
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <div
                style={{
                  color: 'black',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Please enter the details below.
              </div>
            </div>

            {/* Fields */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {[
                { label: 'Full name', field: 'full_name', type: 'text' },
                { label: 'Contact', field: 'contact', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
              ].map(({ label, field, type }) => (
                <div
                  key={field}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      color: 'black',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </div>
                  <input
                    type={type}
                    value={createForm[field]}
                    onChange={handleChangeCreate(field)}
                    style={{
                      padding: '10px 12px',
                      background: 'white',
                      borderRadius: 6,
                      border: '1px solid #D4D4D4',
                      fontSize: 14,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                </div>
              ))}

              {/* Role dropdown */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    color: 'black',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Staff Role
                </div>
                <select
                  value={createForm.role}
                  onChange={handleChangeCreate('role')}
                  style={{
                    padding: '10px 12px',
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <option value="">Select a role</option>
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile picture */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    color: 'black',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Profile Picture (optional)
                </div>
                <div
                  style={{
                    height: 96,
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: '#E9E9E9',
                      borderRadius: 8,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      color: '#8C8C8C',
                    }}
                  >
                    Click to upload
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: createForm.profile_picture ? '#2563EB' : '#888',
                      fontWeight: 500,
                    }}
                  >
                    {createForm.profile_picture
                      ? createForm.profile_picture.name
                      : 'No file selected'}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleChangeCreate('profile_picture')}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={handleSubmitCreate}
                disabled={!isCreateValid}
                style={{
                  width: 120,
                  padding: '8px 12px',
                  background: isCreateValid ? '#5091CD' : '#A9C3E0',
                  opacity: isCreateValid ? 1 : 0.6,
                  cursor: isCreateValid ? 'pointer' : 'not-allowed',
                  boxShadow: '0px 3px 19px rgba(0, 0, 0, 0.25)',
                  borderRadius: 24,
                  border: 'none',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: 0.21,
                }}
              >
                Create
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  width: 120,
                  padding: '8px 12px',
                  background: '#EDF0F5',
                  boxShadow: '0px 3px 19px rgba(0, 0, 0, 0.25)',
                  borderRadius: 24,
                  border: 'none',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'black',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: 0.21,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStaffManagementPage;
