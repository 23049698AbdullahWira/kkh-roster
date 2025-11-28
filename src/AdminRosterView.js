import React from 'react';
import Navbar from './navbar';

const sampleDays = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 7, label: 'Sun' },
  { day: 8, label: 'Mon' },
  { day: 9, label: 'Tue' },
  { day: 10, label: 'Wed' },
];

const sampleStaff = [
  {
    name: 'Jimmy Tan',
    shifts: ['AM', 'AM', 'PM', 'PM', 'AL', 'AM', 'AM', 'AM', 'P@H', 'AM'],
  },
  {
    name: 'Boris Davies',
    shifts: ['PM', 'PM', 'PM', 'AM', 'AM', 'AL', 'AM', 'AM', 'AM', 'AM'],
  },
  {
    name: 'Clark Evans',
    shifts: ['AL', 'AL', 'AM', 'AM', 'PM', 'AM', 'AM', 'PAS-C', 'AM', 'AM'],
  },
];

function AdminRosterView({
  month = 'December',
  year = 2025,
  onBack,
  onGoHome,
  onGoRoster,
  onGoStaff,
  onGoShift,
}) {
  const title = `${month} Roster ${year}`;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#EDF0F5',
        overflowX: 'auto',
        overflowY: 'auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Navbar
        active="roster"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoStaff={onGoStaff}
        onGoShift={onGoShift}
      />

      <main
        style={{
          maxWidth: 1400,
          margin: '24px auto 40px',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top bar: Back + title + buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            gap: 16,
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
              textAlign: 'center',
              flex: 1,
            }}
          >
            {title}
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              type="button"
              style={{
                padding: '8px 16px',
                background: '#5091CD',
                borderRadius: 68,
                border: 'none',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              Edit Roster
            </button>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                background: '#5091CD',
                borderRadius: 68,
                border: 'none',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              Publish Roster
            </button>
          </div>
        </div>

        {/* Roster grid */}
        <div
          style={{
            width: '100%',
            background: 'white',
            boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              minWidth: 800,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    background: 'white',
                    borderRight: '1px solid #8C8C8C',
                    borderBottom: '1px solid #8C8C8C',
                    padding: 10,
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Nurse Name
                </th>
                {sampleDays.map((d) => (
                  <th
                    key={d.day}
                    style={{
                      borderLeft: '1px solid #8C8C8C',
                      borderBottom: '1px solid #8C8C8C',
                      padding: 6,
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      background: '#F9FAFB',
                    }}
                  >
                    {d.day}
                    <br />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                      {d.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleStaff.map((staff) => (
                <tr key={staff.name}>
                  {/* Name column */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: 'white',
                      borderRight: '1px solid #8C8C8C',
                      borderTop: '1px solid #8C8C8C',
                      borderBottom: '1px solid #8C8C8C',
                      padding: 8,
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {staff.name}
                  </td>

                  {/* Shift cells */}
                  {sampleDays.map((d, idx) => {
                    const code = staff.shifts[idx] || '';
                    let bg = 'white';
                    if (code === 'AM') bg = 'white';
                    else if (code === 'PM') bg = '#0F9468';
                    else if (code === 'AL') bg = '#67E8F9';
                    else if (code === 'P@H') bg = '#A855F7';
                    else if (code === 'PAS-C') bg = '#F472B6';

                    return (
                      <td
                        key={d.day}
                        style={{
                          borderLeft: '1px solid #8C8C8C',
                          borderTop: '1px solid #8C8C8C',
                          borderBottom: '1px solid #8C8C8C',
                          padding: 8,
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          background: bg,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {code}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AdminRosterView;
