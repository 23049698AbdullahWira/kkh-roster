import React from 'react';
import Navbar from '../Nav/navbar';

const leaveRows = [
  {
    fullName: 'Boris Davies',
    staffId: '12345678',
    contact: '8765 4321',
    email: 'boris.davies@example.com',
    type: 'Annual Leave',
    period: '12–16 Dec 2025',
    status: 'Approved',
    statusColor: '#199325',
  },
  {
    fullName: 'Clark Evans',
    staffId: '23456789',
    contact: '8123 4567',
    email: 'clark.evans@example.com',
    type: 'Medical Leave',
    period: '03–05 Nov 2025',
    status: 'Pending',
    statusColor: '#B8B817',
  },
  {
    fullName: 'Janet Gilburt',
    staffId: '34567890',
    contact: '8899 0011',
    email: 'janet.gilburt@example.com',
    type: 'Emergency Leave',
    period: '28–29 Oct 2025',
    status: 'Rejected',
    statusColor: '#B91C1C',
  },
];

function AdminManageLeave({
  onBack,
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
}) {
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
        active="staff"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoStaff={onGoStaff}
        onGoShift={onGoShift}
      />

      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto 40px',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top row: title + back */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              background: 'white',
              borderRadius: 68,
              border: '1px solid #DDDDDD',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderLeft: '2px solid black',
                borderBottom: '2px solid black',
                transform: 'rotate(45deg)',
                marginRight: 2,
              }}
            />
            Back
          </button>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              margin: 0,
            }}
          >
            Manage Leave
          </h1>

          <div style={{ width: 160 }} /> {/* spacer */}
        </div>

        {/* Table header */}
        <div
          style={{
            background: 'white',
            borderRadius: '10px 10px 0 0',
            border: '1px solid #E6E6E6',
            borderBottom: 'none',
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 1.2fr 2fr 1.8fr 1.2fr 1fr',
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
          <div>Leave Type / Period</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {/* Table body */}
        <div
          style={{
            background: 'white',
            borderRadius: '0 0 10px 10px',
            border: '1px solid #E6E6E6',
            borderTop: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {leaveRows.map((row, idx) => (
            <div
              key={row.staffId + row.period}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '2fr 1.2fr 1.2fr 2fr 1.8fr 1.2fr 1fr',
                alignItems: 'center',
                padding: '10px 16px',
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
                <div style={{ fontWeight: 600 }}>{row.type}</div>
                <div style={{ fontSize: 13, color: '#555' }}>{row.period}</div>
              </div>
              <div>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: '#EDF0F5',
                    color: row.statusColor,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {row.status}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                {/* Approve button */}
                <button
                  type="button"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: 'none',
                    background: 'rgba(0, 174, 6, 0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 8,
                      borderLeft: '3px solid #00AE06',
                      borderBottom: '3px solid #00AE06',
                      transform: 'rotate(-45deg)',
                    }}
                  />
                </button>

                {/* Reject button */}
                <button
                  type="button"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: 'none',
                    background: 'rgba(255, 37, 37, 0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        width: '100%',
                        height: 2,
                        background: '#FF2525',
                        transform: 'rotate(45deg)',
                        transformOrigin: 'center',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        width: '100%',
                        height: 2,
                        background: '#FF2525',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center',
                      }}
                    />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default AdminManageLeave;
