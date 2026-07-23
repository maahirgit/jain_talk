// Jain Panchang Logic and UI Renderer

const tithiNames = [
    "Ekam (1st)", "Beej (2nd)", "Trij (3rd)", "Choth (4th)", "Pancham (5th)", 
    "Chhath (6th)", "Saatam (7th)", "Aatham (8th)", "Nom (9th)", "Dasham (10th)", 
    "Agyaras (11th)", "Baras (12th)", "Teras (13th)", "Chaudas (14th)", "Poonam (15th)",
    "Ekam (1st)", "Beej (2nd)", "Trij (3rd)", "Choth (4th)", "Pancham (5th)", 
    "Chhath (6th)", "Saatam (7th)", "Aatham (8th)", "Nom (9th)", "Dasham (10th)", 
    "Agyaras (11th)", "Baras (12th)", "Teras (13th)", "Chaudas (14th)", "Amas (New Moon)"
];

// Helper to calculate approximate Tithi based on Moon Phase
function calculateTithi(date) {
    // Known New Moon: June 14, 2026, 12:44 UTC
    const knownNewMoon = new Date(Date.UTC(2026, 5, 14, 12, 44, 0));
    const synodicMonth = 29.530588 * 24 * 60 * 60 * 1000; // in milliseconds
    
    const diff = date.getTime() - knownNewMoon.getTime();
    const phase = (diff % synodicMonth) / synodicMonth;
    
    // Tithi length is exactly 1/30th of a synodic month
    let tithiIndex = Math.floor(phase * 30);
    
    // Safety clamp
    if(tithiIndex < 0) tithiIndex += 30;
    if(tithiIndex > 29) tithiIndex = 29;
    
    const isShukla = tithiIndex < 15;
    const paksha = isShukla ? "Shukla Paksha (Sud)" : "Krishna Paksha (Vad)";
    
    return {
        name: tithiNames[tithiIndex],
        paksha: paksha,
        index: tithiIndex
    };
}

// Format time as HH:MM AM/PM
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Generate Jain Timings based on a generic Sunrise/Sunset (approx 6:00 AM to 7:00 PM for summer)
function generateTimings(date) {
    // Defaulting to approx summer timings. 
    // In a production app, we would use geolocation and a library like suncalc.
    const sunrise = new Date(date);
    sunrise.setHours(6, 15, 0);
    
    const sunset = new Date(date);
    sunset.setHours(19, 10, 0);

    // Navkarsi = 48 minutes after Sunrise
    const navkarsi = new Date(sunrise.getTime() + 48 * 60000);
    
    // Porshi = 3 hours after Sunrise
    const porshi = new Date(sunrise.getTime() + 180 * 60000);
    
    // Sadh-Porshi = 4.5 hours after Sunrise
    const sadhPorshi = new Date(sunrise.getTime() + 270 * 60000);
    
    // Purimaddh = 6 hours after Sunrise
    const purimaddh = new Date(sunrise.getTime() + 360 * 60000);

    return {
        sunrise: formatTime(sunrise),
        sunset: formatTime(sunset),
        navkarsi: formatTime(navkarsi),
        porshi: formatTime(porshi),
        sadhPorshi: formatTime(sadhPorshi),
        purimaddh: formatTime(purimaddh)
    };
}

// Render the Panchang UI
function renderPanchang() {
    const container = document.getElementById('panchang-content-container');
    if(!container) return;

    const today = new Date();
    const tithi = calculateTithi(today);
    const timings = generateTimings(today);
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString('en-IN', options);

    const html = `
        <div class="panchang-header">
            <h3>Today's Panchang</h3>
            <p>${dateString}</p>
        </div>
        
        <div class="panchang-tithi-card">
            <div class="tithi-icon">🌙</div>
            <div class="tithi-info">
                <h4>${tithi.name}</h4>
                <p>${tithi.paksha}</p>
            </div>
            <div class="tithi-badge">1 Tithi</div>
        </div>

        <div class="panchang-grid">
            <div class="panchang-item">
                <span class="p-label">Sunrise</span>
                <span class="p-value highlight-sun">${timings.sunrise}</span>
            </div>
            <div class="panchang-item">
                <span class="p-label">Sunset</span>
                <span class="p-value highlight-sun">${timings.sunset}</span>
            </div>
            <div class="panchang-item">
                <span class="p-label">Navkarsi</span>
                <span class="p-value">${timings.navkarsi}</span>
            </div>
            <div class="panchang-item">
                <span class="p-label">Porshi</span>
                <span class="p-value">${timings.porshi}</span>
            </div>
            <div class="panchang-item">
                <span class="p-label">Sadh-Porshi</span>
                <span class="p-value">${timings.sadhPorshi}</span>
            </div>
            <div class="panchang-item">
                <span class="p-label">Purimaddh</span>
                <span class="p-value">${timings.purimaddh}</span>
            </div>
        </div>
        
        <div class="panchang-footer">
            <p><strong>Note:</strong> All times are approximate calculations. Please consult your local Sangh for exact muhurtas.</p>
        </div>
    `;
    
    container.innerHTML = html;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only render if the container exists (so we don't error on other pages)
    if(document.getElementById('panchang-content-container')) {
        renderPanchang();
    }
});
