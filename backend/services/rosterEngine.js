// backend/services/rosterEngine.js

// ==========================================
// 1. CONFIGURATION & PROTOCOLS
// ==========================================
const MAX_CONSECUTIVE_DAYS = 6; // STRICT LIMIT

// Random Fill Protocols
const SERVICE_PROTOCOLS = {
    'CE':       ['AM', 'PM', 'ND'],      
    'ONCO':     ['AM', 'PM'],            
    'PAS':      ['AM'],                  
    'PAME':     ['AM', 'PM'],            
    'ACUTE':    ['AM', 'PM'],
    'NEONATES': ['AM', 'PM'] 
};

// RRT PRIORITY CONFIGURATION
const RRT_TIER_1 = ['ACUTE', 'CE'];
const RRT_TIER_2 = ['ONCO'];
const RRT_TIER_3 = ['PAS'];
const RRT_TIER_4 = ['NEONATES', 'PAME'];

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

const getShiftId = (types, code) => {
    let t = types.find(t => t.shift_code === code);
    if (!t) {
        if (code === 'OFF' || code === 'RD') t = types.find(t => t.shift_type_id === 14) || types.find(t => t.shift_code === 'RD');
        if (code === 'PH')    t = types.find(t => t.shift_type_id === 20) || types.find(t => t.shift_code === 'PH'); 
        if (code === 'ND')    t = types.find(t => t.shift_code === 'ND'); 
        if (code === 'NHOME') t = types.find(t => t.shift_code.includes('NHOME'));
        if (code === 'KHOME') t = types.find(t => t.shift_code.includes('KHOME'));
        if (code === 'GPAPN') t = types.find(t => t.shift_code.includes('GPAPN'));
        if (code === 'PAS-C') t = types.find(t => t.shift_code === 'PAS-C');
        if (code === 'PAIN')  t = types.find(t => t.shift_code === 'PAIN');
        
        if (!t && (code === 'OFF' || code === 'RD')) return 14; 
    }
    return t?.shift_type_id || null;
};

const getWardId = (wards, name) => wards.find(w => w.ward_name.includes(name))?.ward_id || null;

const toDateStr = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

const getMonthIndex = (m) => {
    if (!m) return 0;
    if (typeof m === 'number') return m - 1;
    if (!isNaN(parseInt(m))) return parseInt(m) - 1;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    return Math.max(0, months.indexOf(m.toString().toLowerCase().substring(0, 3)));
};

const determineFixedWard = (user, wardMap) => {
    if (user.ward_id) return user.ward_id;

    const name = (user.full_name || "").toUpperCase();
    const svc = (user.service || "").toUpperCase();

    if (svc === 'PAME') {
        if (name.includes("86")) return wardMap.W86;
        if (name.includes("31")) return wardMap.W31;
        if (name.includes("75")) return wardMap.W75;
        if (name.includes("66")) return wardMap.W66;
        if (name.includes("62") || name.includes("RESP")) return wardMap.W62;
        if (name.includes("56")) return wardMap.W56;
        return wardMap.W86;
    }
    if (svc === 'ACUTE' || svc === 'NEONATES' || name.includes("NEO")) {
        if (name.includes("65")) return wardMap.W65;
        if (name.includes("CICU")) return wardMap.CICU;
        if (name.includes("NEO")) return wardMap.NICU;
        return wardMap.W65;
    }
    if (svc === 'ONCO') {
        if (name.includes("ONCO B") || name.includes("ONCO D") || name.includes("75")) return wardMap.W75;
        return wardMap.ONCO_76;
    }
    if (svc === 'PAS') {
        if (name.includes("85")) return wardMap.PAS_85;
        if (name.includes("55")) return wardMap.PAS_55;
        return wardMap.PAS_85;
    }
    return wardMap.CE;
};

