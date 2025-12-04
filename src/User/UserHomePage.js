// src/UserHomePage.jsx
import React from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

const todayAssignment = {
  date: '21 November 2025',
  ward: 'RRT - CE',
  message: 'You have been assigned to RRT at CE for AM shift.',
};

const next7Days = [
  {
    date: '22 November 2025',
    code: 'AM - CE',
    message: 'You have been assigned at CE for AM shift.',
    sideColor: '#FFFFFF',
  },
  {
    date: '23 November 2025',
    code: 'PM - CE',
    message: 'You have been assigned at CE for PM shift.',
    sideColor: '#0F9468',
  },
  {
    date: '24 November 2025',
    code: 'DO',
    message: 'You are off today.',
    sideColor: '#FEF3C7',
  },
];

const quickLinks = [
  { label: 'View\nMonthly Roster' },
  { label: 'Shifts\nPreference' },
  { label: 'Apply\nLeave' },
  { label: 'Edit\nProfile' },
  { label: 'Add New\nLinks', disabled: true },
];

const notifications = [
  '21min ago, Shift preference auto-approved.',
  '38m ago, Shift preference approved by Admin.',
  '59m ago, Shift preference rejected by Admin.',
  '1day ago, January 2025 preference window is now opened.',
  '1day ago, New December 2025 roster has been published.',
  '1month ago, You’ve updated your profile.',
  '1month ago, Your account has been successfully created.',
];

const userProfile = {
  name: 'Vanessa',
  joined: '20 Oct 2025',
  timePreference: 'AM, PM',
  certification: 'Senior',
  notes: 'Fluent in Mandarin and Malay.',
};

