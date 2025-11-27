import React from 'react';
import Navbar from './navbar';

const pendingAccounts = [
  {
    fullName: 'Aaron Wong',
    contact: '8765 4321',
    email: 'aaron.wong@example.com',
    role: 'APN',
    ward: 'CE',
  },
  {
    fullName: 'Boris Davies',
    contact: '8123 4567',
    email: 'boris.davies@example.com',
    role: 'APN',
    ward: '76',
  },
  {
    fullName: 'Clark Evans',
    contact: '8899 1122',
    email: 'clark.evans@example.com',
    role: 'APN',
    ward: 'CE',
  },
  {
    fullName: 'Eva Foster',
    contact: '9001 2233',
    email: 'eva.foster@example.com',
    role: 'ADMIN',
    ward: '-',
  },
];

function AdminNewAccounts({ onBack, onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  const totalPending = pendingAccounts.length;

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
        {/* Top row: Back, title, count */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {/* Back button */}
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
            New Staff Account
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <span>{totalPending} Accounts Awaiting Approval</span>
            <img
              style={{ width: 24, height: 24 }}
              src="https://placehold.co/24x24"
              alt=""
            />
          </div>
        </div>

        {/* Table header */}
        <div
          style={{
            background: 'white',
            borderRadius: '10px 10px 0 0',
            border: '1px solid #E6E6E6',
            borderBottom: 'none',
            display: 'grid',
            gridTemplateColumns: '2fr 1.3fr 2fr 1fr 1fr 1.1fr',
            alignItems: 'center',
            height: 56,
            padding: '0 16px',
            boxSizing: 'border-box',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          <div>Full Name</div>
          <div>Contact</div>
          <div>Email</div>
          <div>Role</div>
          <div>Ward</div>
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
          {pendingAccounts.map((row, idx) => (
            <div
              key={row.email}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.3fr 2fr 1fr 1fr 1.1fr',
                alignItems: 'center',
                padding: '10px 16px',
                boxSizing: 'border-box',
                fontSize: 14,
                borderTop: idx === 0 ? 'none' : '1px solid #E6E6E6',
              }}
            >
              <div>{row.fullName}</div>
              <div>{row.contact}</div>
              <div>{row.email}</div>
              <div>{row.role}</div>
              <div>{row.ward}</div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                {/* Approve */}
                <button
                  type="button"
                  style={{
                    width: 34,
                    height: 34,
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
                      width: 14,
                      height: 10,
                      borderLeft: '3px solid #00AE06',
                      borderBottom: '3px solid #00AE06',
                      transform: 'rotate(-45deg)',
                    }}
                  />
                </button>

                {/* Reject */}
                <button
                  type="button"
                  style={{
                    width: 34,
                    height: 34,
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
                      width: 14,
                      height: 14,
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

          {/* Static pagination footer */}
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
            <span style={{ fontSize: 14, color: '#656575' }}>
              1–{totalPending} of {totalPending}
            </span>
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

export default AdminNewAccounts;