// ==========================================
// 3. MAIN ENGINE
// ==========================================
async function generateRoster(month, year, allUsers, dbHistory, dbWards, dbShiftTypes, publicHolidays = []) {
    console.log(`Starting Roster Engine for ${month}/${year}...`);

    if (!dbWards || !dbShiftTypes) throw new Error("Missing Reference Tables!");
    
    // Step 0: Filter Active Users
    const dbUsers = allUsers.filter(u => u.status && u.status.toUpperCase() === 'ACTIVE');
    if (!dbUsers || dbUsers.length === 0) throw new Error("No ACTIVE Users found!");

    // 1. Map IDs
    const RRT_TYPE_ID = getShiftId(dbShiftTypes, 'RRT'); 
    const AM_TYPE_ID = getShiftId(dbShiftTypes, 'AM'); 
    const PM_TYPE_ID = getShiftId(dbShiftTypes, 'PM'); 
    const PH_TYPE_ID = getShiftId(dbShiftTypes, 'PH'); 

    const WARD_IDS = {
        CE: getWardId(dbWards, "CE") || 1,
        PAS_85: getWardId(dbWards, "85"),
        PAS_55: getWardId(dbWards, "55"),
        ONCO_76: getWardId(dbWards, "76"),
        W75: getWardId(dbWards, "75"),
        CICU: getWardId(dbWards, "CICU"),
        NICU: getWardId(dbWards, "NICU"),
        W65: getWardId(dbWards, "65"),
        W66: getWardId(dbWards, "66"),
        W62: getWardId(dbWards, "62"),
        W56: getWardId(dbWards, "56"),
        W31: getWardId(dbWards, "31"),
        W86: getWardId(dbWards, "86"),
        CC:  getWardId(dbWards, "CC"), 
        PS:  getWardId(dbWards, "PS")  
    };

    // 2. Initialize Stats
    let stats = {};
    dbUsers.forEach(u => {
        let svc = (u.service || "").toUpperCase();
        if (u.full_name.toUpperCase().includes("NEO")) svc = "NEONATES";

        stats[u.user_id] = { 
            consecutive: 0,
            lastShiftDate: null, // Track date to detect chronological gaps
            nnjCount: 0, 
            rrtCount: 0, 
            nhomeCount: 0,
            gpapnCount: 0,
            khomeCount: 0,
            amCount: 0, 
            pmCount: 0,
            ndCount: 0, 
            fixedWardId: determineFixedWard(u, WARD_IDS),
            service: svc
        };
    });

    // 3. Load History (WITH CHRONOLOGICAL GAP DETECTION)
    // Sort history by User then Date
    dbHistory.sort((a, b) => {
        if (a.user_id !== b.user_id) return a.user_id - b.user_id;
        return new Date(a.shift_date) - new Date(b.shift_date);
    });

    const currentYear = parseInt(year); 
    let rosterMap = {}; 

    dbHistory.forEach(s => {
        const dStr = s.shift_date instanceof Date ? toDateStr(s.shift_date) : s.shift_date.substring(0, 10);
        const sDate = new Date(dStr);
        const shiftYear = sDate.getFullYear();

        if (!rosterMap[dStr]) rosterMap[dStr] = {};
        rosterMap[dStr][s.user_id] = { shiftId: s.shift_type_id, wardId: s.ward_id, existing: true };

        if (stats[s.user_id]) {
            const shiftCode = dbShiftTypes.find(t => t.shift_type_id === s.shift_type_id)?.shift_code || 'OFF';
            const isRest = ['OFF','RD','PH','AL','MC','HL'].includes(shiftCode) || s.shift_type_id === 14 || s.shift_type_id === 20;

            // --- CRITICAL FIX: DETECT GAPS WITHIN HISTORY ---
            if (stats[s.user_id].lastShiftDate) {
                const prevDate = new Date(stats[s.user_id].lastShiftDate);
                const diffTime = Math.abs(sDate - prevDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // If gap > 1 day in DB records, it implies OFF days. Reset counter.
                if (diffDays > 1) stats[s.user_id].consecutive = 0;
            }
            stats[s.user_id].lastShiftDate = dStr;

            // Update Counts
            if (shiftCode === 'NNJ' && shiftYear === currentYear) stats[s.user_id].nnjCount++;
            if (shiftCode === 'RRT' && shiftYear === currentYear) stats[s.user_id].rrtCount++;
            if (shiftCode === 'NHOME') stats[s.user_id].nhomeCount++;
            if (shiftCode === 'KHOME') stats[s.user_id].khomeCount++;
            if (shiftCode === 'GPAPN') stats[s.user_id].gpapnCount++;
            if (shiftCode === 'AM') stats[s.user_id].amCount++;
            if (shiftCode === 'PM') stats[s.user_id].pmCount++;
            if (shiftCode === 'ND') stats[s.user_id].ndCount++;

            // Consecutive Logic
            if (isRest) {
                stats[s.user_id].consecutive = 0;
            } else {
                stats[s.user_id].consecutive++;
            }
        }
    });

    // --- CRITICAL FIX: CHECK GAP BETWEEN HISTORY AND NEW ROSTER START ---
    const mIdx = getMonthIndex(month);
    const firstDayOfMonth = new Date(year, mIdx, 1);
    
    dbUsers.forEach(u => {
        if (stats[u.user_id].lastShiftDate) {
            const lastDate = new Date(stats[u.user_id].lastShiftDate);
            const diffTime = Math.abs(firstDayOfMonth - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If the last history record was >1 day before the 1st of this month,
            // they rested in between. Reset consecutive count.
            if (diffDays > 1) {
                stats[u.user_id].consecutive = 0;
            }
        }
    });

    // *** HELPER: FORCE OFF IF TIRED ***
    const isAvailable = (uid, date) => {
        if (rosterMap[date]?.[uid]) return false; // Already working
        if (stats[uid].consecutive >= MAX_CONSECUTIVE_DAYS) return false; // STRICT 6-DAY LIMIT
        return true;
    };

    const setShift = (date, uid, code, wardIdOverride = null) => {
        if (!rosterMap[date]) rosterMap[date] = {};
        if (rosterMap[date][uid]) return; 

        const shiftId = getShiftId(dbShiftTypes, code);
        
        if(shiftId) {
            const finalWard = wardIdOverride || stats[uid].fixedWardId;
            rosterMap[date][uid] = { shiftId, wardId: finalWard, existing: false };
            
            const isRest = (code === 'OFF' || code === 'RD' || code === 'PH' || shiftId === 14 || shiftId === 20);

            if (!isRest) {
                stats[uid].consecutive++;
                
                // Track assignments
                if (code === 'NNJ') stats[uid].nnjCount++;
                if (code === 'RRT') stats[uid].rrtCount++;
                if (code === 'NHOME') stats[uid].nhomeCount++;
                if (code === 'KHOME') stats[uid].khomeCount++;
                if (code === 'GPAPN') stats[uid].gpapnCount++;
                if (code === 'AM') stats[uid].amCount++;
                if (code === 'PM') stats[uid].pmCount++;
                if (code === 'ND') stats[uid].ndCount++;
            } else {
                stats[uid].consecutive = 0;
            }
            stats[uid].lastShiftDate = date; 
        }
    };

    const daysInMonth = new Date(year, mIdx + 1, 0).getDate();

    // --- PHASE -1: CE WEEKEND OFF PRE-ASSIGNMENT ---
    const ceTeam = dbUsers.filter(u => stats[u.user_id].service === 'CE');
    const weekends = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, mIdx, d);
        if (dateObj.getDay() === 6) { 
            const sat = d;
            const sun = d + 1;
            if (sun <= daysInMonth) weekends.push({ sat, sun });
        }
    }
    ceTeam.forEach((user, index) => {
        const weekendToAssign = weekends[index % weekends.length]; 
        if (weekendToAssign) {
            const satDate = toDateStr(new Date(year, mIdx, weekendToAssign.sat));
            const sunDate = toDateStr(new Date(year, mIdx, weekendToAssign.sun));
            if (!publicHolidays.includes(satDate)) setShift(satDate, user.user_id, 'OFF', null);
            if (!publicHolidays.includes(sunDate)) setShift(sunDate, user.user_id, 'OFF', null);
        }
    });

    // --- PHASE 0: WEEKLY BLOCKS (NHOME & CE NIGHT DUTY) ---
    const neonatesTeam = dbUsers.filter(u => stats[u.user_id].service === 'NEONATES');
    const pameTeam = dbUsers.filter(u => stats[u.user_id].service === 'PAME');
    const nhomePool = [...neonatesTeam, ...pameTeam]; 
    
    let currentWeekStart = 1;
    let poolIndex = 0; 
    let ceRotationIndex = 0; 

    while (currentWeekStart <= daysInMonth) {
        let end = Math.min(currentWeekStart + 6, daysInMonth);

        // NHOME
        const assignedAPN = nhomePool[poolIndex % nhomePool.length];
        if (assignedAPN) {
            for (let d = currentWeekStart; d <= end; d++) {
                const dDate = new Date(year, mIdx, d);
                const dStr = toDateStr(dDate);
                if (publicHolidays.includes(dStr)) continue; 
                
                // *** STRICT FORCE OFF *** // If user is tired during their NHOME block, FORCE THEM OFF.
                if (isAvailable(assignedAPN.user_id, dStr)) {
                    setShift(dStr, assignedAPN.user_id, 'NHOME', WARD_IDS.NICU);
                } else {
                    // This break is essential to stop the 7+ day streaks
                    if (!rosterMap[dStr]?.[assignedAPN.user_id]) {
                        setShift(dStr, assignedAPN.user_id, 'OFF', null);
                    }
                }
            }
        }

        // CE NIGHT DUTY (ND)
        const possibleND_Days = [];
        for (let d = currentWeekStart; d <= end; d++) {
            const dDate = new Date(year, mIdx, d);
            const dStr = toDateStr(dDate);
            const dayOfWeek = dDate.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && !publicHolidays.includes(dStr)) {
                possibleND_Days.push(dStr);
            }
        }
        if (possibleND_Days.length === 0) {
            for (let d = currentWeekStart; d <= end; d++) {
                const dDate = new Date(year, mIdx, d);
                const dStr = toDateStr(dDate);
                if (!publicHolidays.includes(dStr)) possibleND_Days.push(dStr);
            }
        }
        if (possibleND_Days.length > 0 && ceTeam.length > 0) {
            const selectedDay = possibleND_Days[Math.floor(Math.random() * possibleND_Days.length)];
            const selectedAPN = ceTeam[ceRotationIndex % ceTeam.length];
            
            if (isAvailable(selectedAPN.user_id, selectedDay)) {
                setShift(selectedDay, selectedAPN.user_id, 'ND', WARD_IDS.CE);
                ceRotationIndex++; 
            }
        }

        currentWeekStart += 7;
        poolIndex++;
    }

    // --- PHASE 1: DAILY LOOP ---
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, mIdx, day);
        const dateStr = toDateStr(dateObj);
        const yesterday = new Date(year, mIdx, day - 1);
        const yesterdayStr = toDateStr(yesterday);
        const dow = dateObj.getDay(); 
        const isWeekend = (dow === 0 || dow === 6);
        const isPH = publicHolidays.includes(dateStr);

        // ==========================================
        //  LAYER 0: SAFETY CHECK (Hard Stop)
        // ==========================================
        dbUsers.forEach(u => {
            if (stats[u.user_id].consecutive >= MAX_CONSECUTIVE_DAYS && !rosterMap[dateStr]?.[u.user_id]) {
                 setShift(dateStr, u.user_id, 'OFF', null);
            }
        });

        // ==========================================
        //  LAYER 0.5: PUBLIC HOLIDAY OVERRIDE
        // ==========================================
        if (isPH) {
            let nnjCandidates = dbUsers.filter(u => 
                ['CE','PAME','NEONATES'].includes(stats[u.user_id].service) && 
                isAvailable(u.user_id, dateStr)
            );
            nnjCandidates.sort((a, b) => {
                const diff = stats[a.user_id].nnjCount - stats[b.user_id].nnjCount;
                if (diff !== 0) return diff;
                return Math.random() - 0.5; 
            });
            if (nnjCandidates[0]) setShift(dateStr, nnjCandidates[0].user_id, 'NNJ', WARD_IDS.CE);
            if (nnjCandidates[1]) setShift(dateStr, nnjCandidates[1].user_id, 'NNJ', WARD_IDS.CE);
            dbUsers.forEach(u => {
                if (!rosterMap[dateStr]?.[u.user_id]) setShift(dateStr, u.user_id, 'PH', null);
            });
            continue; 
        }

        // ==========================================
        //  STANDARD DAYS
        // ==========================================
        if (dow === 3) { 
            let gpCandidates = dbUsers.filter(u => {
                const s = stats[u.user_id];
                if (s.service !== 'PAME') return false;
                if (!isAvailable(u.user_id, dateStr)) return false;
                const wId = s.fixedWardId;
                return (wId === WARD_IDS.W75 || wId === WARD_IDS.W56 || wId === WARD_IDS.W62 || wId === WARD_IDS.W66);
            });
            gpCandidates.sort((a, b) => stats[a.user_id].gpapnCount - stats[b.user_id].gpapnCount);
            if (gpCandidates[0]) setShift(dateStr, gpCandidates[0].user_id, 'GPAPN', WARD_IDS.CE);
        }

        let khomeCandidates = dbUsers.filter(u => 
            stats[u.user_id].service === 'PAME' && isAvailable(u.user_id, dateStr)
        );
        khomeCandidates.sort((a, b) => stats[a.user_id].khomeCount - stats[b.user_id].khomeCount);
        if (khomeCandidates[0]) setShift(dateStr, khomeCandidates[0].user_id, 'KHOME', null);

        if (dow === 0) { 
            let nnjCandidates = dbUsers.filter(u => 
                ['CE','PAME','NEONATES'].includes(stats[u.user_id].service) && isAvailable(u.user_id, dateStr)
            );
            nnjCandidates.sort((a, b) => {
                const diff = stats[a.user_id].nnjCount - stats[b.user_id].nnjCount;
                if (diff !== 0) return diff;
                return Math.random() - 0.5; 
            });
            if (nnjCandidates[0]) setShift(dateStr, nnjCandidates[0].user_id, 'NNJ', WARD_IDS.CE);
            if (nnjCandidates[1]) setShift(dateStr, nnjCandidates[1].user_id, 'NNJ', WARD_IDS.CE);
        }

        if (!isWeekend) {
            const getRRTCandidates = (serviceList) => {
                return dbUsers.filter(u => {
                    const s = stats[u.user_id];
                    if (!serviceList.includes(s.service)) return false;
                    if (!isAvailable(u.user_id, dateStr)) return false;
                    const prevShift = rosterMap[yesterdayStr]?.[u.user_id];
                    if (prevShift && prevShift.shiftId === RRT_TYPE_ID) return false;
                    return true;
                });
            };
            let finalCandidates = getRRTCandidates(RRT_TIER_1);
            if (finalCandidates.length === 0) finalCandidates = getRRTCandidates(RRT_TIER_2);
            if (finalCandidates.length === 0) finalCandidates = getRRTCandidates(RRT_TIER_3);
            if (finalCandidates.length === 0) finalCandidates = getRRTCandidates(RRT_TIER_4);
            
            finalCandidates.sort((a, b) => {
                const diff = stats[a.user_id].rrtCount - stats[b.user_id].rrtCount;
                if (diff !== 0) return diff;
                return Math.random() - 0.5; 
            });
            if (finalCandidates.length > 0) setShift(dateStr, finalCandidates[0].user_id, 'RRT', WARD_IDS.CE);
        }

        // Fixed Roles
        dbUsers.forEach(u => {
            if (!isAvailable(u.user_id, dateStr)) return;
            const name = u.full_name;
            const svc = stats[u.user_id].service;
            const wId = stats[u.user_id].fixedWardId;

            if (wId === WARD_IDS.CC) { setShift(dateStr, u.user_id, isWeekend ? 'OFF' : 'PAS-C'); return; }
            if (wId === WARD_IDS.PS) { setShift(dateStr, u.user_id, isWeekend ? 'OFF' : 'PAIN'); return; }
            if (svc === 'ONCO') {
                if (name.includes("Onco A")) setShift(dateStr, u.user_id, isWeekend ? 'OFF' : '8-5');
                else if (name.includes("Onco C") && dow === 2) setShift(dateStr, u.user_id, 'PM');
            }
            if (svc === 'PAME' && name.includes("31")) setShift(dateStr, u.user_id, isWeekend ? 'OFF' : '8-5'); 
        });

        // --- LAYER 4: RANDOM FILL (WITH WEEKEND OFF PREFERENCE) ---
        dbUsers.forEach(u => {
            if (!isAvailable(u.user_id, dateStr)) return;

            const svc = stats[u.user_id].service;
            const allowedShifts = SERVICE_PROTOCOLS[svc] || ['AM']; 
            let shiftCode = 'AM';

            if (isWeekend) {
                if (svc === 'PAS') {
                    shiftCode = 'OFF';
                } else {
                    // *** WEEKEND OFF PREFERENCE LOGIC ***
                    // Default to OFF (85% chance) unless critical coverage is needed
                    if (Math.random() > 0.15) { 
                        shiftCode = 'OFF'; 
                    } else {
                        shiftCode = 'AM'; // Fallback to work if random check fails
                    }
                }
            } else {
                if (allowedShifts.includes('AM') && allowedShifts.includes('PM')) {
                    const myWard = stats[u.user_id].fixedWardId;
                    let amInWard = 0;
                    let pmInWard = 0;
                    Object.values(rosterMap[dateStr]).forEach(s => {
                         if (s.wardId === myWard) {
                             if (s.shiftId === AM_TYPE_ID) amInWard++;
                             if (s.shiftId === PM_TYPE_ID) pmInWard++;
                         }
                    });
                    if (amInWard > pmInWard) shiftCode = 'PM';
                    else if (pmInWard > amInWard) shiftCode = 'AM';
                    else shiftCode = Math.random() > 0.5 ? 'AM' : 'PM';
                } else {
                    shiftCode = allowedShifts[0];
                }
            }
            setShift(dateStr, u.user_id, shiftCode);
        });

        // --- LAYER 5: REST DAY CLEANUP ---
        dbUsers.forEach(u => {
            if (!rosterMap[dateStr]?.[u.user_id]) {
                setShift(dateStr, u.user_id, 'OFF', null); 
            }
        });
    }

    // --- 5. EXPORT ---
    const newShifts = [];
    Object.keys(rosterMap).forEach(date => {
        Object.keys(rosterMap[date]).forEach(uid => {
            const s = rosterMap[date][uid];
            if (!s.existing && s.shiftId) {
                newShifts.push({
                    shift_date: date,
                    user_id: uid,
                    shift_type_id: s.shiftId,
                    ward_id: s.wardId, 
                    roster_id: null
                });
            }
        });
    });

    return newShifts;
}

module.exports = { generateRoster };