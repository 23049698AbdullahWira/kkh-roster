import React from 'react';
import Navbar from '../Nav/navbar.js';

const activityItems = [
  '5m ago, November Roster Draft Approved by Admin Janet.',
  '5m ago, November Roster Draft Approved by Admin Janet.',
  '5m ago, November Roster Draft Approved by Admin Janet.',
  '23m ago, New Preference added to December Roster Draft by Tim Smith.',
  '23m ago, New Preference added to December Roster Draft by Tim Smith.',
  '23m ago, New Preference added to December Roster Draft by Tim Smith.',
  '1h 05m ago, December preference window opened by Admin Janet.',
  '1h 05m ago, December preference window opened by Admin Janet.',
];

const criticalAlerts = [
  {
    title: 'WARNING:',
    text: 'Understaffed RRT PM Shift on 18 Oct (1 RRT Short)',
    barColor: '#FF2525',
  },
  {
    title: 'CONTRADICTING SHIFT:',
    text: 'Shift clash on PM Shift on 26 Oct (2 PM Shift on 76)',
    barColor: '#F0DC00',
  },
];

const todoItems = [
  {
    header: 'New Account Requested – By 23 Oct',
    title: '3 New User Accounts Awaiting Approval',
    body: 'Reminded to approve new account for onboarding members of the team.',
  },
  {
    header: 'Published November Roster – By 29 Oct',
    title: 'Roster Publish.',
    body: 'Reminded to publish November roster to all.',
  },
];

const quickLinks = [
  { label: 'Start New\nRoster', disabled: false },
  { label: 'Add\nNew Staff', disabled: false },
  { label: 'Manage\nLeave', disabled: false },
  { label: 'Staff\nPreferences', disabled: false },
  { label: 'Add New\nLinks', disabled: true },
];

function AdminHome({ onGoRoster, onGoStaff, onGoHome, onGoShift }) {
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
        {/* Welcome */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          Welcome back, Janet!
        </h1>

        {/* Roster Status card */}
        <section
          style={{
            background: 'white',
            borderRadius: 10,
            padding: '16px 24px',
            marginBottom: 16,
            boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 12,
            }}
          >
            Roster Status Timeline : November Roster
          </div>
          <div
            style={{
              background: '#EDF0F5',
              borderRadius: 999,
              padding: '8px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800 }}>Preference Open</span>
            <img style={{ width: 24, height: 24 }} src="https://placehold.co/24x24" alt="" />
            <div
              style={{
                flex: 1,
                height: 6,
                background: '#00AE06',
                borderRadius: 999,
                marginRight: 16,
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 800 }}>Reviewing Draft</span>
            <img style={{ width: 24, height: 24 }} src="https://placehold.co/24x24" alt="" />
            <div
              style={{
                flex: 1,
                height: 6,
                background: '#8C8C8C',
                borderRadius: 999,
                marginRight: 16,
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 800 }}>Published Roster</span>
            <img style={{ width: 24, height: 24 }} src="https://placehold.co/24x24" alt="" />
          </div>
        </section>

        {/* TWO COLUMNS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr)',
            gap: 24,
          }}
        >
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Critical Staffing Shortage */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  Critical Staffing Shortage
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, fontWeight: 600 }}>
                  <span>Urgent</span>
                  <div
                    style={{
                      width: 6,
                      height: 20,
                      background: '#FF2525',
                      borderRadius: 12,
                    }}
                  />
                  <span>Action Needed</span>
                  <div
                    style={{
                      width: 6,
                      height: 20,
                      background: '#F0DC00',
                      borderRadius: 12,
                    }}
                  />
                </div>
              </div>

              {criticalAlerts.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#EDF0F5',
                    borderRadius: 8,
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    marginTop: idx === 0 ? 0 : 8,
                  }}
                >
                  <img
                    style={{ width: 30, height: 30, marginRight: 20 }}
                    src="https://placehold.co/35x35"
                    alt=""
                  />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {item.title}
                    <br />
                    {item.text}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 10,
                      background: item.barColor,
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                    }}
                  />
                </div>
              ))}
            </section>

            {/* To-Do List / Action Items */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                To-Do List / Action Items
              </div>

              {todoItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#EDF0F5',
                    borderRadius: 16,
                    overflow: 'hidden',
                    marginBottom: idx === todoItems.length - 1 ? 0 : 12,
                  }}
                >
                  <div
                    style={{
                      background: '#5091CD',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '6px 16px',
                    }}
                  >
                    {item.header}
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        marginBottom: 6,
                      }}
                    >
                      {item.body}
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        fontSize: 14,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      More Info
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Quick Links */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                Quick Links
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                {quickLinks.map((link, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      width: 80,
                    }}
                  >
                    <div
                      style={{
                        width: 78,
                        height: 78,
                        background: link.disabled ? '#8C8C8C' : '#5091CD',
                        borderRadius: 8,
                      }}
                    />
                    <img
                      style={{ width: 40, height: 40 }}
                      src="https://placehold.co/47x47"
                      alt=""
                    />
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {link.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Admin Activity Log */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                height: 360,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Admin Activity Log
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  overflow: 'hidden',
                }}
              >
                {activityItems.map((text, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '6px 0',
                      borderTop: '1px solid #E0E0E0',
                    }}
                  >
                    <img
                      style={{ width: 26, height: 26 }}
                      src="https://placehold.co/33x33"
                      alt=""
                    />
                    <div
                      style={{
                        flex: 1,
                        fontSize: 14,
                      }}
                    >
                      {text}
                    </div>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        background: '#EDF0F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 10,
                          border: '1px solid #5091CD',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#5091CD',
                  cursor: 'pointer',
                }}
              >
                View All
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminHome;

//comment1
