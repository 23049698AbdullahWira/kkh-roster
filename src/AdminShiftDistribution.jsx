import React from 'react';
import Navbar from './navbar';

const analysisSummary = {
  totalShifts: 63,
  year: 2025,
  shiftType: 'NNJ Clinic',
  targetPerApn: 8,
};

const shiftSummary = [
  { label: 'Total AM Shifts', value: 24, color: '#5091CD' },
  { label: 'Total PM Shifts', value: 21, color: '#FFB020' },
  { label: 'Total Night Shifts', value: 18, color: '#4B5563' },
];

const staffShiftRows = [
  {
    name: 'Boris Davies',
    ph: 2,
    sunday: 3,
    total: 8,
    workloadLabel: 'Balanced',
    workloadColor: '#199325',
  },
  {
    name: 'Clark Evans',
    ph: 1,
    sunday: 1,
    total: 5,
    workloadLabel: 'Below Target',
    workloadColor: '#B8B817',
  },
  {
    name: 'Janet Gilburt',
    ph: 3,
    sunday: 2,
    total: 10,
    workloadLabel: 'Heavy',
    workloadColor: '#B91C1C',
  },
];

function AdminShiftDistributionPage({ onGoHome, onGoRoster, onGoStaff, onGoShift }) {
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
        active="shift"
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
        {/* Title */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          Annual Shift Distribution Analysis
        </h1>

        {/* Summary strip (Total, Year, Shift Type, Target) */}
        <section
          style={{
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            padding: '20px 28px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {/* Total shifts */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500 }}>Total Shifts:</span>
              <span style={{ fontSize: 22, fontWeight: 700 }}>
                {analysisSummary.totalShifts}
              </span>
            </div>

            {/* Year */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500 }}>Analysis Year:</span>
              <div
                style={{
                  padding: '8px 16px',
                  background: '#EDF0F5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {analysisSummary.year} (Current)
                </span>
              </div>
            </div>

            {/* Shift type */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500 }}>Shift Type:</span>
              <div
                style={{
                  padding: '8px 16px',
                  background: '#EDF0F5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 16 }}>{analysisSummary.shiftType}</span>
              </div>
            </div>

            {/* Target count */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500 }}>
                Target Shift Count:
              </span>
              <div
                style={{
                  padding: '8px 16px',
                  background: '#EDF0F5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 500 }}>
                  {analysisSummary.targetPerApn}
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 500, color: '#8C8C8C' }}
                >
                  / APN
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Small cards: AM/PM/Night totals */}
        <section
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          {shiftSummary.map((item) => (
            <div
              key={item.label}
              style={{
                flex: '1 1 160px',
                background: 'white',
                borderRadius: 8,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: item.color,
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </section>

        {/* Staff distribution table */}
        <section>
          {/* Header */}
          <div
            style={{
              background: 'white',
              borderRadius: '10px 10px 0 0',
              border: '1px solid #E6E6E6',
              borderBottom: 'none',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
              alignItems: 'center',
              height: 56,
              padding: '0 16px',
              boxSizing: 'border-box',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <div>Full Name</div>
            <div>PH</div>
            <div>Sunday</div>
            <div>Total</div>
            <div>Workload</div>
          </div>

          {/* Body */}
          <div
            style={{
              background: 'white',
              borderRadius: '0 0 10px 10px',
              border: '1px solid #E6E6E6',
              borderTop: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {staffShiftRows.map((row, idx) => (
              <div
                key={row.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
                  alignItems: 'center',
                  padding: '10px 16px',
                  boxSizing: 'border-box',
                  fontSize: 14,
                  borderTop: idx === 0 ? 'none' : '1px solid #E6E6E6',
                }}
              >
                <div>{row.name}</div>
                <div>{row.ph}</div>
                <div>{row.sunday}</div>
                <div>{row.total}</div>
                <div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: '#EDF0F5',
                      color: row.workloadColor,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {row.workloadLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminShiftDistributionPage;
