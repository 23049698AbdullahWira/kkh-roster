// backend/services/rosterEngine.js

// ==========================================
// 1. CONFIGURATION & PROTOCOLS
// ==========================================
const MAX_CONSECUTIVE_DAYS = 6; 
const WEEKEND_WORK_PROBABILITY = 0.15; // 35% chance to work Saturday
const AM_RATIO_TARGET = 0.70;   

const SERVICE_PROTOCOLS = {
    'CE':       ['AM', 'PM', 'ND'],      
    'ONCO':     ['AM', 'PM'],            
    'PAS':      ['AM'],                  
    'PAME':     ['AM', 'PM'],            
    'ACUTE':    ['AM', 'PM'],
    'NEONATES': ['AM', 'PM'] 
};

const RRT_TIER_1 = ['ACUTE', 'CE'];
const RRT_TIER_2 = ['ONCO'];
const RRT_TIER_3 = ['PAS'];
const RRT_TIER_4 = ['NEONATES', 'PAME'];

// ==========================================
// 2. CALENDAR TRUTH TABLE GENERATOR
// ==========================================
async function buildCalendarMap(month, yearInt) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mIdx = months.indexOf(month.toLowerCase().substring(0, 3));
    const daysInMonth = new Date(yearInt, mIdx + 1, 0).getDate();
    
    const calendarMap = {};

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(yearInt, mIdx, d);
        
        // Manual YYYY-MM-DD
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${dayStr}`;

        const dow = dateObj.getDay(); // 0=Sun, 1=Mon, ... 6=Sat

        // Calculate Week ID
        const weekStart = new Date(dateObj);
        const diff = dateObj.getDate() - dow + (dow === 0 ? -6 : 1); 
        weekStart.setDate(diff);
        const wy = weekStart.getFullYear();
        const wm = String(weekStart.getMonth() + 1).padStart(2, '0');
        const wd = String(weekStart.getDate()).padStart(2, '0');
        const weekId = `${wy}-${wm}-${wd}`;

        calendarMap[dateKey] = {
            dateStr: dateKey,
            dayOfWeekIndex: dow, 
            isWeekend: (dow === 0 || dow === 6),
            isSunday: (dow === 0),
            isMonday: (dow === 1),
            weekId: weekId 
        };
    }
    return calendarMap;
}

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================
const getWardId = (wards, name) => wards.find(w => w.ward_name.includes(name))?.ward_id || null;

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
// 4. MAIN ENGINE
// ==========================================
async function generateRoster(month, year, allUsers, dbHistory, dbWards, dbShiftTypes, publicHolidays = []) {
    console.log(`Starting Roster Engine for ${month}/${year}...`);

    if (!dbWards || !dbShiftTypes) throw new Error("Missing Reference Tables!");
    
    // 1. Build Truth Table
    const calendarMap = await buildCalendarMap(month, parseInt(year));
    const rosterDates = Object.keys(calendarMap).sort(); 

    const dbUsers = allUsers.filter(u => u.status && u.status.toUpperCase() === 'ACTIVE');
    if (!dbUsers || dbUsers.length === 0) throw new Error("No ACTIVE Users found!");

    const RRT_TYPE_ID = getShiftIdHelper(dbShiftTypes, 'RRT'); 
    
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

    let stats = {};
    dbUsers.forEach(u => {
        let svc = (u.service || "").toUpperCase();
        if (u.full_name.toUpperCase().includes("NEO")) svc = "NEONATES";
        stats[u.user_id] = { 
            nnjCount: 0, rrtCount: 0, rrtWeeks: new Set(), 
            nhomeCount: 0, gpapnCount: 0, khomeCount: 0,
            amCount: 0, pmCount: 0, ndCount: 0, 
            fixedWardId: determineFixedWard(u, WARD_IDS),
            service: svc
        };
    });

    const rosterMap = {}; 
    const nhomeWeekMap = {}; 

    // --- POPULATE HISTORY ---
    dbHistory.sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date)).forEach(s => {
        const offset = s.shift_date instanceof Date ? s.shift_date.getTimezoneOffset() * 60000 : 0;
        const dObj = s.shift_date instanceof Date ? new Date(s.shift_date.getTime() - offset) : new Date(s.shift_date);
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;

        const shiftCode = dbShiftTypes.find(t => t.shift_type_id === s.shift_type_id)?.shift_code || 'OFF';
        
        if (!rosterMap[dStr]) rosterMap[dStr] = {};
        rosterMap[dStr][s.user_id] = { shiftId: s.shift_type_id, wardId: s.ward_id, existing: true };

        if (parseInt(y) === parseInt(year) && stats[s.user_id]) {
            if (shiftCode === 'RRT') {
                stats[s.user_id].rrtCount++;
                const tempWeekId = getWeekIdFallback(dStr);
                stats[s.user_id].rrtWeeks.add(tempWeekId); 
            }
            if (shiftCode === 'NHOME') stats[s.user_id].nhomeCount++;
            if (shiftCode === 'NNJ') stats[s.user_id].nnjCount++;
        }
    });

    // --- HELPER FUNCTIONS ---
    function getShiftIdHelper(types, code) {
        let t = types.find(t => t.shift_code === code);
        if (!t) {
            if (code === 'OFF' || code === 'RD') return 14; 
            if (code === 'PH') return 20;
            if (code.includes('NHOME')) t = types.find(t => t.shift_code.includes('NHOME'));
            if (code.includes('KHOME')) t = types.find(t => t.shift_code.includes('KHOME'));
            if (code.includes('GPAPN')) t = types.find(t => t.shift_code.includes('GPAPN'));
        }
        return t?.shift_type_id || null;
    }

    function isRestShiftId(shiftId) {
        if (!shiftId) return false; 
        const code = dbShiftTypes.find(t => t.shift_type_id === shiftId)?.shift_code || 'OFF';
        return ['OFF','RD','PH','AL','MC','HL'].includes(code) || shiftId === 14 || shiftId === 20;
    }

    function setShift(date, uid, code, wardIdOverride = null) {
        if (!rosterMap[date]) rosterMap[date] = {};
        if (rosterMap[date][uid]) return; 

        // CRITICAL UPDATE: SUNDAY LOCKDOWN
        const dayData = calendarMap[date];
        if (dayData && dayData.isSunday) {
            // On Sunday, ONLY 'NNJ', 'OFF' (RD), or 'PH' are allowed.
            if (code !== 'NNJ' && code !== 'OFF' && code !== 'RD' && code !== 'PH') {
                code = 'OFF'; // Force to Rest Day
            }
        }

        // Weekend Guard for NHOME/KHOME (Redundant but safe)
        if (dayData && dayData.isWeekend && (code.includes('NHOME') || code.includes('KHOME'))) {
            code = 'OFF';
        }

        const shiftId = getShiftIdHelper(dbShiftTypes, code);
        if(shiftId) {
            rosterMap[date][uid] = { shiftId, wardId: wardIdOverride || stats[uid].fixedWardId, existing: false };
            
            if (!isRestShiftId(shiftId)) {
                if (code === 'RRT' && dayData) stats[uid].rrtWeeks.add(dayData.weekId);
                if (code === 'NHOME') stats[uid].nhomeCount++;
                if (code === 'NNJ') stats[uid].nnjCount++;
                if (code === 'AM') stats[uid].amCount++;
                if (code === 'PM') stats[uid].pmCount++;
            }
        }
    }

    function getRdsThisWeek(uid, dateStr) {
        const dayData = calendarMap[dateStr];
        if (!dayData) return 0;
        const targetWeekId = dayData.weekId;
        
        let count = 0;
        rosterDates.forEach(d => {
            if (calendarMap[d].weekId === targetWeekId) {
                const sId = rosterMap[d]?.[uid]?.shiftId;
                if (sId && isRestShiftId(sId)) count++;
            }
        });
        return count;
    }

    function isSafeToAssign(uid, dateStr) {
        if (rosterMap[dateStr]?.[uid]) return false;
        
        let consecutive = 0;
        const [y, m, d] = dateStr.split('-').map(Number);
        
        // Check backwards
        let curr = new Date(y, m-1, d);
        curr.setDate(curr.getDate() - 1);
        while(true) {
            const cStr = toDateStrLocal(curr);
            const sId = rosterMap[cStr]?.[uid]?.shiftId;
            if (!sId || isRestShiftId(sId)) break;
            consecutive++;
            curr.setDate(curr.getDate() - 1);
        }
        
        // Check forwards
        curr = new Date(y, m-1, d);
        curr.setDate(curr.getDate() + 1);
        while(true) {
            const cStr = toDateStrLocal(curr);
            const sId = rosterMap[cStr]?.[uid]?.shiftId;
            if (!sId || isRestShiftId(sId)) break;
            consecutive++;
            curr.setDate(curr.getDate() + 1);
        }

        return (consecutive < MAX_CONSECUTIVE_DAYS);
    }

    // ==========================================
    // PHASE 0: NHOME ASSIGNMENT
    // ==========================================
    const nhomePool = dbUsers.filter(u => ['NEONATES','PAME'].includes(stats[u.user_id].service))
                             .sort(() => Math.random() - 0.5);
    
    const distinctWeeks = [...new Set(Object.values(calendarMap).map(d => d.weekId))].sort();

    if (nhomePool.length > 0) {
        distinctWeeks.forEach((wkId, index) => {
            const assignedUser = nhomePool[index % nhomePool.length];
            nhomeWeekMap[wkId] = assignedUser.user_id;
        });
    }

    rosterDates.forEach(dateStr => {
        const dayData = calendarMap[dateStr];
        const ownerId = nhomeWeekMap[dayData.weekId];

        if (ownerId) {
            if (dayData.isWeekend || publicHolidays.includes(dateStr)) {
                setShift(dateStr, ownerId, 'OFF');
            } else {
                if (isSafeToAssign(ownerId, dateStr)) {
                    setShift(dateStr, ownerId, 'NHOME', WARD_IDS.NICU);
                } else {
                    setShift(dateStr, ownerId, 'OFF');
                }
            }
        }
    });

    // ==========================================
    // PHASE 0.1: CE NIGHT DUTY
    // ==========================================
    const ceTeam = dbUsers.filter(u => stats[u.user_id].service === 'CE');
    let ceIdx = 0;
    distinctWeeks.forEach(wkId => {
        const weekDays = rosterDates.filter(d => calendarMap[d].weekId === wkId && !calendarMap[d].isWeekend && !publicHolidays.includes(d));
        if (weekDays.length > 0 && ceTeam.length > 0) {
            const randomDay = weekDays[Math.floor(Math.random() * weekDays.length)];
            const user = ceTeam[ceIdx % ceTeam.length];
            if (isSafeToAssign(user.user_id, randomDay)) {
                setShift(randomDay, user.user_id, 'ND', WARD_IDS.CE);
                ceIdx++;
            }
        }
    });

    // ==========================================
    // PHASE 1: DAILY FILL
    // ==========================================
    rosterDates.forEach(dateStr => {
        const dayData = calendarMap[dateStr]; 
        const isWeekend = dayData.isWeekend;
        const isSunday = dayData.isSunday; // Check our flag
        const isPH = publicHolidays.includes(dateStr);
        const yesterdayStr = getYesterday(dateStr);

        dbUsers.forEach(u => {
            if (!rosterMap[dateStr]?.[u.user_id] && !isSafeToAssign(u.user_id, dateStr)) {
                 setShift(dateStr, u.user_id, 'OFF', null);
            }
        });

        // PH Logic
        if (isPH) {
            let candidates = dbUsers.filter(u => ['CE','PAME','NEONATES'].includes(stats[u.user_id].service) && isSafeToAssign(u.user_id, dateStr));
            candidates.sort((a, b) => (stats[a.user_id].nnjCount - stats[b.user_id].nnjCount) || 0.5 - Math.random());
            if (candidates[0]) setShift(dateStr, candidates[0].user_id, 'NNJ', WARD_IDS.CE);
            if (candidates[1]) setShift(dateStr, candidates[1].user_id, 'NNJ', WARD_IDS.CE);
            dbUsers.forEach(u => { if (!rosterMap[dateStr]?.[u.user_id]) setShift(dateStr, u.user_id, 'PH'); });
            return; 
        }

        // --- SPECIFIC ROLES ---
        if (dayData.dayOfWeekIndex === 3) {
            let gp = dbUsers.filter(u => stats[u.user_id].service === 'PAME' && isSafeToAssign(u.user_id, dateStr) && [WARD_IDS.W75, WARD_IDS.W56, WARD_IDS.W62].includes(stats[u.user_id].fixedWardId));
            gp.sort((a, b) => stats[a.user_id].gpapnCount - stats[b.user_id].gpapnCount);
            if (gp[0]) setShift(dateStr, gp[0].user_id, 'GPAPN', WARD_IDS.CE);
        }
        
        // SUNDAY (0) NNJ - Highest Priority for Sunday
        if (isSunday) {
            let nnj = dbUsers.filter(u => ['CE','PAME','NEONATES'].includes(stats[u.user_id].service) && isSafeToAssign(u.user_id, dateStr));
            nnj.sort((a, b) => stats[a.user_id].nnjCount - stats[b.user_id].nnjCount);
            if (nnj[0]) setShift(dateStr, nnj[0].user_id, 'NNJ', WARD_IDS.CE);
            if (nnj[1]) setShift(dateStr, nnj[1].user_id, 'NNJ', WARD_IDS.CE);
        }

        if (!isWeekend) {
            let kh = dbUsers.filter(u => stats[u.user_id].service === 'PAME' && isSafeToAssign(u.user_id, dateStr));
            kh.sort((a, b) => stats[a.user_id].khomeCount - stats[b.user_id].khomeCount);
            if (kh[0]) setShift(dateStr, kh[0].user_id, 'KHOME');
        }

        if (!isWeekend) {
             const getRRT = (list) => dbUsers.filter(u => list.includes(stats[u.user_id].service) && nhomeWeekMap[dayData.weekId] !== u.user_id && isSafeToAssign(u.user_id, dateStr) && !stats[u.user_id].rrtWeeks.has(dayData.weekId) && rosterMap[yesterdayStr]?.[u.user_id]?.shiftId !== RRT_TYPE_ID);
             let pool = [...getRRT(RRT_TIER_1), ...getRRT(RRT_TIER_2), ...getRRT(RRT_TIER_3), ...getRRT(RRT_TIER_4)];
             pool.sort((a,b) => stats[a.user_id].rrtCount - stats[b.user_id].rrtCount);
             if (pool[0]) setShift(dateStr, pool[0].user_id, 'RRT', WARD_IDS.CE);
        }

        // --- RANDOM FILL ---
        dbUsers.forEach(u => {
            if (rosterMap[dateStr]?.[u.user_id]) return;
            if (nhomeWeekMap[dayData.weekId] === u.user_id) { setShift(dateStr, u.user_id, 'OFF'); return; }
            if (!isSafeToAssign(u.user_id, dateStr)) { setShift(dateStr, u.user_id, 'OFF'); return; }

            const svc = stats[u.user_id].service;
            const rdsCount = getRdsThisWeek(u.user_id, dateStr);
            const reachedMaxRD = (rdsCount >= 2);

            let shiftCode = 'AM';

            // SUNDAY OVERRIDE
            if (isSunday) {
                // On Sunday, only NNJ is allowed. If they didn't get NNJ above, they get OFF.
                // We ignore the "reachedMaxRD" rule because the clinic is closed.
                shiftCode = 'OFF';
            }
            // SATURDAY
            else if (isWeekend && !isSunday) {
                if (reachedMaxRD) {
                    shiftCode = Math.random() > 0.5 ? 'AM' : 'PM';
                } else {
                    if (svc === 'PAS') shiftCode = 'OFF';
                    else shiftCode = (Math.random() > WEEKEND_WORK_PROBABILITY) ? 'OFF' : 'AM';
                }
            }
            // WEEKDAY (Mon-Fri)
            else {
                if (reachedMaxRD) {
                    shiftCode = (Math.random() <= AM_RATIO_TARGET) ? 'AM' : 'PM';
                } else {
                    shiftCode = (Math.random() <= AM_RATIO_TARGET) ? 'AM' : 'PM';
                }
            }
            setShift(dateStr, u.user_id, shiftCode);
        });

        // Cleanup
        dbUsers.forEach(u => {
            if (!rosterMap[dateStr]?.[u.user_id]) setShift(dateStr, u.user_id, 'OFF');
        });
    });

    // --- EXPORT ---
    const newShifts = [];
    Object.keys(rosterMap).forEach(d => {
        Object.keys(rosterMap[d]).forEach(uid => {
            if(!rosterMap[d][uid].existing) {
                newShifts.push({ 
                    shift_date: d, 
                    user_id: uid, 
                    shift_type_id: rosterMap[d][uid].shiftId,
                    ward_id: rosterMap[d][uid].wardId
                });
            }
        });
    });

    return newShifts;
}

function toDateStrLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getYesterday(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    return toDateStrLocal(date);
}

function getWeekIdFallback(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    const diff = date.getDate() - dow + (dow === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    return toDateStrLocal(monday);
}

module.exports = { generateRoster };
