import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

function AdminShiftDistributionPage({ onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  // --- 1. STATE ---
  const [shiftData, setShiftData] = useState([]);
  const [availableYears, setAvailableYears] = useState([]); // Stores years fetched from DB
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [year, setYear] = useState(''); // Empty initially, set after fetching years
  const [shiftType, setShiftType] = useState('NNJ');
  const [target, setTarget] = useState(8);

  // --- 2. HELPER: Workload Calculation ---
  const getWorkloadStatus = (total, targetVal) => {
    const diff = total - targetVal;
    if (diff === 0) return { label: 'Balanced', color: '#166534', bg: '#DCFCE7' }; 
    if (diff > 0) return { label: `Heavy (+${diff})`, color: '#991B1B', bg: '#FEE2E2' };
    return { label: `Light (${diff})`, color: '#854D0E', bg: '#FEF9C3' };
  };

  // --- 3. FETCH AVAILABLE YEARS (Initial Load) ---
  useEffect(() => {
    const fetchYears = async () => {
      try {
        // Fetch unique years from the backend API
        const response = await fetch('http://localhost:5000/available-years');
        const data = await response.json();
        
        console.log("Years available in DB:", data);
        setAvailableYears(data);

        // LOGIC: Set Default Year
        const currentSystemYear = new Date().getFullYear();
        
        if (data.includes(currentSystemYear)) {
          setYear(currentSystemYear); // Use current year if data exists
        } else if (data.length > 0) {
          setYear(data[0]); // Else use the most recent year available
        } else {
          setYear(currentSystemYear); // Fallback
        }
      } catch (err) {
        console.error("Error fetching years:", err);
        // Fallback if API fails
        setYear(new Date().getFullYear());
      }
    };

    fetchYears();
  }, []);

  // --- 4. FETCH TABLE DATA ---
  useEffect(() => {
    // Only fetch if we have a valid year set
    if (!year) return; 

    setIsLoading(true);
    const url = `http://localhost:5000/shift-distribution?year=${year}&shiftType=${encodeURIComponent(shiftType)}`;
    console.log("Fetching distribution for:", year, shiftType);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        const formattedData = data.map(item => ({
          id: item.user_id,
          name: item.full_name,
          role: item.role || 'Staff',
          ph: Number(item.ph_count), 
          sunday: Number(item.sun_count),
          total: Number(item.total_count)
        }));
        setShiftData(formattedData);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setShiftData([]);
        setIsLoading(false);
      });

  }, [year, shiftType]); 

  // --- 5. SUMMARY METRICS ---
  const totalShifts = shiftData.reduce((sum, row) => sum + row.total, 0);
  const unbalancedCount = shiftData.filter(row => (row.total - target) !== 0).length;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F3F4F6', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="shift" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} />

      <main style={{ maxWidth: 1200, margin: '40px auto', padding: '0 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: '#111827' }}>
          Annual Shift Distribution Analysis
        </h1>

        {/* --- FILTER SECTION --- */}
        <section style={{ background: 'white', borderRadius: 12, padding: '24px', marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ marginBottom: 24, fontSize: 14, fontWeight: 500, color: '#4B5563' }}>
            Adjust parameters to recalculate fairness report.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 32 }}>
            
            {/* Dynamic Year Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Analysis Year</label>
              <select
                value={year || ''}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ padding: '10px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 14, minWidth: 160, cursor: 'pointer' }}
                disabled={availableYears.length === 0}
              >
                {/* Fallback option while loading */}
                {availableYears.length === 0 && <option>Loading...</option>}
                
                {/* Map the years from DB */}
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr} {yr === new Date().getFullYear() ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Shift Type</label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                style={{ padding: '10px 12px', background: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: 6, fontSize: 14, minWidth: 180, cursor: 'pointer', fontWeight: 600, color: '#854D0E' }}
              >
                <option value="NNJ">NNJ</option>
                <option value="PM">PM Shift</option>
                <option value="AM">AM Shift</option>
                <option value="N">Night Shift</option>
              </select>
            </div>

            {/* Target Count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Target Count</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB', padding: '0 12px' }}>
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  style={{ padding: '10px 0', background: 'transparent', border: 'none', fontSize: 14, fontWeight: 700, color: '#2563EB', width: 50, textAlign: 'center', outline: 'none' }}
                />
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>/ Nurse</span>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 40, paddingLeft: 32, borderLeft: '1px solid #E5E7EB' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700, marginBottom: 4 }}>Total Shifts</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                  {isLoading ? '...' : totalShifts}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700, marginBottom: 4 }}>Unbalanced</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: unbalancedCount > 0 ? '#EF4444' : '#166534' }}>
                  {isLoading ? '...' : unbalancedCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- DATA TABLE SECTION --- */}
        <section style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', padding: '16px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <div style={headerStyle}>Staff Member</div>
            <div style={headerStyle}>PH Count</div>
            <div style={headerStyle}>Sun Count</div>
            <div style={headerStyle}>Total ({shiftType})</div>
            <div style={headerStyle}>Workload Status</div>
          </div>

          {/* Table Body */}
          <div>
            {isLoading ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Loading analysis data...</div>
            ) : shiftData.length === 0 ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>No data found for this selection.</div>
            ) : (
              shiftData.map((row, idx) => {
                const status = getWorkloadStatus(row.total, target);
                return (
                  <div key={row.id} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', 
                    padding: '16px 24px', 
                    alignItems: 'center',
                    borderTop: idx === 0 ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{row.role}</div>
                    </div>
                    
                    <div style={{ fontSize: 14, color: '#4B5563' }}>{row.ph}</div>
                    <div style={{ fontSize: 14, color: '#4B5563' }}>{row.sunday}</div>
                    
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{row.total}</div>
                    
                    <div>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 99, 
                        background: status.bg, 
                        color: status.color, 
                        fontWeight: 600, 
                        fontSize: 12, 
                        display: 'inline-block' 
                      }}>
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

const headerStyle = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#6B7280',
  letterSpacing: '0.05em'
};

export default AdminShiftDistributionPage;