function UserHomePage({ onGoHome, onGoRoster, onGoShiftPreference, onGoApplyLeave, onGoAccount }) {
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
      <UserNavbar
        active="home"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      <main
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingTop: 30,
          paddingBottom: 40,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 1400,
            paddingLeft: 24,
            paddingRight: 24,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              color: 'black',
              fontSize: 24,
              fontWeight: 900,
              marginBottom: 20,
            }}
          >
            Welcome back, {userProfile.name}!
          </div>

          {/* 3 columns whose widths sum < 1400 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            {/* LEFT COLUMN: Today For You + My Next 7 Days (width ~580) */}
            <div
              style={{
                width: 580,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Today For You */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                <section
                  style={{
                    alignSelf: 'stretch',
                    padding: 18,
                    background: 'white',
                    boxShadow: '0 1.66px 1.33px rgba(0, 0, 0, 0.02)',
                    borderRadius: 9.6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 15,
                  }}
                >
                  <div
                    style={{
                      alignSelf: 'stretch',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        color: 'black',
                        fontSize: 20,
                        fontWeight: 800,
                      }}
                    >
                      Today For You
                    </div>
                  </div>

                  <div
                    style={{
                      alignSelf: 'stretch',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 11,
                    }}
                  >
                    <div
                      style={{
                        alignSelf: 'stretch',
                        padding: '13px 24px',
                        position: 'relative',
                        background: '#EDF0F5',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            color: 'black',
                            fontSize: 20,
                            fontWeight: 700,
                          }}
                        >
                          {todayAssignment.date}
                        </div>
                        <div
                          style={{
                            color: 'black',
                            fontSize: 20,
                            fontWeight: 700,
                          }}
                        >
                          {todayAssignment.ward}
                        </div>
                        <div
                          style={{
                            color: 'black',
                            fontSize: 20,
                            fontWeight: 400,
                          }}
                        >
                          {todayAssignment.message}
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: 0,
                            border: 'none',
                            background: 'none',
                            fontSize: 16,
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginTop: 4,
                          }}
                        >
                          More Info
                        </button>
                      </div>
                      <div
                        style={{
                          width: 12,
                          height: '100%',
                          background: '#0EA5E9',
                          borderTopRightRadius: 8,
                          borderBottomRightRadius: 8,
                          marginLeft: 12,
                        }}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* My Next 7 Days */}
              <section
                style={{
                  alignSelf: 'stretch',
                  padding: 18,
                  background: 'white',
                  boxShadow: '0 1.66px 1.33px rgba(0, 0, 0, 0.02)',
                  borderRadius: 9.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    color: 'black',
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  My Next 7 Days
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  {next7Days.map((item) => (
                    <div
                      key={item.date}
                      style={{
                        padding: '13px 24px',
                        position: 'relative',
                        background: '#EDF0F5',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            color: 'black',
                            fontSize: 20,
                            fontWeight: 700,
                          }}
                        >
                          {item.date}
                        </div>
                        <div
                          style={{
                            color: 'black',
                            fontSize: 20,
                            fontWeight: 700,
                          }}
                        >
                          {item.code}
                        </div>
                        <div
                          style={{
                            color: 'black',
                            fontSize: 20,
                            fontWeight: 400,
                          }}
                        >
                          {item.message}
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: 0,
                            border: 'none',
                            background: 'none',
                            fontSize: 16,
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginTop: 4,
                          }}
                        >
                          More Info
                        </button>
                      </div>
                      <div
                        style={{
                          width: 12,
                          height: '100%',
                          background: item.sideColor,
                          borderTopRightRadius: 8,
                          borderBottomRightRadius: 8,
                          marginLeft: 12,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* MIDDLE COLUMN: Quick Links + Notifications */}
            <div
              style={{
                width: 540,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Quick Links */}
              <section
                style={{
                  padding: 20,
                  background: 'white',
                  boxShadow: '0 1.66px 1.33px rgba(0, 0, 0, 0.02)',
                  borderRadius: 9.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                <div
                  style={{
                    color: 'black',
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  Quick Links
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
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
                        width: 88,
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
                          color: 'black',
                          fontSize: 12,
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

              {/* Notifications */}
              <section
                style={{
                  padding: 18,
                  background: 'white',
                  boxShadow: '0 1.66px 1.33px rgba(0, 0, 0, 0.02)',
                  borderRadius: 9.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 9,
                  position: 'relative',
                  minHeight: 320,
                }}
              >
                <div
                  style={{
                    color: 'black',
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  Notifications
                </div>

                <div
                  style={{
                    paddingBottom: 45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                  }}
                >
                  {notifications.map((text, idx) => (
                    <div
                      key={idx}
                      style={{
                        paddingTop: 6,
                        paddingBottom: 6,
                        borderTop: '1px #8C8C8C solid',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <img
                        style={{ width: 33, height: 33 }}
                        src="https://placehold.co/33x33"
                        alt=""
                      />
                      <div
                        style={{
                          flex: 1,
                          color: 'black',
                          fontSize: 14,
                          fontWeight: 400,
                        }}
                      >
                        {text}
                      </div>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          padding: 8,
                          background: '#EDF0F5',
                          borderRadius: 16,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 11,
                            border: '1px solid #5091CD',
                          }}
                        />
                        <div
                          style={{
                            width: 8,
                            height: 7,
                            border: '1px solid #5091CD',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    height: 40,
                    background: 'white',
                    boxShadow: '0 -2px 4px rgba(0,0,0,0.15)',
                    borderBottomLeftRadius: 9.6,
                    borderBottomRightRadius: 9.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#5091CD',
                  }}
                >
                  View All
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Profile card */}
            <aside
              style={{
                width: 230,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  width: '100%',
                  padding: 20,
                  background: 'white',
                  boxShadow: '0 1.66px 1.33px rgba(0, 0, 0, 0.02)',
                  borderRadius: 9.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <img
                    style={{ width: 120, height: 120, borderRadius: '50%' }}
                    src="https://placehold.co/200x200"
                    alt="Profile"
                  />
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      color: 'black',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {userProfile.name}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <img
                      style={{ width: 20, height: 20 }}
                      src="https://placehold.co/24x24"
                      alt=""
                    />
                    <span>Date Joined:&nbsp;</span>
                    <span style={{ color: '#1565C0' }}>
                      {userProfile.joined}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <img
                      style={{
                        width: 20,
                        height: 20,
                        transform: 'rotate(180deg)',
                        transformOrigin: 'center',
                      }}
                      src="https://placehold.co/24x24"
                      alt=""
                    />
                    <span>Time Preference:&nbsp;</span>
                    <span style={{ color: '#1565C0' }}>
                      {userProfile.timePreference}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <img
                      style={{ width: 20, height: 20 }}
                      src="https://placehold.co/24x24"
                      alt=""
                    />
                    <span>Certification:&nbsp;</span>
                    <span style={{ color: '#1565C0' }}>
                      {userProfile.certification}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <img
                      style={{ width: 20, height: 20 }}
                      src="https://placehold.co/24x24"
                      alt=""
                    />
                    <div>
                      <span>Notes:&nbsp;</span>
                      <span style={{ color: '#1565C0' }}>
                        {userProfile.notes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserHomePage;
