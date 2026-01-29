import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar.js';

const getWorkloadStatus = (total, targetVal) => {
  const diff = total - targetVal;
  if (diff === 0) return { label: 'Balanced', color: '#166534', bg: '#DCFCE7' };
  if (diff > 0) return { label: `High (+${diff})`, color: '#991B1B', bg: '#FEE2E2' };
  return { label: `Low (${diff})`, color: '#854D0E', bg: '#FEF9C3' };
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Helper to calculate days in a month dynamically
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

function AdminShiftDistributionPage({ onGoHome, onGoRoster, onGoStaff, onGoShift, onLogout }) {
  // --- STATE ---
  const [shiftData, setShiftData] = useState([]);
  const [availableYears, setAvailableYears] = useState([]); 
  const [availableShiftTypes, setAvailableShiftTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [timeFrame, setTimeFrame] = useState('Year');
  const [year, setYear] = useState(''); 
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());
  const [shiftType, setShiftType] = useState('NNJ'); 
  
  // NEW: Service Filter State
  const [serviceFilter, setServiceFilter] = useState('ALL');

  const [target, setTarget] = useState(2); 
  const [currentPage, setCurrentPage] = useState(1);     
  const itemsPerPage = 6;

  // --- HANDLERS ---
  const handleShiftTypeChange = (e) => {
    const newType = e.target.value;
    setShiftType(newType);
    
    // Reset service filter if moving away from NNJ (Optional, but good UX)
    if (newType !== 'NNJ') {
        setServiceFilter('ALL');
    }

    // Auto-adjust target
    if (timeFrame === 'Day') setTarget(1); 
    else if (newType === 'AL') setTarget(timeFrame === 'Month' ? 2 : 14);
    else if (newType === 'NNJ') setTarget(timeFrame === 'Month' ? 1 : 2);
    else setTarget(timeFrame === 'Month' ? 5 : 20);
  };

  const handleTimeFrameChange = (mode) => {
    setTimeFrame(mode);
    setCurrentPage(1);
    // Reset target for "Day" view
    if (mode === 'Day') setTarget(1);
  };

  // --- INIT DATA ---
  useEffect(() => {
    const initData = async () => {
      try {
        const yearRes = await fetch('http://localhost:5000/available-years');
        const dbYears = await yearRes.json();
        const currentSystemYear = new Date().getFullYear();
        const uniqueYears = [...new Set([...dbYears, currentSystemYear])].sort((a, b) => b - a); 
        setAvailableYears(uniqueYears);
        setYear(currentSystemYear);

        const typeRes = await fetch('http://localhost:5000/api/shift-types');
        const typesData = await typeRes.json();
        setAvailableShiftTypes(typesData);
      } catch (err) {
        console.error("Error initializing:", err);
      }
    };
    initData();
  }, []);

// --- FETCH DATA (Updated) ---
  useEffect(() => {
    if (!year) return; 
    setIsLoading(true);

    const queryParams = new URLSearchParams({
      year,
      month,
      day,
      shiftType,
      timeFrame,
      service: serviceFilter // Pass the service filter to backend
    });

    fetch(`http://localhost:5000/shift-distribution?${queryParams}`)
      .then(res => res.json())
      .then(data => {
        const formattedData = data.map(item => ({
            id: item.user_id,
            name: item.name, 
            role: item.role,
            service: item.service, // Capture service from backend
            ph: Number(item.ph_count || 0), 
            sunday: Number(item.sun_count || 0),
            al: Number(item.al_count || 0),
            generic: Number(item.generic_count || 0),
            total: item.total 
        }));
        setShiftData(formattedData);
        setIsLoading(false);
      })
      .catch(() => {
        setShiftData([]);
        setIsLoading(false);
      });

  }, [year, month, day, shiftType, timeFrame, serviceFilter]); // ADD serviceFilter to dependency array

  // --- PAGINATION & RENDER HELPERS ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = shiftData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(shiftData.length / itemsPerPage);
  const unbalancedCount = shiftData.filter(row => (row.total - target) !== 0).length;
  const totalShifts = shiftData.reduce((sum, row) => sum + row.total, 0);

  const gridLayout = '2.5fr 1fr 1fr 1fr 1.5fr';
  
  // Calculate days for dropdown based on currently selected month/year
  const daysInCurrentMonth = getDaysInMonth(year, month);
  const dayOptions = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="shift" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout}/>

      <main style={{ maxWidth: 1200, margin: '40px auto', padding: '0 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: '#111827' }}>
          Shift Distribution Analysis
        </h1>

        {/* --- CONTROLS CARD --- */}
        <section style={{ background: 'white', borderRadius: 16, padding: '24px 32px', marginBottom: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
          
          {/* Top Row: Time Frame Toggles */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid #E5E7EB', paddingBottom: 24 }}>
             {/* Updated 'Today' to 'Day' in the loop array */}
             {['Year', 'Month', 'Day'].map(mode => (
               <button
                 key={mode}
                 onClick={() => handleTimeFrameChange(mode)}
                 style={{
                   padding: '8px 20px',
                   borderRadius: 20,
                   border: 'none',
                   fontSize: 14,
                   fontWeight: 600,
                   cursor: 'pointer',
                   backgroundColor: timeFrame === mode ? '#111827' : '#E5E7EB',
                   color: timeFrame === mode ? 'white' : '#4B5563',
                   transition: 'all 0.2s'
                 }}
               >
                 By {mode}
               </button>
             ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
            <div style={{ display: 'flex', gap: 24, flex: 1, flexWrap: 'wrap' }}>
                
                {/* Year Select - Always Visible */}
                <div style={controlGroupStyle}>
                    <label style={labelStyle}>Year</label>
                    <div style={{ position: 'relative' }}>
                        <select value={year || ''} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
                            {availableYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                        </select>
                        <div style={chevronStyle}>▼</div>
                    </div>
                </div>

                {/* Month Select - Visible for Month OR Day */}
                {(timeFrame === 'Month' || timeFrame === 'Day') && (
                  <div style={controlGroupStyle}>
                      <label style={labelStyle}>Month</label>
                      <div style={{ position: 'relative' }}>
                          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
                              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                          </select>
                          <div style={chevronStyle}>▼</div>
                      </div>
                  </div>
                )}

                {/* Day Select - NEW - Only visible for 'Day' */}
                {timeFrame === 'Day' && (
                  <div style={controlGroupStyle}>
                      <label style={labelStyle}>Day</label>
                      <div style={{ position: 'relative' }}>
                          <select value={day} onChange={(e) => setDay(Number(e.target.value))} style={selectStyle}>
                              {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <div style={chevronStyle}>▼</div>
                      </div>
                  </div>
                )}

                {/* Shift Mode */}
                <div style={controlGroupStyle}>
                    <label style={labelStyle}>Shift Type</label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={shiftType}
                            onChange={handleShiftTypeChange}
                            style={{ ...selectStyle, borderColor: '#FCD34D', backgroundColor: '#FFFBEB', color: '#92400E' }}
                        >
                            <optgroup label="Complex">
                              <option value="NNJ">NNJ (PH/Sun)</option>
                              <option value="AL">Annual Leave</option>
                            </optgroup>
                            <optgroup label="Simple Count">
                              {availableShiftTypes
                                .filter(t => t.shift_code !== 'NNJ' && t.shift_code !== 'AL')
                                .map(type => (
                                  <option key={type.shift_type_id} value={type.shift_code}>{type.shift_code}</option>
                              ))}
                            </optgroup>
                        </select>
                        <div style={{...chevronStyle, color: '#92400E'}}>▼</div>
                    </div>
                </div>
{/* NEW: Service Filter Dropdown (Conditional) */}
                {shiftType === 'NNJ' && (
                  <div style={controlGroupStyle}>
                      <label style={labelStyle}>Service</label>
                      <div style={{ position: 'relative' }}>
                          <select 
                            value={serviceFilter} 
                            onChange={(e) => setServiceFilter(e.target.value)} 
                            style={{...selectStyle, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', color: '#1E40AF'}}
                          >
                              <option value="ALL">ALL</option>
                              <option value="CE">CE</option>
                              <option value="Neonates">Neonates</option>
                              <option value="PAME">PAME</option>
                          </select>
                          <div style={{...chevronStyle, color: '#1E40AF'}}>▼</div>
                      </div>
                  </div>
                )}
                {/* Target */}
                <div style={controlGroupStyle}>
                    <label style={labelStyle}>Target</label>
                    <div style={inputContainerStyle}>
                        <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} style={inputStyle} />
                        <span style={suffixStyle}>/ Nurse</span>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', gap: 40, paddingLeft: 40, borderLeft: '2px solid #F3F4F6' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={metricLabelStyle}>Total Count</div>
                    <div style={metricValueStyle}>{isLoading ? '-' : totalShifts}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={metricLabelStyle}>Unbalanced</div>
                    <div style={{ ...metricValueStyle, color: unbalancedCount > 0 ? '#DC2626' : '#16A34A' }}>
                        {isLoading ? '-' : unbalancedCount}
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* --- DATA TABLE --- */}
        <section style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridLayout, padding: '16px 24px', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
            <div style={headerStyle}>Staff Member</div>
            
            {shiftType === 'NNJ' ? (
                <>
                    <div style={headerStyle}>PH</div>
                    <div style={headerStyle}>Sun</div>
                </>
            ) : shiftType === 'AL' ? (
                <>
                    <div style={headerStyle}>Leave</div>
                    <div style={headerStyle}></div>
                </>
            ) : (
                <>
                    <div style={headerStyle}>{shiftType}</div>
                    <div style={headerStyle}></div>
                </>
            )}

            <div style={headerStyle}>Total</div>
            <div style={headerStyle}>Status</div>
          </div>

          <div>
            {isLoading ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Loading...</div>
            ) : shiftData.length === 0 ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>No shifts found for this period.</div>
            ) : (
              currentData.map((row, idx) => {
                const status = getWorkloadStatus(row.total, target);
                return (
                  <div key={row.id} style={{ 
                    display: 'grid', gridTemplateColumns: gridLayout, padding: '16px 24px', 
                    alignItems: 'center', borderTop: idx === 0 ? 'none' : '1px solid #E5E7EB', backgroundColor:'white' 
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{row.role}</div>
                    </div>
                    
                    {shiftType === 'NNJ' ? (
                        <>
                            <div style={{ fontSize: 14, color: '#4B5563' }}>{row.ph}</div>
                            <div style={{ fontSize: 14, color: '#4B5563' }}>{row.sunday}</div>
                        </>
                    ) : shiftType === 'AL' ? (
                        <>
                            <div style={{ fontSize: 14, color: '#4B5563' }}>{row.al}</div>
                            <div></div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 14, color: '#4B5563' }}>{row.generic}</div>
                            <div></div>
                        </>
                    )}

                    <div style={{ fontSize: 15, fontWeight: 700 }}>{row.total}</div>
                    
                    <div>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: 99, 
                        background: status.bg, color: status.color, 
                        fontWeight: 600, fontSize: 12 
                      }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Pagination (Hidden if no data) */}
          {shiftData.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px', borderTop: '1px solid #E6E6E6' }}>
               <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={paginationButtonStyle}>‹</button>
                  <span style={{ fontSize: 13, color: '#6B7280', margin: 'auto 12px' }}>
                        {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, shiftData.length)} of {shiftData.length}
                  </span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={paginationButtonStyle}>›</button>
               </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// STYLES
const controlGroupStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' };
const selectStyle = { padding: '10px 32px 10px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, minWidth: 140, cursor: 'pointer', appearance: 'none' };
const chevronStyle = { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#6B7280', pointerEvents: 'none' };
const inputContainerStyle = { display: 'flex', alignItems: 'center', background: '#F9FAFB', borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 12px', height: 40 };
const inputStyle = { padding: '8px 0', background: 'transparent', border: 'none', fontSize: 15, fontWeight: 700, color: '#2563EB', width: 40, textAlign: 'center', outline: 'none' };
const suffixStyle = { fontSize: 14, color: '#9CA3AF' };
const metricLabelStyle = { fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700 };
const metricValueStyle = { fontSize: 28, fontWeight: 800, color: '#111827' };
const headerStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6B7280' };
const paginationButtonStyle = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' };

export default AdminShiftDistributionPage;