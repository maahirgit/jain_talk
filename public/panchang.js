// Jain Panchang Logic and UI Renderer

const tithiNames = [
    "Ekam", "Beej", "Trij", "Choth", "Pancham", 
    "Chhath", "Saatam", "Aatham", "Nom", "Dasham", 
    "Agyaras", "Baras", "Teras", "Chaudas", "Poonam",
    "Ekam", "Beej", "Trij", "Choth", "Pancham", 
    "Chhath", "Saatam", "Aatham", "Nom", "Dasham", 
    "Agyaras", "Baras", "Teras", "Chaudas", "Amas"
];

// Helper to calculate approximate Tithi based on Moon Phase
function calculateTithi(date) {
    const knownNewMoon = new Date(Date.UTC(2026, 5, 14, 12, 44, 0));
    const synodicMonth = 29.530588 * 24 * 60 * 60 * 1000;
    const diff = date.getTime() - knownNewMoon.getTime();
    const phase = (diff % synodicMonth) / synodicMonth;
    let tithiIndex = Math.floor(phase * 30);
    if(tithiIndex < 0) tithiIndex += 30;
    if(tithiIndex > 29) tithiIndex = 29;
    
    const isShukla = tithiIndex < 15;
    const paksha = isShukla ? "Sud" : "Vad";
    
    return {
        name: tithiNames[tithiIndex],
        fullName: tithiNames[tithiIndex] + " (" + paksha + ")",
        paksha: paksha,
        index: tithiIndex
    };
}

// Format time
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Global cache for timings
const timingsCache = {};

// Default coordinates (Ahmedabad)
let userLat = 23.0225;
let userLng = 72.5714;

// Try to get user location initially if not set
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            // Only use if they selected "auto" or if we want to default to auto
            // For now, Ahmedabad is default in HTML dropdown, so we don't forcefully overwrite
        },
        (err) => console.log("Geolocation denied or unavailable.")
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('panchang-city-select');
    
    // Helper to refresh dashboard card
    const refreshDashboardCard = async () => {
        const today = new Date();
        const cardSunrise = document.getElementById('card-sunrise');
        if (cardSunrise) {
            const timings = await fetchTimings(today);
            cardSunrise.textContent = formatTime(timings.sunrise);
            document.getElementById('card-sunset').textContent = formatTime(timings.sunset);
            document.getElementById('card-navkarsi').textContent = timings.navkarsi;
            document.getElementById('card-porshi').textContent = timings.porshi;
        }
    };

    if (citySelect) {
        // Load saved location
        const savedLocation = localStorage.getItem('panchang-location');
        if (savedLocation) {
            citySelect.value = savedLocation;
            if (savedLocation === 'auto') {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        userLat = pos.coords.latitude;
                        userLng = pos.coords.longitude;
                        Object.keys(timingsCache).forEach(k => delete timingsCache[k]);
                        refreshDashboardCard();
                    }, () => {
                        citySelect.value = "23.0225,72.5714";
                        localStorage.setItem('panchang-location', citySelect.value);
                    });
                }
            } else {
                const parts = savedLocation.split(',');
                if (parts.length === 2) {
                    userLat = parseFloat(parts[0]);
                    userLng = parseFloat(parts[1]);
                }
            }
        }
    
        citySelect.addEventListener('change', (e) => {
            const val = e.target.value;
            localStorage.setItem('panchang-location', val);
            
            if (val === 'auto') {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        userLat = pos.coords.latitude;
                        userLng = pos.coords.longitude;
                        Object.keys(timingsCache).forEach(k => delete timingsCache[k]);
                        renderCalendar(currentYear, currentMonth);
                        refreshDashboardCard();
                    }, () => {
                        alert("Geolocation access denied or unavailable.");
                        citySelect.value = "23.0225,72.5714"; // Revert to Ahmedabad
                        localStorage.setItem('panchang-location', "23.0225,72.5714");
                    });
                } else {
                    alert("Geolocation is not supported by this browser.");
                    citySelect.value = "23.0225,72.5714";
                    localStorage.setItem('panchang-location', "23.0225,72.5714");
                }
            } else {
                const parts = val.split(',');
                userLat = parseFloat(parts[0]);
                userLng = parseFloat(parts[1]);
                // Clear cache so it fetches new times
                Object.keys(timingsCache).forEach(k => delete timingsCache[k]);
                renderCalendar(currentYear, currentMonth);
                refreshDashboardCard();
            }
        });
    }
});

// Generate Jain Timings based on API
async function fetchTimings(date) {
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    
    if (timingsCache[dateStr]) {
        return timingsCache[dateStr];
    }
    
    try {
        const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${userLat}&lng=${userLng}&date=${dateStr}&formatted=0`);
        const data = await res.json();
        
        if (data.status === "OK") {
            const sunrise = new Date(data.results.sunrise);
            const sunset = new Date(data.results.sunset);
            
            const navkarsi = new Date(sunrise.getTime() + 48 * 60000);
            const porshi = new Date(sunrise.getTime() + 180 * 60000);
            const sadhPorshi = new Date(sunrise.getTime() + 270 * 60000);
            const purimaddh = new Date(sunrise.getTime() + 360 * 60000);
            
            const timings = {
                sunrise: sunrise,
                sunset: sunset,
                navkarsi: formatTime(navkarsi),
                porshi: formatTime(porshi),
                sadhPorshi: formatTime(sadhPorshi),
                purimaddh: formatTime(purimaddh)
            };
            timingsCache[dateStr] = timings;
            return timings;
        }
    } catch(e) {
        console.error("Failed to fetch timings", e);
    }
    
    // Fallback if API fails
    const sunrise = new Date(date);
    sunrise.setHours(6, 15, 0);
    const sunset = new Date(date);
    sunset.setHours(19, 10, 0);
    const navkarsi = new Date(sunrise.getTime() + 48 * 60000);
    const porshi = new Date(sunrise.getTime() + 180 * 60000);
    const sadhPorshi = new Date(sunrise.getTime() + 270 * 60000);
    const purimaddh = new Date(sunrise.getTime() + 360 * 60000);

    return {
        sunrise: sunrise,
        sunset: sunset,
        navkarsi: formatTime(navkarsi),
        porshi: formatTime(porshi),
        sadhPorshi: formatTime(sadhPorshi),
        purimaddh: formatTime(purimaddh)
    };
}

function getGoodDayChoghadiyas(date, sunrise, sunset) {
    const day = date.getDay(); // 0-6
    const daySequences = [
        ["Udveg", "Chal", "Labh", "Amrit", "Kal", "Shubh", "Rog", "Udveg"], // Sun
        ["Amrit", "Kal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit"], // Mon
        ["Rog", "Udveg", "Chal", "Labh", "Amrit", "Kal", "Shubh", "Rog"], // Tue
        ["Labh", "Amrit", "Kal", "Shubh", "Rog", "Udveg", "Chal", "Labh"], // Wed
        ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kal", "Shubh"], // Thu
        ["Chal", "Labh", "Amrit", "Kal", "Shubh", "Rog", "Udveg", "Chal"], // Fri
        ["Kal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kal"] // Sat
    ];
    
    const nightSequences = [
        ["Shubh", "Amrit", "Chal", "Rog", "Kal", "Labh", "Udveg", "Shubh"], // Sun
        ["Rog", "Kal", "Labh", "Udveg", "Shubh", "Amrit", "Chal", "Rog"], // Mon
        ["Kal", "Labh", "Udveg", "Shubh", "Amrit", "Chal", "Rog", "Kal"], // Tue
        ["Udveg", "Shubh", "Amrit", "Chal", "Rog", "Kal", "Labh", "Udveg"], // Wed
        ["Amrit", "Chal", "Rog", "Kal", "Labh", "Udveg", "Shubh", "Amrit"], // Thu
        ["Rog", "Kal", "Labh", "Udveg", "Shubh", "Amrit", "Chal", "Rog"], // Fri
        ["Labh", "Udveg", "Shubh", "Amrit", "Chal", "Rog", "Kal", "Labh"] // Sat
    ];
    
    const daySeq = daySequences[day];
    const nightSeq = nightSequences[day];
    
    const dayDurationMs = (sunset.getTime() - sunrise.getTime()) / 8;
    const nightDurationMs = ((24 * 60 * 60 * 1000) - (sunset.getTime() - sunrise.getTime())) / 8;
    
    let goodOnes = [];
    
    // Day Choghadiyas
    for(let i = 0; i < 8; i++) {
        if(["Amrit", "Shubh", "Labh"].includes(daySeq[i])) {
            let start = new Date(sunrise.getTime() + i * dayDurationMs);
            let end = new Date(sunrise.getTime() + (i + 1) * dayDurationMs);
            goodOnes.push({
                name: daySeq[i] + " (Day)",
                time: formatTime(start) + " - " + formatTime(end)
            });
        }
    }
    
    // Night Choghadiyas
    for(let i = 0; i < 8; i++) {
        if(["Amrit", "Shubh", "Labh"].includes(nightSeq[i])) {
            let start = new Date(sunset.getTime() + i * nightDurationMs);
            let end = new Date(sunset.getTime() + (i + 1) * nightDurationMs);
            goodOnes.push({
                name: nightSeq[i] + " (Night)",
                time: formatTime(start) + " - " + formatTime(end)
            });
        }
    }
    
    return goodOnes;
}

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDate = new Date();

async function renderCalendar(year, month) {
    const container = document.getElementById('panchang-content-container');
    if (!container) return;
    
    // Show loading state briefly
    const previousHtml = container.innerHTML;
    container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-light);"><span style="display:inline-block; animation: pulse 1.5s infinite;">Fetching exact astronomical timings...</span></div>`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[month];

    let html = `
        <div class="calendar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
            <button id="prev-month" style="background: none; border: none; cursor: pointer; color: var(--primary-color); font-size: 1.2rem;">&laquo; Prev</button>
            <h3 style="margin: 0; color: var(--primary-dark);">${monthName} ${year}</h3>
            <button id="next-month" style="background: none; border: none; cursor: pointer; color: var(--primary-color); font-size: 1.2rem;">Next &raquo;</button>
        </div>
        <div class="calendar-grid">
            <div class="cal-day-header">Sun</div>
            <div class="cal-day-header">Mon</div>
            <div class="cal-day-header">Tue</div>
            <div class="cal-day-header">Wed</div>
            <div class="cal-day-header">Thu</div>
            <div class="cal-day-header">Fri</div>
            <div class="cal-day-header">Sat</div>
    `;

    let date = 1;
    for (let i = 0; i < 42; i++) {
        if (i < startingDay || date > totalDays) {
            html += `<div class="cal-day empty"></div>`;
        } else {
            let currentDate = new Date(year, month, date);
            let tithi = calculateTithi(currentDate);
            let isSelected = currentDate.toDateString() === selectedDate.toDateString();
            
            let isParva = ["Pancham", "Aatham", "Chaudas"].includes(tithi.name);
            let bg = isSelected ? 'var(--primary-color)' : (isParva ? '#FFF3E0' : 'white');
            let color = isSelected ? 'white' : (isParva ? '#E65100' : 'var(--text-dark)');
            let border = isSelected ? 'none' : (isParva ? '1px solid #FFCC80' : '1px solid var(--border-color)');
            let fontWeight = isParva ? '700' : '600';
            
            html += `
                <div class="cal-day" data-date="${date}" style="background: ${bg}; color: ${color}; border: ${border}; font-weight: ${fontWeight};">
                    <div class="cal-date-num">${date}</div>
                    <div class="cal-tithi-name">${tithi.name}</div>
                </div>
            `;
            date++;
        }
    }

    html += `</div>`;
    
    // Day Details Section
    let sDate = selectedDate;
    let sTithi = calculateTithi(sDate);
    let sTimings = await fetchTimings(sDate);
    const dateString = sDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    html += `
        <div class="panchang-details-container" style="background: #FFF8E1; padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,193,7,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <h4 style="margin: 0; color: var(--primary-dark); font-size: 1.2rem;">${dateString}</h4>
                    <p style="margin: 0.2rem 0 0 0; color: var(--text-light); font-size: 0.9rem;">Tithi: <strong style="color: var(--primary-color);">${sTithi.fullName}</strong></p>
                </div>
            </div>
            
            <div class="panchang-grid">
                <div class="panchang-item">
                    <span class="p-label">Sunrise</span>
                    <span class="p-value highlight-sun">${formatTime(sTimings.sunrise)}</span>
                </div>
                <div class="panchang-item">
                    <span class="p-label">Sunset</span>
                    <span class="p-value highlight-sun">${formatTime(sTimings.sunset)}</span>
                </div>
                <div class="panchang-item">
                    <span class="p-label">Navkarsi</span>
                    <span class="p-value">${sTimings.navkarsi}</span>
                </div>
                <div class="panchang-item">
                    <span class="p-label">Porshi</span>
                    <span class="p-value">${sTimings.porshi}</span>
                </div>
                <div class="panchang-item">
                    <span class="p-label">Sadh-Porshi</span>
                    <span class="p-value">${sTimings.sadhPorshi}</span>
                </div>
                <div class="panchang-item">
                    <span class="p-label">Purimaddh</span>
                    <span class="p-value">${sTimings.purimaddh}</span>
                </div>
            </div>
            
            <h5 style="margin: 1.5rem 0 0.5rem 0; color: var(--primary-dark); font-size: 1rem;">Auspicious Timings (Choghadiya)</h5>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${getGoodDayChoghadiyas(sDate, sTimings.sunrise, sTimings.sunset).map(c => `
                    <div style="background: white; padding: 0.6rem 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary-color);">
                        <span style="font-weight: 600; color: var(--primary-dark);">${c.name}</span>
                        <span style="font-size: 0.85rem; color: var(--text-dark);">${c.time}</span>
                    </div>
                `).join('')}
            </div>
            <p style="font-size: 0.75rem; text-align: center; color: var(--text-light); margin-top: 1rem; margin-bottom: 0;"><strong>Note:</strong> Timings are approximate standard calculations.</p>
        </div>
    `;

    container.innerHTML = html;

    // Attach events
    document.getElementById('prev-month').onclick = () => {
        let currentMonthDate = new Date(year, month - 1, 1);
        renderCalendar(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
    };
    document.getElementById('next-month').onclick = () => {
        let currentMonthDate = new Date(year, month + 1, 1);
        renderCalendar(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
    };

    const days = document.querySelectorAll('.cal-day');
    days.forEach(day => {
        day.onclick = (e) => {
            const dateNum = parseInt(e.currentTarget.getAttribute('data-date'));
            selectedDate = new Date(year, month, dateNum);
            renderCalendar(year, month);
        };
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    
    // Update card display
    const cardTithiDisplay = document.getElementById('card-tithi-display');
    const cardDateDisplay = document.getElementById('card-date-display');
    if (cardTithiDisplay && cardDateDisplay) {
        const today = new Date();
        const tithi = calculateTithi(today);
        
        cardTithiDisplay.textContent = tithi.fullName;
        cardDateDisplay.textContent = today.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (document.getElementById('card-sunrise')) {
            const timings = await fetchTimings(today);
            document.getElementById('card-sunrise').textContent = formatTime(timings.sunrise);
            document.getElementById('card-sunset').textContent = formatTime(timings.sunset);
            document.getElementById('card-navkarsi').textContent = timings.navkarsi;
            document.getElementById('card-porshi').textContent = timings.porshi;
        }

        // Show Parva Banner if today is a Parva Tithi
        const isParva = ["Pancham", "Aatham", "Chaudas"].includes(tithi.name);
        const parvaBanner = document.getElementById('parva-tithi-banner');
        if (parvaBanner && isParva) {
            document.getElementById('parva-tithi-name').textContent = tithi.fullName;
            parvaBanner.style.display = 'flex';
        }
    }

    if(document.getElementById('panchang-content-container')) {
        renderCalendar(selectedDate.getFullYear(), selectedDate.getMonth());
        
        // Add robust event listeners for opening and closing the modal
        const openBtn = document.getElementById('open-panchang-btn');
        const modal = document.getElementById('panchang-modal');
        const closeBtn = document.getElementById('close-panchang-modal');
        
        if (openBtn && modal) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                modal.style.display = 'flex';
                // Render fresh on open
                selectedDate = new Date();
                renderCalendar(selectedDate.getFullYear(), selectedDate.getMonth());
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                modal.style.display = 'none';
            });
        }
    }
    
    if (window.updateAlertsBadge) {
        window.updateAlertsBadge();
    }
});

// Alerts Modal Logic
window.updateAlertsBadge = async function() {
    let count = 0;
    const today = new Date();
    const eventEndDate = new Date('September 26, 2026 23:59:59');
    if (today <= eventEndDate) count++;
    
    const todayTithi = calculateTithi(today);
    const parvaTithis = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"];
    if (parvaTithis.includes(todayTithi.name)) count++;
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTithi = calculateTithi(tomorrow);
    if (parvaTithis.includes(tomorrowTithi.name)) count++;
    
    // Check Timing Alerts (Navkarsi & Sunset)
    const timings = await fetchTimings(today);
    if (timings && timings.sunrise && timings.sunset) {
        const navkarsiTime = new Date(timings.sunrise.getTime() + 48 * 60000);
        const sunsetTime = timings.sunset;
        
        const navDiff = (navkarsiTime - today) / 60000;
        if (navDiff > 0 && navDiff <= 30) count++;
        
        const sunsetDiff = (sunsetTime - today) / 60000;
        if (sunsetDiff > 0 && sunsetDiff <= 30) count++;
    }
    
    const dBadge = document.getElementById('desktop-alerts-badge');
    const mBadge = document.getElementById('mobile-alerts-badge');
    if (dBadge) {
        dBadge.textContent = count;
        dBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (mBadge) {
        mBadge.textContent = count;
        mBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    return count;
};

window.generateAlerts = async function() {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    container.innerHTML = '';
    const today = new Date();
    
    // Add Ongoing Event Alert (Auto clears after Sept 26)
    const eventEndDate = new Date('September 26, 2026 23:59:59');
    if (today <= eventEndDate) {
        const eventAlert = document.createElement('div');
        eventAlert.style.padding = '1rem';
        eventAlert.style.background = '#FFF3E0';
        eventAlert.style.border = '1px solid #FFCC80';
        eventAlert.style.borderRadius = '12px';
        eventAlert.style.color = '#E65100';
        eventAlert.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="display: inline-block; width: 8px; height: 8px; background: #E65100; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
                Ongoing Event
            </div>
            <div style="font-size: 0.95rem;"><strong>चलो सब आराधना करें</strong> is currently active. Join the daily tracker!</div>
        `;
        container.appendChild(eventAlert);
    }
    
    // Add Timing Alerts (Navkarsi & Sunset)
    const timings = await fetchTimings(today);
    if (timings && timings.sunrise && timings.sunset) {
        const navkarsiTime = new Date(timings.sunrise.getTime() + 48 * 60000);
        const sunsetTime = timings.sunset;
        
        const navDiff = (navkarsiTime - today) / 60000;
        if (navDiff > 0 && navDiff <= 30) {
            const navAlert = document.createElement('div');
            navAlert.style.padding = '1rem';
            navAlert.style.background = '#E8F5E9';
            navAlert.style.border = '1px solid #A5D6A7';
            navAlert.style.borderRadius = '12px';
            navAlert.style.color = '#2E7D32';
            navAlert.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 0.2rem;">Navkarsi Approaching!</div>
                <div style="font-size: 0.95rem;">It's just <strong>${Math.ceil(navDiff)} minutes</strong> for Navkarsi. Stay motivated, you're almost there!</div>
            `;
            container.appendChild(navAlert);
        }
        
        const sunsetDiff = (sunsetTime - today) / 60000;
        if (sunsetDiff > 0 && sunsetDiff <= 30) {
            const sunsetAlert = document.createElement('div');
            sunsetAlert.style.padding = '1rem';
            sunsetAlert.style.background = '#FFEBEE';
            sunsetAlert.style.border = '1px solid #FFCDD2';
            sunsetAlert.style.borderRadius = '12px';
            sunsetAlert.style.color = '#C62828';
            sunsetAlert.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 0.2rem;">Chouvihar Alert</div>
                <div style="font-size: 0.95rem;">Only <strong>${Math.ceil(sunsetDiff)} minutes</strong> left until Sunset. Please finish your dinner before Chouvihar.</div>
            `;
            container.appendChild(sunsetAlert);
        }
    }

    // Calculate Tithi Alerts
    const todayTithi = calculateTithi(today);
    const parvaTithis = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"];
    
    if (parvaTithis.includes(todayTithi.name)) {
        const todayAlert = document.createElement('div');
        todayAlert.style.padding = '1rem';
        todayAlert.style.background = '#FFF5E6';
        todayAlert.style.border = '1px solid #FFD8A8';
        todayAlert.style.borderRadius = '12px';
        todayAlert.style.color = '#E85D04';
        todayAlert.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 0.2rem;">Parva Tithi Today!</div>
            <div style="font-size: 0.95rem;">Today is <strong>${todayTithi.fullName}</strong>.</div>
        `;
        container.appendChild(todayAlert);
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTithi = calculateTithi(tomorrow);
    
    if (parvaTithis.includes(tomorrowTithi.name)) {
        const tomorrowAlert = document.createElement('div');
        tomorrowAlert.style.padding = '1rem';
        tomorrowAlert.style.background = '#E3F2FD';
        tomorrowAlert.style.border = '1px solid #BBDEFB';
        tomorrowAlert.style.borderRadius = '12px';
        tomorrowAlert.style.color = '#1565C0';
        tomorrowAlert.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 0.2rem;">Upcoming Parva Tithi</div>
            <div style="font-size: 0.95rem;">Tomorrow is <strong>${tomorrowTithi.fullName}</strong>. Make your spiritual plans in advance!</div>
        `;
        container.appendChild(tomorrowAlert);
    }
    
    if (container.children.length === 0) {
        container.innerHTML = '<div style="color: var(--text-light); text-align: center; padding: 2rem;">No new alerts at this time.</div>';
    }
};
