// src/UserRoster.js
import React from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

const monthMeta = {
  title: 'December Roster 2025',
};

const nurses = ['Jimmy', 'Tiffany', 'Vanessa', 'Robert'];

const days = Array.from({ length: 7 }, (_, i) => ({
  date: 21 + i,
  label: `${21 + i} Dec`,
}));

// Simple static roster codes per nurse per day
const rosterCodes = {
  Jimmy:   ['NNJ', 'RD', 'NNJ', 'RD', 'RD', 'RD', 'RD'],
  Tiffany: ['RD', 'RD', 'RD', 'RD', 'RD', 'RD', 'RD'],
  Vanessa: ['AM', 'AM', 'PM', 'DO', 'AM', 'PM', 'DO'],
  Robert:  ['PM', 'PM', 'PM', 'DO', 'AM', 'AM', 'DO'],
};

const codeColors = {
  NNJ: '#FBBF24',
  RD:  '#FEF3C7',
  AM:  '#BFDBFE',
  PM:  '#C7D2FE',
  DO:  '#E5E7EB',
};

function UserRoster({
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout,
}) {
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
      <UserNavbar
        active="roster"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
        onLogout={onLogout}
      />

      {/* Header row with Back and title */}
      <div
        style={{
          maxWidth: 1560,
          margin: '20px auto 6px',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          position: 'relative',       // <-- add
        }}
      >
        <button
  type="button"
          onClick={() => onBack && onBack()}
          style={{
            padding: '8px 20px',
            background: 'white',
            boxShadow: '0 3px 3px rgba(0,0,0,0.18)',
            borderRadius: 60,
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            position: 'relative',      // <-- ensure on top
            zIndex: 2,                 // <-- ensure clickable
  }}
>
  <span
    style={{
      fontSize: 18,
      lineHeight: 1,
    }}
  >
    ←
  </span>
  <span
    style={{
      color: 'black',
      fontSize: 18,
      fontWeight: 600,
    }}
  >
    Back
  </span>
</button>


        <div
          style={{
            flex: 1,
            textAlign: 'center',
            marginLeft: 0,             // simpler centering; avoid overlap
            fontSize: 22,
            fontWeight: 900,
            pointerEvents: 'none',     // title never blocks clicks
          }}
        >
          {monthMeta.title}
        </div>

        <div style={{ width: 110 }} /> {/* spacer to balance back button width */}
      </div>

      {/* Roster table */}
      <div
        style={{
          maxWidth: 1560,
          margin: '0 auto 32px',
          padding: '0 20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            background: 'white',
            boxShadow: '0 3px 3px rgba(0,0,0,0.18)',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex' }}>
            {/* Nurse name column */}
            <div style={{ minWidth: 150 }}>
              <div
                style={{
                  padding: 8,
                  background: 'white',
                  borderTopLeftRadius: 8,
                  borderRight: '1px #8C8C8C solid',
                  borderBottom: '1px #8C8C8C solid',
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Nurse Name
              </div>
              {nurses.map((name, idx) => (
                <div
                  key={name}
                  style={{
                    padding: 8,
                    background: 'white',
                    borderTop: '1px #8C8C8C solid',
                    borderRight: '1px #8C8C8C solid',
                    borderBottom:
                      idx === nurses.length - 1 ? '1px #8C8C8C solid' : 'none',
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
              {days.map((day, dayIdx) => (
                <div key={day.date} style={{ minWidth: 80 }}>
                  {/* Header cell for day */}
                  <div
                    style={{
                      padding: 8,
                      background: '#F3F4F6',
                      borderTop: '1px #8C8C8C solid',
                      borderLeft: '1px #8C8C8C solid',
                      borderRight: '1px #8C8C8C solid',
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {day.label}
                  </div>

                  {/* Body cells for each nurse */}
                  {nurses.map((nurse, nurseIdx) => {
                    const code = rosterCodes[nurse][dayIdx];
                    const bg = codeColors[code] || 'white';
                    const isLastRow = nurseIdx === nurses.length - 1;
                    return (
                      <div
                        key={nurse}
                        style={{
                          padding: 8,
                          background: bg,
                          borderLeft: '1px #8C8C8C solid',
                          borderTop: '1px #8C8C8C solid',
                          borderRight: '1px #8C8C8C solid',
                          borderBottom: isLastRow
                            ? '1px #8C8C8C solid'
                            : 'none',
                          textAlign: 'center',
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {code}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserRoster;
