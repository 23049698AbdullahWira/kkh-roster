import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../Nav/navbar.js';
import './AdminShiftDistribution.css'; // Import the new CSS

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

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// --- MOVED OUTSIDE FOR STABILITY ---
const timeFrameOptions = ['Year', 'Month', 'Day'];

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
  const [serviceFilter, setServiceFilter] = useState('ALL');

  const [target, setTarget] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // --- GLIDER ANIMATION STATE ---
  const [gliderStyle, setGliderStyle] = useState({ left: 0, width: 0 });
  const pillsRef = useRef([]);

  // Calculate glider position when timeFrame changes
  useEffect(() => {
    const activeIndex = timeFrameOptions.indexOf(timeFrame);
    const activeElement = pillsRef.current[activeIndex];

    if (activeElement) {
      setGliderStyle({
        left: activeElement.offsetLeft,
        width: activeElement.offsetWidth
      });
    }
  }, [timeFrame]);

  // --- HANDLERS ---
  const handleShiftTypeChange = (e) => {
    const newType = e.target.value;
    setShiftType(newType);

    if (newType !== 'NNJ') {
      setServiceFilter('ALL');
    }

    if (timeFrame === 'Day') setTarget(1);
    else if (newType === 'AL') setTarget(timeFrame === 'Month' ? 2 : 14);
    else if (newType === 'NNJ') setTarget(timeFrame === 'Month' ? 1 : 2);
    else setTarget(timeFrame === 'Month' ? 5 : 20);
  };

  const handleTimeFrameChange = (mode) => {
    setTimeFrame(mode);
    setCurrentPage(1);
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

  // --- FETCH DATA ---
  useEffect(() => {
    if (!year) return;
    setIsLoading(true);

    const queryParams = new URLSearchParams({
      year,
      month,
      day,
      shiftType,
      timeFrame,
      service: serviceFilter
    });

    fetch(`http://localhost:5000/shift-distribution?${queryParams}`)
      .then(res => res.json())
      .then(data => {
        const formattedData = data.map(item => ({
          id: item.user_id,
          name: item.name,
          role: item.role,
          service: item.service,
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

  }, [year, month, day, shiftType, timeFrame, serviceFilter]);

  // --- PAGINATION & RENDER HELPERS ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = shiftData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(shiftData.length / itemsPerPage);
  const unbalancedCount = shiftData.filter(row => (row.total - target) !== 0).length;
  const totalShifts = shiftData.reduce((sum, row) => sum + row.total, 0);

  const gridLayout = '2.5fr 1fr 1fr 1fr 1.5fr';

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const dayOptions = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  return (
    <div className="admin-shift-dist-container">
      <Navbar active="shift" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout} />

      <main className="admin-shift-dist-main">
        <h1 className="admin-shift-dist-title">Shift Distribution Analysis</h1>
        <p className="admin-shift-dist-subtitle">
          Showing statistics based on <strong>Published</strong> rosters only.
        </p>

        {/* --- CONTROLS CARD --- */}
        <section className="admin-shift-dist-controls-card">
          
          {/* Animated Time Frame Pills */}
          <div className="admin-shift-dist-toggle-row">
            <div className="admin-shift-dist-pill-group">
              
              {/* The Sliding Glider */}
              <div 
                className="admin-shift-dist-pill-glider"
                style={{ left: gliderStyle.left, width: gliderStyle.width }}
              />

              {/* The Buttons */}
              {timeFrameOptions.map((mode, index) => (
                <button
                  key={mode}
                  ref={el => pillsRef.current[index] = el}
                  onClick={() => handleTimeFrameChange(mode)}
                  className={`admin-shift-dist-pill-btn ${timeFrame === mode ? 'active' : ''}`}
                >
                  By {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-shift-dist-filters-row">
            <div className="admin-shift-dist-filters-left">

              {/* Year Select */}
              <div className="admin-shift-dist-control-group">
                <label className="admin-shift-dist-label">Year</label>
                <div className="admin-shift-dist-select-wrapper">
                  <select 
                    value={year || ''} 
                    onChange={(e) => setYear(Number(e.target.value))} 
                    className="admin-shift-dist-select"
                  >
                    {availableYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                  <div className="admin-shift-dist-chevron">▼</div>
                </div>
              </div>

              {/* Month Select */}
              {(timeFrame === 'Month' || timeFrame === 'Day') && (
                <div className="admin-shift-dist-control-group">
                  <label className="admin-shift-dist-label">Month</label>
                  <div className="admin-shift-dist-select-wrapper">
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(Number(e.target.value))} 
                      className="admin-shift-dist-select"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <div className="admin-shift-dist-chevron">▼</div>
                  </div>
                </div>
              )}

              {/* Day Select */}
              {timeFrame === 'Day' && (
                <div className="admin-shift-dist-control-group">
                  <label className="admin-shift-dist-label">Day</label>
                  <div className="admin-shift-dist-select-wrapper">
                    <select 
                      value={day} 
                      onChange={(e) => setDay(Number(e.target.value))} 
                      className="admin-shift-dist-select"
                    >
                      {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <div className="admin-shift-dist-chevron">▼</div>
                  </div>
                </div>
              )}

              {/* Shift Type */}
              <div className="admin-shift-dist-control-group">
                <label className="admin-shift-dist-label">Shift Type</label>
                <div className="admin-shift-dist-select-wrapper">
                  <select
                    value={shiftType}
                    onChange={handleShiftTypeChange}
                    className="admin-shift-dist-select shift-type"
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
                  <div className="admin-shift-dist-chevron" style={{ color: '#92400E' }}>▼</div>
                </div>
              </div>

              {/* Service Filter */}
              {shiftType === 'NNJ' && (
                <div className="admin-shift-dist-control-group">
                  <label className="admin-shift-dist-label">Service</label>
                  <div className="admin-shift-dist-select-wrapper">
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="admin-shift-dist-select service"
                    >
                      <option value="ALL">ALL</option>
                      <option value="CE">CE</option>
                      <option value="Neonates">Neonates</option>
                      <option value="PAME">PAME</option>
                    </select>
                    <div className="admin-shift-dist-chevron" style={{ color: '#1E40AF' }}>▼</div>
                  </div>
                </div>
              )}

              {/* Target */}
              <div className="admin-shift-dist-control-group">
                <label className="admin-shift-dist-label">Target</label>
                <div className="admin-shift-dist-input-container">
                  <input 
                    type="number" 
                    value={target} 
                    onChange={(e) => setTarget(Number(e.target.value))} 
                    className="admin-shift-dist-input" 
                  />
                  <span className="admin-shift-dist-suffix">/ Nurse</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="admin-shift-dist-metrics">
              <div className="admin-shift-dist-metric-box">
                <div className="admin-shift-dist-metric-label">Total Count</div>
                <div className="admin-shift-dist-metric-value">
                  {isLoading ? '-' : totalShifts}
                </div>
              </div>
              <div className="admin-shift-dist-metric-box">
                <div className="admin-shift-dist-metric-label">Unbalanced</div>
                <div className={`admin-shift-dist-metric-value ${unbalancedCount > 0 ? 'unbalanced' : 'balanced'}`}>
                  {isLoading ? '-' : unbalancedCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- DATA TABLE --- */}
        <section className="admin-shift-dist-table-card">
          <div 
            className="admin-shift-dist-grid-header" 
            style={{ gridTemplateColumns: gridLayout }}
          >
            <div className="admin-shift-dist-header-cell">Staff Member</div>

            {shiftType === 'NNJ' ? (
              <>
                <div className="admin-shift-dist-header-cell">PH</div>
                <div className="admin-shift-dist-header-cell">Sun</div>
              </>
            ) : shiftType === 'AL' ? (
              <>
                <div className="admin-shift-dist-header-cell">Leave</div>
                <div className="admin-shift-dist-header-cell"></div>
              </>
            ) : (
              <>
                <div className="admin-shift-dist-header-cell">{shiftType}</div>
                <div className="admin-shift-dist-header-cell"></div>
              </>
            )}

            <div className="admin-shift-dist-header-cell">Total</div>
            <div className="admin-shift-dist-header-cell">Status</div>
          </div>

          <div>
            {isLoading ? (
              <div className="admin-shift-dist-loading">Loading...</div>
            ) : shiftData.length === 0 ? (
              <div className="admin-shift-dist-empty">Roster not published or no shifts found.</div>
            ) : (
              currentData.map((row) => {
                const status = getWorkloadStatus(row.total, target);
                return (
                  <div 
                    key={row.id} 
                    className="admin-shift-dist-row"
                    style={{ gridTemplateColumns: gridLayout }}
                  >
                    <div>
                      <div className="admin-shift-dist-name">{row.name}</div>
                      <div className="admin-shift-dist-role">{row.role}</div>
                    </div>

                    {shiftType === 'NNJ' ? (
                      <>
                        <div className="admin-shift-dist-cell-val">{row.ph}</div>
                        <div className="admin-shift-dist-cell-val">{row.sunday}</div>
                      </>
                    ) : shiftType === 'AL' ? (
                      <>
                        <div className="admin-shift-dist-cell-val">{row.al}</div>
                        <div></div>
                      </>
                    ) : (
                      <>
                        <div className="admin-shift-dist-cell-val">{row.generic}</div>
                        <div></div>
                      </>
                    )}

                    <div className="admin-shift-dist-cell-total">{row.total}</div>

                    <div>
                      <span 
                        className="admin-shift-dist-status-badge"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {shiftData.length > 0 && (
            <div className="admin-shift-dist-pagination">
              <div className="admin-shift-dist-pagination-controls">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1} 
                  className="admin-shift-dist-page-btn"
                >
                  ‹
                </button>
                <span className="admin-shift-dist-page-text">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, shiftData.length)} of {shiftData.length}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages} 
                  className="admin-shift-dist-page-btn"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminShiftDistributionPage;