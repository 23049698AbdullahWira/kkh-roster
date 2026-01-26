// backend/services/rosterEngine.js

// ==========================================
// 1. CONFIGURATION
// ==========================================
const MAX_CONSECUTIVE_DAYS = 6;
const TARGET_WEEKEND_PERCENTAGE = 0.5; // Target 50% staff working on weekends

// --- WARD DEFINITIONS ---
const WARDS = {
    PAS_85: 16,   
    PAS_55: 6,    
    ONCO_76: 13,  
    ONCO_75: 12,  
    CICU: 3,      
    NICU: 4,
    W65: 10,
    CE: 2
};

// --- WARD POOLS (Distribute staff to real locations) ---
const WARD_POOLS = {
    // Acute: Randomly assigned to CICU or W65
    Acute: [WARDS.CICU, WARDS.W65], 
    
    // Onco: Covers W75 and W76
    Onco: [WARDS.ONCO_75, WARDS.ONCO_76],

    // PAME / CE: General Wards (W31, W56, W62, W63, W66, W82, W83, W86)
    // (Using IDs derived from your previous screenshots)
    General: [5, 7, 8, 9, 11, 14, 15, 17] 
};

const SHIFTS = {
    AM: 'AM', PM: 'PM', STR: '8-5', RRT: 'RRT', 
    NNJ: 'NNJ', NHOME: 'NHOME', RD: 'RD'
};

const toDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getWeekNumber = (date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDays = (date - startOfYear) / 86400000;
    return Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
};

// --- HELPER: PICK A WARD BASED ON SERVICE ---
const getAssignedWard = (userService) => {
    let pool = [];

    if (userService === 'Acute') pool = WARD_POOLS.Acute;
    else if (userService === 'Onco') pool = WARD_POOLS.Onco;
    else pool = WARD_POOLS.General; // PAME, CE, etc.

    // Pick random ward from the allowed pool
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
};

