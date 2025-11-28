// src/UserShiftPref.js
import React from 'react';
import UserNavbar from './UserNavbar.js';

const monthMeta = {
  title: 'February Roster 2026',
};

const nurses = ['Jimmy', 'Tiffany', 'Vanessa', 'Robert'];

const days = Array.from({ length: 14 }, (_, i) => ({
  date: i + 1,
  label: `${i + 1} Feb`,
}));

// static sample preferences: '-', 'AM', 'PM', 'NNJ', 'RD'
const prefCodes = {
  Jimmy:   ['AM', 'AM', '-', '-', 'PM', '-', '-', 'AM', '-', '-', 'PM', '-', '-', '-'],
  Tiffany: ['-', '-', 'AM', 'AM', '-', '-', 'PM', '-', '-', 'AM', '-', '-', 'PM', '-'],
  Vanessa: ['PM', 'PM', 'PM', '-', '-', 'AM', 'AM', '-', '-', '-', 'PM', '-', '-', '-'],
  Robert:  ['-', '-', '-', 'NNJ', 'NNJ', '-', '-', '-', 'RD', 'RD', '-', '-', '-', '-'],
};

const codeColors = {
  AM:  '#BFDBFE',
  PM:  '#C7D2FE',
  NNJ: '#FBBF24',
  RD:  '#FEF3C7',
  '-':  'white',
};

function UserShiftPref({
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
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
        active="preference"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      {/* Header row: Back + title */}
      <div
        style={{
          maxWidth: 1560,
          margin: '20px auto 6px',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          position: 'relative',
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
            position: 'relative',
            zIndex: 2,
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
            fontSize: 22,
            fontWeight: 900,
            pointerEvents: 'none',
          }}
        >
          {monthMeta.title}
        </div>

        <div style={{ width: 110 }} />
      </div>

      {/* Preference grid */}
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
                    const code = prefCodes[nurse][dayIdx] || '-';
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

export default UserShiftPref;
