// backend/services/rosterEngine.js

const toDateString = (date) => date.toISOString().split('T')[0];

async function generateRoster(month, year, staffList, existingShifts) {
    console.log(`Starting Auto-Fill for ${month} ${year}...`);
    
    let rosterMap = {};

    // 1. Load Existing Data
    existingShifts.forEach(s => {
        const d = s.shift_date.split('T')[0];
        if (!rosterMap[d]) rosterMap[d] = {};
        rosterMap[d][s.user_id] = { code: s.shift_code, wardId: s.ward_id };
    });

    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    // 2. Loop through every DAY
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthIndex, day, 12, 0, 0); 
        const dateStr = toDateString(dateObj);
        
        if (!rosterMap[dateStr]) rosterMap[dateStr] = {};

        // 3. Loop through every NURSE (Staff List)
        // Instead of filling slots, let's find work for every nurse!
        staffList.forEach(nurse => {
            // A. Is this nurse already working today?
            if (rosterMap[dateStr][nurse.user_id]) return; // Skip if yes

            // B. Simple Rule: 
            // If they are not working, give them an 'AM' shift in their usual ward?
            // (Or random AM/PM distribution)
            
            // Randomly decide AM (70% chance) or PM (30% chance)
            const shiftType = Math.random() > 0.3 ? 'AM' : 'PM';
            
            // Assign them to a ward
            // Ideally, we assign them to their "home ward" if known, 
            // otherwise we pick a random ward from your list (11, 8, 2, 7, etc)
            
            // Let's assume we cycle through wards if we don't know their home
            const targetWardId = nurse.ward_id || [11, 8, 2, 7][Math.floor(Math.random() * 4)];

            // ASSIGN
            rosterMap[dateStr][nurse.user_id] = { 
                code: shiftType, 
                wardId: targetWardId 
            };
        });
    }

    // 4. Convert to Array for Saving
    const newShiftsArray = [];
    Object.keys(rosterMap).forEach(date => {
        Object.keys(rosterMap[date]).forEach(userId => {
            const assignment = rosterMap[date][userId];
            newShiftsArray.push({
                user_id: userId,
                shift_date: date,
                shift_code: assignment.code,
                ward_id: assignment.wardId
            });
        });
    });

    return newShiftsArray;
}

module.exports = { generateRoster };