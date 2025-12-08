import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar.js';

function AdminStaffManagementPage({ onGoHome, onGoRoster, onGoStaff, onGoShift, onGoNewStaffAccounts, onGoManageLeave }) {
  
  // 1. STATE: Stores the list of staff
  const [staffRows, setStaffRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. HELPER: Determine colors based on status
  const getStatusStyle = (status) => {
    // Normalize text to lowercase to avoid case-sensitive bugs (e.g. "Active" vs "active")
    const lowerStatus = status ? status.toLowerCase() : '';

    if (lowerStatus === 'on-duty') return { color: '#199325', bg: '#DCFCE7' }; // Green
    if (lowerStatus === 'leave') return { color: '#B91C1C', bg: '#FEE2E2' };   // Red
    if (lowerStatus === 'day-off') return { color: '#B8B817', bg: '#FEF9C3' }; // Yellow
    
    // Default (e.g., "Active" or unknown)
    return { color: '#5091CD', bg: '#E1F0FF' }; // Blueish default
  };

  // 3. FETCH: Get data from Backend
  useEffect(() => {
    fetch('http://localhost:5000/users')
      .then(res => res.json())
      .then(data => {
        console.log("Raw DB Data:", data); 

        // 4. MAPPING: Convert DB columns to UI format
        const formattedStaff = data.map(user => {
          const style = getStatusStyle(user.status);
          
          return {
            // UI Name      :   Database Column Name
            fullName:       user.full_name,       // <--- CRITICAL UPDATE
            staffId:        user.user_id,         // <--- CRITICAL UPDATE
            email:          user.email,           // <--- CRITICAL UPDATE
            role:           user.role || 'Staff', // <--- CRITICAL UPDATE
            status:         user.status || 'Active', // <--- CRITICAL UPDATE
            
            // These columns don't exist in the DB table yet, so we use placeholders:
            contact:        '---', 
            service:        '---',
            
            // Apply the colors we calculated above
            statusColor:    style.color,
            statusBg:       style.bg,
          };
        });

        setStaffRows(formattedStaff);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching staff:", err);
        setIsLoading(false);
      });
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
              onClick={onGoNewStaffAccounts}
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
            gridTemplateColumns: '2fr 1.3fr 1.4fr 2fr 1.5fr 1fr 1fr 0.8fr',
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
             <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
               Loading database data...
             </div>
          ) : staffRows.length === 0 ? (
             <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
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
                borderTop: idx === 0 ? 'none' : '1px solid #E6E6E6',
              }}
            >
              <div>{row.fullName}</div>
              <div>{row.staffId}</div>
              <div>{row.contact}</div>
              <div style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px'}}>
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
                {/* Placeholder Action Buttons */}
                <div style={{ width: 30, height: 30, background: '#EDF0F5', borderRadius: 8, cursor: 'pointer' }} />
                <div style={{ width: 30, height: 30, background: '#EDF0F5', borderRadius: 8, cursor: 'pointer' }} />
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
    </div>
  );
}

export default AdminStaffManagementPage;