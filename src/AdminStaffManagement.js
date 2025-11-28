import React from 'react';
import Navbar from './navbar.js';

function AdminStaffManagementPage({ onGoHome, onGoRoster, onGoStaff, onGoShift, onGoNewStaffAccounts, onGoManageLeave }) {
  const staffRows = [
    {
      fullName: 'Boris Davies',
      staffId: '12345678',
      contact: '87654321',
      email: 'example123@mail.com',
      status: 'Day-Off',
      statusColor: '#B8B817',
      statusBg: '#FEF9C3',
      role: 'APN',
      service: 'CE',
    },
    {
      fullName: 'Clark Evans',
      staffId: '23456789',
      contact: '81234567',
      email: 'clark.evans@mail.com',
      status: 'On-Duty',
      statusColor: '#199325',
      statusBg: '#DCFCE7',
      role: 'APN',
      service: 'CE',
    },
    {
      fullName: 'Janet Gilburt',
      staffId: '34567890',
      contact: '87651234',
      email: 'janet.gilburt@mail.com',
      status: 'Leave',
      statusColor: '#B91C1C',
      statusBg: '#FEE2E2',
      role: 'RN',
      service: 'RRT',
    },
  ];

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
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              margin: 0,
            }}
          >
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
    <img
      style={{ width: 20, height: 20 }}
      src="https://placehold.co/24x24"
      alt=""
    />
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
  <span
    style={{
      width: 18,
      height: 18,
      background: 'white',
      borderRadius: 4,
      display: 'inline-block',
    }}
  />
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
          {staffRows.map((row, idx) => (
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
              <div>{row.email}</div>
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
                  }}
                />
                <div
                  style={{
                    width: 30,
                    height: 30,
                    background: '#EDF0F5',
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          ))}

          {/* Pagination (static) */}
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
            <button
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #EEE',
                background: 'rgba(255,255,255,0.4)',
              }}
            >
              «
            </button>
            <button
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #EEE',
                background: 'white',
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: 14, color: '#656575' }}>1–3 of 3</span>
            <button
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #EEE',
                background: 'white',
              }}
            >
              ›
            </button>
            <button
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #EEE',
                background: 'white',
              }}
            >
              »
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminStaffManagementPage;
