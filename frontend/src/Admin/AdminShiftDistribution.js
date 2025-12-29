import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

function AdminShiftDistributionPage({ onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  // --- 1. STATE ---
  const [shiftData, setShiftData] = useState([]);
  const [availableYears, setAvailableYears] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [year, setYear] = useState(''); 
  const [shiftType] = useState('NNJ'); 
  const [target, setTarget] = useState(2);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
        const response = await fetch('http://localhost:5000/available-years');
        const dbYears = await response.json(); 
        
        const currentSystemYear = new Date().getFullYear();
        const nextYear = currentSystemYear + 1; 

        const uniqueYears = [...new Set([...dbYears, currentSystemYear, nextYear])].sort((a, b) => b - a);
        setAvailableYears(uniqueYears);

        if (uniqueYears.includes(currentSystemYear)) {
          setYear(currentSystemYear); 
        } else {
          setYear(uniqueYears[0]); 
        }

      } catch (err) {
        console.error("Error fetching years:", err);
        const current = new Date().getFullYear();
        setAvailableYears([current + 1, current]); 
        setYear(current);
      }
    };

    fetchYears();
  }, []);

  // --- 4. FETCH TABLE DATA ---
  useEffect(() => {
    if (!year) return; 

    setIsLoading(true);
    // Reset to page 1 when filter changes
    setCurrentPage(1);

    const url = `http://localhost:5000/shift-distribution?year=${year}&shiftType=${encodeURIComponent(shiftType)}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        const formattedData = data.map(item => {
          const ph = Number(item.ph_count);
          const sunday = Number(item.sun_count);
          return {
            id: item.user_id,
            name: item.full_name,
            role: item.role || 'APN',
            ph: ph, 
            sunday: sunday,
            total: ph + sunday 
          };
        });
        setShiftData(formattedData);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setShiftData([]);
        setIsLoading(false);
      });

  }, [year, shiftType]); 

  // --- 5. PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = shiftData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(shiftData.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // --- 6. SUMMARY METRICS ---
  const totalShifts = shiftData.reduce((sum, row) => sum + row.total, 0);
  const unbalancedCount = shiftData.filter(row => (row.total - target) !== 0).length;

  // --- STYLE CONSTANTS ---
  const gridLayout = '2.5fr 1fr 1fr 1fr 1.5fr';

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F3F4F6', fontFamily: 'Inter, sans-serif' }}>
      <Navbar active="shift" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} />

      <main style={{ maxWidth: 1200, margin: '40px auto', padding: '0 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: '#111827' }}>
          Annual Shift Distribution Analysis
        </h1>

        {/* --- FILTER & METRICS SECTION --- */}
        <section style={{ 
          background: 'white', 
          borderRadius: 16, 
          padding: '24px 32px', 
          marginBottom: 32, 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          border: '1px solid #F3F4F6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
            
            {/* LEFT SIDE: CONTROLS */}
            <div style={{ display: 'flex', gap: 24, flex: 1 }}>
                
                {/* Year Control */}
                <div style={controlGroupStyle}>
                    <label style={labelStyle}>Analysis Year</label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={year || ''}
                            onChange={(e) => setYear(Number(e.target.value))}
                            style={selectStyle}
                            disabled={availableYears.length === 0}
                        >
                            {availableYears.length === 0 && <option>Loading...</option>}
                            {availableYears.map(yr => (
                            <option key={yr} value={yr}>
                                {yr} {yr === new Date().getFullYear() ? '(Current)' : ''}
                            </option>
                            ))}
                        </select>
                        <div style={chevronStyle}>▼</div>
                    </div>
                </div>

                {/* Mode Control (Read Only Badge) */}
                <div style={controlGroupStyle}>
                    <label style={labelStyle}>Shift Mode</label>
                    <div style={badgeStyle}>
                        <span style={{ marginRight: 6 }}>NNJ Analysis</span>
                    </div>
                </div>

                {/* Target Control */}
                <div style={controlGroupStyle}>
                    <label style={labelStyle}>Target Count</label>
                    <div style={inputContainerStyle}>
                        <input
                            type="number"
                            value={target}
                            onChange={(e) => setTarget(Number(e.target.value))}
                            style={inputStyle}
                        />
                        <span style={suffixStyle}>/ Nurse</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: METRICS */}
            <div style={{ display: 'flex', gap: 40, paddingLeft: 40, borderLeft: '2px solid #F3F4F6' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={metricLabelStyle}>Total Shifts</div>
                    <div style={metricValueStyle}>
                        {isLoading ? '...' : totalShifts}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={metricLabelStyle}>Unbalanced Staff</div>
                    <div style={{ ...metricValueStyle, color: unbalancedCount > 0 ? '#DC2626' : '#16A34A' }}>
                        {isLoading ? '...' : unbalancedCount}
                    </div>
                </div>
            </div>

          </div>
        </section>

        {/* --- DATA TABLE SECTION --- */}
        <section style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridLayout, padding: '16px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <div style={headerStyle}>Staff Member</div>
            <div style={headerStyle}>PH Count</div>
            <div style={headerStyle}>Sun Count</div>
            <div style={headerStyle}>Total</div>
            <div style={headerStyle}>Workload Status</div>
          </div>

          {/* Table Body */}
          <div>
            {isLoading ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Loading analysis data...</div>
            ) : shiftData.length === 0 ? (
               <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>No data found for this selection.</div>
            ) : (
              currentData.map((row, idx) => {
                const status = getWorkloadStatus(row.total, target);
                return (
                  <div key={row.id} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: gridLayout, 
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

          {/* Pagination Footer (Centered) */}
          {shiftData.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E6E6E6', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    
                    {/* First Page */}
                    <button 
                        onClick={() => setCurrentPage(1)} 
                        disabled={currentPage === 1}
                        style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
                    >
                        «
                    </button>

                    {/* Previous Page */}
                    <button 
                        onClick={handlePrevPage} 
                        disabled={currentPage === 1}
                        style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
                    >
                        ‹
                    </button>

                    {/* Text Indicator */}
                    <span style={{ fontSize: 13, color: '#6B7280', margin: '0 12px', fontWeight: 500, minWidth: 60, textAlign: 'center' }}>
                         {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, shiftData.length)} of {shiftData.length}
                    </span>

                    {/* Next Page */}
                    <button 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                        style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                    >
                        ›
                    </button>

                    {/* Last Page */}
                    <button 
                        onClick={() => setCurrentPage(totalPages)} 
                        disabled={currentPage === totalPages}
                        style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                    >
                        »
                    </button>
                </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

// --- UPDATED STYLES ---

// Filter Section Styles
const controlGroupStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' };

// Styled Select
const selectStyle = { 
    appearance: 'none', 
    padding: '10px 32px 10px 12px', 
    background: '#F9FAFB', 
    border: '1px solid #D1D5DB', 
    borderRadius: 8, 
    fontSize: 14, 
    fontWeight: 500,
    minWidth: 140, 
    cursor: 'pointer',
    color: '#111827',
    outline: 'none'
};
const chevronStyle = { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#6B7280', pointerEvents: 'none' };

// Styled Badge for Mode
const badgeStyle = {
    padding: '10px 16px', 
    background: '#FFFBEB', // Light yellow
    border: '1px solid #FCD34D', // Yellow border
    borderRadius: 8, 
    fontSize: 14, 
    fontWeight: 600, 
    color: '#92400E',
    minWidth: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none'
};

// Styled Input Container for Target
const inputContainerStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    background: '#F9FAFB', 
    borderRadius: 8, 
    border: '1px solid #D1D5DB', 
    padding: '0 12px',
    height: 40 // Matches select height roughly
};
const inputStyle = { 
    padding: '8px 0', 
    background: 'transparent', 
    border: 'none', 
    fontSize: 15, 
    fontWeight: 700, 
    color: '#2563EB', 
    width: 40, 
    textAlign: 'center', 
    outline: 'none' 
};
const suffixStyle = { fontSize: 14, color: '#9CA3AF', fontWeight: 500 };

// Metric Styles
const metricLabelStyle = { fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' };
const metricValueStyle = { fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1 };

// Table Styles
const headerStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.05em' };

// Pagination Styles
const paginationButtonStyle = { 
    width: 32, 
    height: 32, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'white', 
    border: '1px solid #E5E7EB', 
    borderRadius: 8, 
    color: '#374151', 
    fontSize: 18, 
    lineHeight: 1, 
    transition: 'all 0.2s', 
    outline: 'none' 
};

export default AdminShiftDistributionPage;