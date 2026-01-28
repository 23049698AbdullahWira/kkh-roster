// backend/services/rosterEngine.js

// ==========================================
// 1. CONFIGURATION & PROTOCOLS
// ==========================================
const MAX_CONSECUTIVE_DAYS = 6;

// Defines allowed random shifts per service.
const SERVICE_PROTOCOLS = {
    'CE':       ['AM', 'PM', 'ND'],      
    'ONCO':     ['AM', 'PM'],            
    'PAS':      ['AM'],                  
    'PAME':     ['AM', 'PM'],            
    'ACUTE':    ['AM', 'PM'],
    'NEONATES': ['AM', 'PM'] 
};

// "Highest Priority" services for RRT Tie-Breaking
const RRT_PRIORITY_TEAMS = ['ACUTE', 'NEONATES', 'CE'];

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

const getShiftId = (types, code) => {
    // 1. Try finding exact code matches
    let t = types.find(t => t.shift_code === code);
    
    // 2. Fallback for Special/Rest Codes
    if (!t) {
        if (code === 'OFF' || code === 'RD') t = types.find(t => t.shift_type_id === 14) || types.find(t => t.shift_code === 'RD');
        // Add fallbacks for new codes if they don't match exactly in DB
        if (code === 'NHOME') t = types.find(t => t.shift_code.includes('NHOME'));
        if (code === 'KHOME') t = types.find(t => t.shift_code.includes('KHOME'));
        if (code === 'GPAPN') t = types.find(t => t.shift_code.includes('GPAPN'));
        
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

/**
 * Determine Fixed Ward
 * PRIORITY: 1. Live DB (user.ward_id) -> 2. Name Pattern -> 3. Default
 */
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
async function generateRoster(month, year, dbUsers, dbHistory, dbWards, dbShiftTypes) {
    console.log(`Starting Roster Engine for ${month}/${year}...`);

    if (!dbWards || !dbShiftTypes) throw new Error("Missing Reference Tables!");
    if (!dbUsers || dbUsers.length === 0) throw new Error("No Users provided!");

    // 1. Map IDs
    const RRT_TYPE_ID = getShiftId(dbShiftTypes, 'RRT'); 

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
        W86: getWardId(dbWards, "86")
    };

    // 2. Initialize Stats
    let stats = {};
    dbUsers.forEach(u => {
        let svc = (u.service || "").toUpperCase();
        if (u.full_name.toUpperCase().includes("NEO")) svc = "NEONATES";

        stats[u.user_id] = { 
            consecutive: 0,
            nnjCount: 0, 
            rrtCount: 0, 
            nhomeCount: 0, // NEW
            gpapnCount: 0, // NEW
            khomeCount: 0, // NEW
            amCount: 0, 
            pmCount: 0, 
            fixedWardId: determineFixedWard(u, WARD_IDS),
            service: svc
        };
    });

    // 3. Load History
    let rosterMap = {}; 
    dbHistory.forEach(s => {
        const d = s.shift_date instanceof Date ? toDateStr(s.shift_date) : s.shift_date.substring(0, 10);
        
        if (!rosterMap[d]) rosterMap[d] = {};
        rosterMap[d][s.user_id] = { shiftId: s.shift_type_id, wardId: s.ward_id, existing: true };

        const shiftCode = dbShiftTypes.find(t => t.shift_type_id === s.shift_type_id)?.shift_code || 'OFF';
        
        // Stats Update
        if (shiftCode === 'NNJ') stats[s.user_id].nnjCount++;
        if (shiftCode === 'RRT') stats[s.user_id].rrtCount++;
        if (shiftCode === 'NHOME') stats[s.user_id].nhomeCount++;
        if (shiftCode === 'KHOME') stats[s.user_id].khomeCount++;
        if (shiftCode === 'GPAPN') stats[s.user_id].gpapnCount++;
        if (shiftCode === 'AM') stats[s.user_id].amCount++;
        if (shiftCode === 'PM') stats[s.user_id].pmCount++;

        // Reset counters on Rest Days
        if (['OFF','RD','AL','MC','HL'].includes(shiftCode) || s.shift_type_id === 14) {
            if(stats[s.user_id]) stats[s.user_id].consecutive = 0;
        } else {
            if(stats[s.user_id]) stats[s.user_id].consecutive++;
        }
    });

    const isAvailable = (uid, date) => !rosterMap[date]?.[uid] && stats[uid].consecutive < MAX_CONSECUTIVE_DAYS;

    const setShift = (date, uid, code, wardIdOverride = null) => {
        if (!rosterMap[date]) rosterMap[date] = {};
        if (rosterMap[date][uid]) return; 

        const shiftId = getShiftId(dbShiftTypes, code);
        
        if(shiftId) {
            const finalWard = wardIdOverride || stats[uid].fixedWardId;
            rosterMap[date][uid] = { shiftId, wardId: finalWard, existing: false };
            
            const isRest = (code === 'OFF' || code === 'RD' || shiftId === 14);

            if (!isRest) {
                stats[uid].consecutive++;
                if (code === 'NNJ') stats[uid].nnjCount++;
                if (code === 'RRT') stats[uid].rrtCount++;
                if (code === 'NHOME') stats[uid].nhomeCount++;
                if (code === 'KHOME') stats[uid].khomeCount++;
                if (code === 'GPAPN') stats[uid].gpapnCount++;
                if (code === 'AM') stats[uid].amCount++;
                if (code === 'PM') stats[uid].pmCount++;
            } else {
                stats[uid].consecutive = 0;
            }
        } else {
            console.warn(`Warning: Could not find Shift ID for code '${code}'`);
        }
    };

    // ==========================================
    // 4. GENERATION LOOP
    // ==========================================
    const mIdx = getMonthIndex(month);
    const daysInMonth = new Date(year, mIdx + 1, 0).getDate();

    // --- PHASE 0: WEEKLY BLOCKS (NHOME) ---
    // NHOME: 2 Neonates APNs cover 1 week each. Fallback to PAME.
    const neonatesTeam = dbUsers.filter(u => stats[u.user_id].service === 'NEONATES');
    const pameTeam = dbUsers.filter(u => stats[u.user_id].service === 'PAME');
    // Combine for pool, prioritize Neonates
    const nhomePool = [...neonatesTeam, ...pameTeam]; 

    // We process week by week
    let currentWeekStart = 1;
    let poolIndex = 0; // Simple rotation index

    while (currentWeekStart <= daysInMonth) {
        let end = Math.min(currentWeekStart + 6, daysInMonth);
        
        // Pick one APN for this whole week
        // Note: Real rotation should check previous months, but here we just rotate per week in this batch
        const assignedAPN = nhomePool[poolIndex % nhomePool.length];
        
        if (assignedAPN) {
            for (let d = currentWeekStart; d <= end; d++) {
                const dDate = new Date(year, mIdx, d);
                const dStr = toDateStr(dDate);
                // Try to assign NHOME if available.
                // If they are busy (e.g. Leave), we might skip specific days, 
                // but usually Weekly Block implies strict assignment.
                if (isAvailable(assignedAPN.user_id, dStr)) {
                    setShift(dStr, assignedAPN.user_id, 'NHOME', WARD_IDS.NICU);
                }
            }
        }
        currentWeekStart += 7;
        poolIndex++;
    }

    // --- PHASE 1: DAILY LOOP ---
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, mIdx, day);
        const dateStr = toDateStr(dateObj);
        
        // RRT Logic Helper: Get yesterday
        const yesterday = new Date(year, mIdx, day - 1);
        const yesterdayStr = toDateStr(yesterday);

        const dow = dateObj.getDay(); 
        const isWeekend = (dow === 0 || dow === 6);

        // --- LAYER 1: SPECIAL DAILY SHIFTS ---
        
        // A. GPAPN (Wednesdays only, PAME)
        if (dow === 3) { // Wednesday
            // Filter PAME from specific wards (75, 56, 62, 66)
            let gpCandidates = dbUsers.filter(u => {
                const s = stats[u.user_id];
                if (s.service !== 'PAME') return false;
                if (!isAvailable(u.user_id, dateStr)) return false;
                
                // Specific Wards check based on your note
                const wId = s.fixedWardId;
                return (wId === WARD_IDS.W75 || wId === WARD_IDS.W56 || wId === WARD_IDS.W62 || wId === WARD_IDS.W66);
            });
            
            // Sort by fairness
            gpCandidates.sort((a, b) => stats[a.user_id].gpapnCount - stats[b.user_id].gpapnCount);

            if (gpCandidates[0]) {
                setShift(dateStr, gpCandidates[0].user_id, 'GPAPN', WARD_IDS.CE);
            }
        }

        // B. KHOME (Daily, 1 PAME APN)
        // Can overlap NHOME, but our engine assigns one primary shift.
        // We look for a PAME APN available.
        let khomeCandidates = dbUsers.filter(u => 
            stats[u.user_id].service === 'PAME' && 
            isAvailable(u.user_id, dateStr)
        );
        khomeCandidates.sort((a, b) => stats[a.user_id].khomeCount - stats[b.user_id].khomeCount);
        if (khomeCandidates[0]) {
            // Note: KHOME ward ID might be dynamic, but assuming Fixed Ward for now
            setShift(dateStr, khomeCandidates[0].user_id, 'KHOME', null);
        }

        // C. NNJ (Sundays) - 2 APNs
        if (dow === 0) {
            let nnjCandidates = dbUsers.filter(u => 
                ['CE','PAME','ACUTE','NEONATES'].includes(stats[u.user_id].service) && 
                isAvailable(u.user_id, dateStr)
            );
            nnjCandidates.sort((a, b) => stats[a.user_id].nnjCount - stats[b.user_id].nnjCount);
            
            if (nnjCandidates[0]) setShift(dateStr, nnjCandidates[0].user_id, 'NNJ', WARD_IDS.CE);
            if (nnjCandidates[1]) setShift(dateStr, nnjCandidates[1].user_id, 'NNJ', WARD_IDS.CE);
        }

        // D. SMART RRT (Weekdays)
        if (!isWeekend) {
            const eligibleServices = ['ACUTE', 'CE', 'ONCO', 'PAS', 'PAME', 'NEONATES'];
            
            let rrtCandidates = dbUsers.filter(u => {
                const s = stats[u.user_id];
                if (!eligibleServices.includes(s.service)) return false;
                if (!isAvailable(u.user_id, dateStr)) return false;

                const prevShift = rosterMap[yesterdayStr]?.[u.user_id];
                if (prevShift && prevShift.shiftId === RRT_TYPE_ID) return false;
                
                return true;
            });

            rrtCandidates.sort((a, b) => {
                const countDiff = stats[a.user_id].rrtCount - stats[b.user_id].rrtCount;
                if (countDiff !== 0) return countDiff; 

                const aIsPriority = RRT_PRIORITY_TEAMS.includes(stats[a.user_id].service);
                const bIsPriority = RRT_PRIORITY_TEAMS.includes(stats[b.user_id].service);
                
                if (aIsPriority && !bIsPriority) return -1; 
                if (!aIsPriority && bIsPriority) return 1;  
                return Math.random() - 0.5;
            });

            if (rrtCandidates.length > 0) {
                setShift(dateStr, rrtCandidates[0].user_id, 'RRT', WARD_IDS.CE);
            }
        }

        // --- LAYER 2: FIXED ROLES ---
        dbUsers.forEach(u => {
            if (!isAvailable(u.user_id, dateStr)) return;
            const name = u.full_name;
            const svc = stats[u.user_id].service;
            
            if (svc === 'ONCO') {
                if (name.includes("Onco A")) setShift(dateStr, u.user_id, isWeekend ? 'OFF' : '8-5');
                else if (name.includes("Onco C") && dow === 2) setShift(dateStr, u.user_id, 'PM');
            }
            if (svc === 'PAME') {
                if (name.includes("31")) setShift(dateStr, u.user_id, isWeekend ? 'OFF' : '8-5'); 
            }
        });

        // --- LAYER 3: RANDOM FILL ---
        dbUsers.forEach(u => {
            if (!isAvailable(u.user_id, dateStr)) return;

            const svc = stats[u.user_id].service;
            const allowedShifts = SERVICE_PROTOCOLS[svc] || ['AM']; 
            let shiftCode = 'AM';

            if (isWeekend) {
                if (svc === 'PAS') shiftCode = 'OFF';
                else shiftCode = (Math.random() > 0.6) ? 'OFF' : 'AM';
            } else {
                if (allowedShifts.includes('AM') && allowedShifts.includes('PM')) {
                    if (stats[u.user_id].amCount > stats[u.user_id].pmCount) shiftCode = 'PM';
                    else if (stats[u.user_id].pmCount > stats[u.user_id].amCount) shiftCode = 'AM';
                    else shiftCode = Math.random() > 0.5 ? 'AM' : 'PM';
                } else {
                    shiftCode = allowedShifts[0];
                }
            }
            setShift(dateStr, u.user_id, shiftCode);
        });

        // --- LAYER 4: REST DAY CLEANUP ---
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