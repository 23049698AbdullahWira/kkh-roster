import React, { useState } from 'react';
import Navbar from '../Nav/navbar';

const pendingAccounts = [
  {
    full_name: 'Aaron Wong',
    contact: '8765 4321',
    email: 'aaron.wong@example.com',
    role: 'APN',
    ward: 'CE',
  },
  {
    full_name: 'Boris Davies',
    contact: '8123 4567',
    email: 'boris.davies@example.com',
    role: 'APN',
    ward: '76',
  },
  {
    full_name: 'Clark Evans',
    contact: '8899 1122',
    email: 'clark.evans@example.com',
    role: 'APN',
    ward: 'CE',
  },
  {
    full_name: 'Eva Foster',
    contact: '9001 2233',
    email: 'eva.foster@example.com',
    role: 'ADMIN',
    ward: '-',
  },
];

function AdminNewAccounts({ onBack, onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    contact: '',
    email: '',
    role: '',
    ward: '',
  });

  const totalPending = pendingAccounts.length;

  const handleOpenCreate = () => {
    setCreateForm({
      full_name: '',
      contact: '',
      email: '',
      role: '',
      ward: '',
    });
    setShowCreate(true);
  };

  const handleChange = (field) => (e) => {
    setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmitCreate = async () => {
    // plug in your backend POST here later
    console.log('Creating staff account:', createForm);
    setShowCreate(false);
  };

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
        {/* Top row: Back, title, count + New button */}
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
            New Staff Account
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 16,
                fontWeight: 600,
                marginRight: 8,
              }}
            >
              <span>{totalPending} Accounts Awaiting Approval</span>
              <img
                style={{ width: 24, height: 24 }}
                src="https://placehold.co/24x24"
                alt=""
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                padding: '8px 16px',
                background: '#5091CD',
                color: 'white',
                borderRadius: 20,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + New Staff
            </button>
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
              <div>{row.full_name}</div>
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

          {/* Static pagination */}
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

      {/* Popup overlay + form, following your Figma layout but with inputs */}
      {showCreate && (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 630,
              padding: 38,
              background: '#EDF0F5',
              borderRadius: 9.6,
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 27,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                alignSelf: 'stretch',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  color: 'black',
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                Create New Staff Account
              </div>
            </div>

            <div
              style={{
                alignSelf: 'stretch',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
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

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 18,
              }}
            >
              {[
                { label: 'Full name', field: 'full_name', placeholder: '' },
                { label: 'Contact', field: 'contact', placeholder: '' },
                { label: 'Email', field: 'email', placeholder: '' },
                { label: 'Staff Role', field: 'role', placeholder: '' },
                {
                  label: 'Staff Ward Designation',
                  field: 'ward',
                  placeholder: 'Enter the staff’s appointed ward for duty',
                },
              ].map(({ label, field, placeholder }) => (
                <div
                  key={field}
                  style={{
                    width: 490.1,
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    gap: 17.93,
                  }}
                >
                  <div
                    style={{
                      flex: '1 1 0',
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 5.98,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        color: 'black',
                        fontSize: 16,
                        fontWeight: 500,
                        letterSpacing: 0.24,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        alignSelf: 'stretch',
                        padding: 11.95,
                        background: 'white',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={createForm[field]}
                        onChange={handleChange(field)}
                        placeholder={placeholder}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          fontSize: 11.95,
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 500,
                          letterSpacing: 0.18,
                          color: field === 'ward' ? '#8C8C8C' : '#000',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                alignSelf: 'stretch',
                display: 'inline-flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={handleSubmitCreate}
                style={{
                  width: 121,
                  paddingTop: 6,
                  paddingBottom: 6,
                  background: '#5091CD',
                  boxShadow:
                    '0px 2.99px 18.68px rgba(0, 0, 0, 0.25)',
                  borderRadius: 24,
                  border: 'none',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
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
                  width: 121,
                  paddingTop: 6,
                  paddingBottom: 6,
                  background: '#EDF0F5',
                  boxShadow:
                    '0px 2.99px 18.68px rgba(0, 0, 0, 0.25)',
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

export default AdminNewAccounts;
