// backend/services/rosterEngine.js

// --- 1. ROBUST DATE HELPER ---
const toDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// --- CONFIGURATION ---
const REST_CODE = 'DO'; 
const MAX_SHIFTS = 22;

// ⚠️ UPDATED BASED ON YOUR SCREENSHOT (IDs 2 through 20)
const ACTIVE_WARDS = [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20
]; 

const wasNightShift = (prevCode) => ['PM', 'ND', 'N'].includes(prevCode);

async function generateRoster(month, year, staffList, existingShifts) {
    console.log(`Starting Smart Auto-Fill for ${month} ${year}...`);
    
    let rosterMap = {};
    let nurseStats = {};

    // 0. Initialize Stats
    staffList.forEach(n => {
        nurseStats[n.user_id] = { totalShifts: 0 };
    });

    // 1. Load Existing Data
    existingShifts.forEach(s => {
        const d = s.shift_date.includes('T') ? s.shift_date.split('T')[0] : s.shift_date;
        
        if (!rosterMap[d]) rosterMap[d] = {};
        
        rosterMap[d][s.user_id] = { 
            code: s.shift_code, 
            wardId: s.ward_id,
            isExisting: true 
        };

        if (nurseStats[s.user_id] && ![REST_CODE, 'RD', 'MC', 'AL'].includes(s.shift_code)) {
            nurseStats[s.user_id].totalShifts++;
        }
    });

    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Helper: Pick a random ward for Work
    const getRandomWard = () => {
        const randomIndex = Math.floor(Math.random() * ACTIVE_WARDS.length);
        return ACTIVE_WARDS[randomIndex];
    };

    // Helper: Get a SAFE ward for Rest Days (Uses the first valid one: ID 2)
    const getRestWard = () => ACTIVE_WARDS[0]; 

    const setShift = (dateStr, userId, code, wardId) => {
        if (!rosterMap[dateStr]) rosterMap[dateStr] = {};
        if (rosterMap[dateStr][userId]) return; // Don't overwrite

        rosterMap[dateStr][userId] = { 
            code: code, 
            wardId: wardId,
            isExisting: false 
        };

        if (code !== REST_CODE) {
            nurseStats[userId].totalShifts++;
        }
    };

    // ============================================================
    // PHASE 1: FILL WEEKENDS
    // ============================================================
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthIndex, day, 12, 0, 0);
        
        if (dateObj.getDay() === 6) { // Saturday
            const satDateStr = toDateString(dateObj);
            const sunDateObj = new Date(dateObj);
            sunDateObj.setDate(dateObj.getDate() + 1);
            const sunDateStr = toDateString(sunDateObj);

            if (sunDateObj.getMonth() !== monthIndex) continue;

            const availableStaff = [...staffList].sort((a, b) => 
                nurseStats[a.user_id].totalShifts - nurseStats[b.user_id].totalShifts
            );

            const cutoffIndex = Math.floor(staffList.length * 0.6);

            availableStaff.forEach((nurse, index) => {
                const uid = nurse.user_id;
                const workWard = getRandomWard();
                const restWard = getRestWard(); // <--- Will be 2

                if (index < cutoffIndex) {
                    // WORK
                    if (!rosterMap[satDateStr]?.[uid]) {
                        setShift(satDateStr, uid, (Math.random() > 0.5 ? 'AM' : 'PM'), workWard);
                    }
                    if (!rosterMap[sunDateStr]?.[uid]) {
                        if (Math.random() < 0.2) setShift(sunDateStr, uid, 'NNJ', workWard);
                        else setShift(sunDateStr, uid, (Math.random() > 0.5 ? 'AM' : 'PM'), workWard);
                    }
                } else {
                    // REST
                    if (!rosterMap[satDateStr]?.[uid]) setShift(satDateStr, uid, REST_CODE, restWard);
                    if (!rosterMap[sunDateStr]?.[uid]) setShift(sunDateStr, uid, REST_CODE, restWard);
                }
            });
        }
    }

    // ============================================================
    // PHASE 2: FILL WEEKDAYS
    // ============================================================
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthIndex, day, 12, 0, 0);
        const dateStr = toDateString(dateObj);
        const dayOfWeek = dateObj.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const shuffledStaff = [...staffList].sort(() => Math.random() - 0.5);

        shuffledStaff.forEach(nurse => {
            const uid = nurse.user_id;
            const workWard = getRandomWard();
            const restWard = getRestWard(); // <--- Will be 2

            if (rosterMap[dateStr]?.[uid]) return;

            if (nurseStats[uid].totalShifts >= MAX_SHIFTS) {
                setShift(dateStr, uid, REST_CODE, restWard);
                return;
            }

            const prevDate = new Date(dateObj);
            prevDate.setDate(day - 1);
            const prevDateStr = toDateString(prevDate);
            const prevShift = rosterMap[prevDateStr]?.[uid]?.code;

            if (Math.random() < 0.85) {
                if (wasNightShift(prevShift)) {
                    setShift(dateStr, uid, 'PM', workWard);
                } else {
                    setShift(dateStr, uid, (Math.random() > 0.5 ? 'AM' : 'PM'), workWard);
                }
            } else {
                setShift(dateStr, uid, REST_CODE, restWard);
            }
        });
    }

    // ============================================================
    // PHASE 3: FINAL SWEEP (Fill ALL gaps)
    // ============================================================
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthIndex, day, 12, 0, 0);
        const dateStr = toDateString(dateObj);

        staffList.forEach(nurse => {
            const uid = nurse.user_id;
            // If still empty, fill with DO using a Valid Ward ID (2)
            if (!rosterMap[dateStr]?.[uid]) {
                setShift(dateStr, uid, REST_CODE, getRestWard());
            }
        });
    }

    // Export
    const newShiftsArray = [];
    Object.keys(rosterMap).forEach(date => {
        Object.keys(rosterMap[date]).forEach(userId => {
            const assignment = rosterMap[date][userId];
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