// ==========================================
// 2. THE ENGINE
// ==========================================
async function generateRoster(month, year, rawStaffList, existingShifts) {
    console.log(`Starting Safe Auto-Fill for ${month} ${year}...`);

    // --- STEP A: PREPARE STAFF ---
    const activeStaff = rawStaffList.filter(u => u.service && u.service !== 'null');
    
    const staffByService = {
        Onco: activeStaff.filter(u => u.service === 'Onco'),
        PAS: activeStaff.filter(u => u.service === 'PAS'),
        CE: activeStaff.filter(u => u.service === 'CE'),
        PAME: activeStaff.filter(u => u.service === 'PAME'),
        Acute: activeStaff.filter(u => u.service === 'Acute'),
        Neonates: activeStaff.filter(u => u.service === 'Neonates'),
    };

    let rosterMap = {};
    let nurseStats = {};

    // Initialize Stats
    activeStaff.forEach(n => {
        nurseStats[n.user_id] = { totalShifts: 0, weekendShifts: 0, consecutiveDays: 0 };
    });

    // --- STEP B: LOAD EXISTING SHIFTS (Crucial for "Gap Filling") ---
    // We load your manual shifts first so the engine works AROUND them.
    existingShifts.forEach(s => {
        const d = s.shift_date.includes('T') ? s.shift_date.split('T')[0] : s.shift_date;
        if (!rosterMap[d]) rosterMap[d] = {};
        
        // Lock this shift in
        rosterMap[d][s.user_id] = { code: s.shift_code, wardId: s.ward_id, isExisting: true };

        // Update stats so the math stays correct
        // (e.g. If you manually assigned 3 shifts, we count them so they don't get overworked)
        if (nurseStats[s.user_id]) {
            if (!['RD', 'DO', 'MC', 'AL', 'HL', 'PH'].includes(s.shift_code)) {
                nurseStats[s.user_id].totalShifts++;
                nurseStats[s.user_id].consecutiveDays++;
            } else {
                nurseStats[s.user_id].consecutiveDays = 0; 
            }
        }
    });

    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Helper: Safely Assign Shift (Won't overwrite manual work)
    const setShift = (dateStr, userId, code, wardId) => {
        if (!rosterMap[dateStr]) rosterMap[dateStr] = {};
        
        // 🔒 SAFETY LOCK: If something is already here (Manual or Auto), DO NOT touch it.
        if (rosterMap[dateStr][userId]) return; 

        rosterMap[dateStr][userId] = { code, wardId, isExisting: false };

        if (code !== SHIFTS.RD) {
            nurseStats[userId].totalShifts++;
            nurseStats[userId].consecutiveDays++;
        } else {
            nurseStats[userId].consecutiveDays = 0;
        }
    };

    // Helper: Check Availability (Respects manual shifts)
    const isAvailable = (userId, dateStr) => {
        if (rosterMap[dateStr]?.[userId]) return false; // Already busy
        if (nurseStats[userId].consecutiveDays >= MAX_CONSECUTIVE_DAYS) return false;
        return true;
    };

    // ============================================================
    // ROSTER GENERATION LAYERS
    // ============================================================
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthIndex, day, 12);
        const dateStr = toDateString(dateObj);
        const weekNum = getWeekNumber(dateObj);
        const dayOfWeek = dateObj.getDay(); 
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        // --- LAYER 1: STRICT ROLES (PAS & ONCO) ---
        if (isWeekend) {
            // Weekends: Use "General" pool location for RDs
            staffByService.PAS.forEach(u => setShift(dateStr, u.user_id, SHIFTS.RD, WARDS.CE));
            staffByService.Onco.forEach(u => setShift(dateStr, u.user_id, SHIFTS.RD, WARDS.CE));
        } else {
            // PAS Logic (Fixed Wards 85/55)
            staffByService.PAS.forEach((u, idx) => {
                if (isAvailable(u.user_id, dateStr)) {
                    setShift(dateStr, u.user_id, SHIFTS.AM, idx === 0 ? WARDS.PAS_85 : WARDS.PAS_55);
                }
            });
            // Onco Leader (Fixed W76)
            if (staffByService.Onco.length > 0) {
                const apnA = staffByService.Onco[0];
                if (isAvailable(apnA.user_id, dateStr)) setShift(dateStr, apnA.user_id, SHIFTS.STR, WARDS.ONCO_76);
            }
        }

        // --- LAYER 2: SPECIALIZED TASKS ---
        
        // A. NNJ@Home (Neonates) -> Fixed Ward: NICU
        const neonatesTeam = staffByService.Neonates;
        if (neonatesTeam.length > 0) {
            const activeNeonatesIdx = weekNum % neonatesTeam.length; 
            const activeNeonate = neonatesTeam[activeNeonatesIdx];
            if (isAvailable(activeNeonate.user_id, dateStr)) {
                setShift(dateStr, activeNeonate.user_id, SHIFTS.NHOME, WARDS.NICU);
            }
        }

        // B. RRT (Weekdays) - STRICT ALTERNATION
        if (!isWeekend) {
            const priorityOrder = [staffByService.Acute, staffByService.CE, staffByService.Onco, staffByService.PAS, staffByService.PAME];
            let rrtAssigned = false;
            
            // 1. Calculate Yesterday's Date
            const yesterdayObj = new Date(dateObj);
            yesterdayObj.setDate(dateObj.getDate() - 1);
            const yesterdayStr = toDateString(yesterdayObj);

            for (const group of priorityOrder) {
                if (rrtAssigned) break;

                // 2. Filter available people first
                let candidates = group.filter(u => isAvailable(u.user_id, dateStr));

                // 3. CHECK HISTORY: Did anyone in this group do RRT yesterday?
                // We look at the rosterMap for yesterday to see if anyone here had code 'RRT'
                const tiredPerson = candidates.find(u => 
                    rosterMap[yesterdayStr]?.[u.user_id]?.code === SHIFTS.RRT
                );

                if (tiredPerson) {
                    // If Justin did RRT yesterday, put him at the VERY END of the list
                    candidates = candidates.filter(u => u.user_id !== tiredPerson.user_id); // Remove him
                    candidates.push(tiredPerson); // Add him back at the end (as backup only)
                } else {
                    // If nobody worked yesterday (or it was Sunday), just shuffle randomly to be fair
                    candidates.sort(() => Math.random() - 0.5);
                }

                // 4. Assign to the first person in our smart list
                if (candidates.length > 0) {
                    setShift(dateStr, candidates[0].user_id, SHIFTS.RRT, WARDS.CE);
                    rrtAssigned = true;
                }
            }
        }

        // C. NNJ Clinic (Sunday) -> Fixed Location: General/CE
        if (dayOfWeek === 0) { 
            const nnjPool = [...staffByService.PAME, ...staffByService.CE, ...staffByService.Neonates];
            nnjPool.sort((a, b) => nurseStats[a.user_id].weekendShifts - nurseStats[b.user_id].weekendShifts);
            let assignedCount = 0;
            for (const u of nnjPool) {
                if (assignedCount >= 2) break;
                if (isAvailable(u.user_id, dateStr)) {
                    setShift(dateStr, u.user_id, SHIFTS.NNJ, WARDS.CE);
                    nurseStats[u.user_id].weekendShifts++;
                    assignedCount++;
                }
            }
        }

        // --- LAYER 3: GENERAL COVERAGE (REAL WARD DISTRIBUTION) ---
        const remainingStaff = activeStaff.filter(u => isAvailable(u.user_id, dateStr));
        remainingStaff.sort(() => Math.random() - 0.5);

        remainingStaff.forEach(u => {
            // Weekend Skeleton Logic
            if (isWeekend) {
                if (nurseStats[u.user_id].weekendShifts >= 4 || Math.random() > TARGET_WEEKEND_PERCENTAGE) {
                    setShift(dateStr, u.user_id, SHIFTS.RD, WARDS.CE);
                    return;
                }
            }

            // Assign Shift Type
            let code = SHIFTS.RD;
            if (u.service === 'CE') {
                code = Math.random() > 0.5 ? SHIFTS.AM : SHIFTS.PM;
            } else if (isWeekend) {
                code = SHIFTS.AM;
                nurseStats[u.user_id].weekendShifts++;
            } else {
                code = Math.random() > 0.4 ? SHIFTS.PM : SHIFTS.AM;
            }

            if (code !== SHIFTS.RD) {
                // Pick a real ward based on their Service
                const assignedWard = getAssignedWard(u.service);
                setShift(dateStr, u.user_id, code, assignedWard);
            }
        });

        // --- LAYER 4: CLEANUP ---
        activeStaff.forEach(u => {
            if (!rosterMap[dateStr]?.[u.user_id]) {
                setShift(dateStr, u.user_id, SHIFTS.RD, WARDS.CE);
            }
        });
    }

    // --- STEP C: EXPORT ONLY NEW SHIFTS ---
    const newShiftsArray = [];
    Object.keys(rosterMap).forEach(date => {
        Object.keys(rosterMap[date]).forEach(userId => {
            const assignment = rosterMap[date][userId];
            // Only save if it was NOT existing (i.e., newly generated)
            if (assignment.isExisting === false) {
                newShiftsArray.push({
                    user_id: userId,
                    shift_date: date,
                    shift_code: assignment.code,
                    ward_id: assignment.wardId
                });
            }
        });
    });

    console.log(`Generated ${newShiftsArray.length} NEW shifts.`);
    return newShiftsArray;
}

module.exports = { generateRoster };