import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

function AdminShiftDistributionPage({ onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  // --- 1. STATE ---
  const [shiftData, setShiftData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [year, setYear] = useState(2025);
  const [shiftType, setShiftType] = useState('NNJ Clinic');
  const [target, setTarget] = useState(8);

  // --- 2. HELPER: Calculate Workload Status ---
  const getWorkloadStatus = (total, targetVal) => {
    const diff = total - targetVal;
    if (diff === 0) return { label: 'Balanced', color: '#199325', bg: '#dcfce7' }; // Green
    if (diff > 0) return { label: `Heavy (+${diff})`, color: '#B91C1C', bg: '#fee2e2' }; // Red
    return { label: `Light (${diff})`, color: '#B8B817', bg: '#fef9c3' }; // Yellow
  };

  // --- 3. FETCH DATA ---
  useEffect(() => {
    setIsLoading(true);
    
    // Simulating API fetch. Replace URL with your actual endpoint:
    fetch(`http://localhost:5000/shifts?year=${year}&type=${shiftType}`)
    
    // For now, using a timeout to simulate network request with mock data
    setTimeout(() => {
        // Mock Response Data based on your DB schema
        const mockResponse = [
            { user_id: 3, full_name: 'Janet Gilburt', role: 'APN', ph_count: 3, sun_count: 2, total_count: 10 },
            { user_id: 4, full_name: 'Aaron Wong', role: 'Senior RN', ph_count: 2, sun_count: 7, total_count: 9 },
            { user_id: 5, full_name: 'Eva Foster', role: 'CNS', ph_count: 2, sun_count: 7, total_count: 9 },
        ];

        const formattedData = mockResponse.map(item => ({
          id: item.user_id,
          name: item.full_name,
          role: item.role,
          ph: item.ph_count, 
          sunday: item.sun_count,
          total: item.total_count
        }));

        setShiftData(formattedData);
        setIsLoading(false);
    }, 800);

  }, [year, shiftType]); 

  // --- 4. CALCULATE SUMMARY METRICS ---
  const totalShifts = shiftData.reduce((sum, row) => sum + row.total, 0);
  const unbalancedCount = shiftData.filter(row => (row.total - target) !== 0).length;

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
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 16,
            marginTop: 24,
            color: '#111827',
          }}
        >
          Annual Shift Distribution Analysis
        </h1>

        {/* --- INTERACTIVE FILTER SECTION --- */}
        <section
          style={{
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            padding: '24px 28px',
            marginBottom: 24,
          }}
        >
          <p style={{ marginBottom: 20, fontSize: 14, fontWeight: 500, color: '#374151' }}>
            Adjust parameters to recalculate fairness report.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'end',
              gap: 24,
            }}
          >
            {/* Filter: Analysis Year */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>
                Analysis Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{
                  padding: '10px 16px',
                  background: '#F3F4F6',
                  border: '1px solid transparent',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#111827',
                  minWidth: 160,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="2025">2025 (Current)</option>
                <option value="2024">2024</option>
              </select>
            </div>

            {/* Filter: Shift Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>
                Shift Type
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                style={{
                  padding: '10px 16px',
                  background: '#F3F4F6',
                  border: '1px solid transparent',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#111827',
                  minWidth: 180,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="NNJ Clinic">NNJ Clinic</option>
                <option value="Public Holiday">Public Holiday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            {/* Filter: Target Count (Number Input) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>
                Target Count
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F3F4F6',
                  borderRadius: 6,
                  padding: '0 12px',
                }}
              >
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  style={{
                    padding: '10px 0',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#2563EB', // Blue text for target
                    width: 50,
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>
                  / Nurse
                </span>
              </div>
            </div>

            {/* Metrics Summary (Right Side) */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 32,
                paddingLeft: 32,
                borderLeft: '1px solid #E5E7EB',
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700 }}>
                  Total {shiftType}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  {isLoading ? '...' : totalShifts}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700 }}>
                  Unbalanced
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: unbalancedCount > 0 ? '#EF4444' : '#199325' }}>
                  {isLoading ? '...' : unbalancedCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- STAFF TABLE --- */}
        <section>
          {/* Header */}
          <div
            style={{
              background: '#F9FAFB',
              borderRadius: '8px 8px 0 0',
              border: '1px solid #E5E7EB',
              borderBottom: 'none',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', // Matches columns below
              alignItems: 'center',
              height: 48,
              padding: '0 24px',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#6B7280',
              letterSpacing: '0.05em',
            }}
          >
            <div>Full Name</div>
            <div>PH Count</div>
            <div>Sun Count</div>
            <div>Total ({shiftType})</div>
            <div>Workload (vs {target})</div>
          </div>

          {/* Body */}
          <div
            style={{
              background: 'white',
              borderRadius: '0 0 8px 8px',
              border: '1px solid #E5E7EB',
              borderTop: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {isLoading ? (
               <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                 Loading analysis data...
               </div>
            ) : shiftData.length === 0 ? (
               <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                 No data found for these filters.
               </div>
            ) : (
              shiftData.map((row, idx) => {
                const status = getWorkloadStatus(row.total, target);

                return (
                  <div
                    key={row.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
                      alignItems: 'center',
                      padding: '16px 24px',
                      fontSize: 14,
                      color: '#111827',
                      borderTop: idx === 0 ? 'none' : '1px solid #E5E7EB',
                      backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{row.role}</div>
                    </div>
                    
                    <div>{row.ph}</div>
                    <div>{row.sunday}</div>
                    
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {row.total}
                    </div>
                    
                    <div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 12,
                          background: status.bg,
                          color: status.color,
                          fontWeight: 600,
                          fontSize: 12,
                          display: 'inline-block',
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminShiftDistributionPage;