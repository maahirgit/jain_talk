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

// Generate Jain Timings based on a generic Sunrise/Sunset
function generateTimings(date) {
    const sunrise = new Date(date);
    sunrise.setHours(6, 15, 0);
    const sunset = new Date(date);
    sunset.setHours(19, 10, 0);
    const navkarsi = new Date(sunrise.getTime() + 48 * 60000);
    const porshi = new Date(sunrise.getTime() + 180 * 60000);
    const sadhPorshi = new Date(sunrise.getTime() + 270 * 60000);
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

let selectedDate = new Date();

function renderCalendar(year, month) {
    const container = document.getElementById('panchang-content-container');
    if(!container) return;

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
        <div class="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; margin-bottom: 1.5rem;">
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Sun</div>
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Mon</div>
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Tue</div>
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Wed</div>
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Thu</div>
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Fri</div>
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light);">Sat</div>
    `;

    let date = 1;
    for (let i = 0; i < 42; i++) {
        if (i < startingDay || date > totalDays) {
            html += `<div style="padding: 0.5rem; background: #f9f9f9; border-radius: 8px;"></div>`;
        } else {
            let currentDate = new Date(year, month, date);
            let tithi = calculateTithi(currentDate);
            let isSelected = currentDate.toDateString() === selectedDate.toDateString();
            
            let bg = isSelected ? 'var(--primary-color)' : (tithi.index === 14 || tithi.index === 29 ? '#FFF3E0' : 'white');
            let color = isSelected ? 'white' : 'var(--text-dark)';
            let border = isSelected ? 'none' : '1px solid var(--border-color)';
            
            html += `
                <div class="cal-day" data-date="${date}" style="padding: 0.5rem; background: ${bg}; color: ${color}; border: ${border}; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: transform 0.2s;">
                    <div style="font-weight: 700; font-size: 1rem;">${date}</div>
                    <div style="font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${tithi.name}</div>
                </div>
            `;
            date++;
        }
    }

    html += `</div>`;
    
    // Day Details Section
    let sDate = selectedDate;
    let sTithi = calculateTithi(sDate);
    let sTimings = generateTimings(sDate);
    const dateString = sDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    html += `
        <div style="background: #FFF8E1; padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,193,7,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <h4 style="margin: 0; color: var(--primary-dark); font-size: 1.2rem;">${dateString}</h4>
                    <p style="margin: 0.2rem 0 0 0; color: var(--text-light); font-size: 0.9rem;">Tithi: <strong style="color: var(--primary-color);">${sTithi.fullName}</strong></p>
                </div>
            </div>
            
            <div class="panchang-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="panchang-item" style="background: white; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span class="p-label" style="font-weight: 500; font-size: 0.85rem; color: var(--text-light);">Sunrise</span>
                    <span class="p-value highlight-sun" style="font-weight: 700; color: #E65100;">${sTimings.sunrise}</span>
                </div>
                <div class="panchang-item" style="background: white; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span class="p-label" style="font-weight: 500; font-size: 0.85rem; color: var(--text-light);">Sunset</span>
                    <span class="p-value highlight-sun" style="font-weight: 700; color: #E65100;">${sTimings.sunset}</span>
                </div>
                <div class="panchang-item" style="background: white; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span class="p-label" style="font-weight: 500; font-size: 0.85rem; color: var(--text-light);">Navkarsi</span>
                    <span class="p-value" style="font-weight: 700;">${sTimings.navkarsi}</span>
                </div>
                <div class="panchang-item" style="background: white; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span class="p-label" style="font-weight: 500; font-size: 0.85rem; color: var(--text-light);">Porshi</span>
                    <span class="p-value" style="font-weight: 700;">${sTimings.porshi}</span>
                </div>
                <div class="panchang-item" style="background: white; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span class="p-label" style="font-weight: 500; font-size: 0.85rem; color: var(--text-light);">Sadh-Porshi</span>
                    <span class="p-value" style="font-weight: 700;">${sTimings.sadhPorshi}</span>
                </div>
                <div class="panchang-item" style="background: white; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span class="p-label" style="font-weight: 500; font-size: 0.85rem; color: var(--text-light);">Purimaddh</span>
                    <span class="p-value" style="font-weight: 700;">${sTimings.purimaddh}</span>
                </div>
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
document.addEventListener('DOMContentLoaded', () => {
    
    // Update card display
    const cardTithiDisplay = document.getElementById('card-tithi-display');
    const cardDateDisplay = document.getElementById('card-date-display');
    if (cardTithiDisplay && cardDateDisplay) {
        const today = new Date();
        const tithi = calculateTithi(today);
        const timings = generateTimings(today);
        
        cardTithiDisplay.textContent = tithi.fullName;
        cardDateDisplay.textContent = today.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (document.getElementById('card-sunrise')) {
            document.getElementById('card-sunrise').textContent = timings.sunrise;
            document.getElementById('card-sunset').textContent = timings.sunset;
            document.getElementById('card-navkarsi').textContent = timings.navkarsi;
            document.getElementById('card-porshi').textContent = timings.porshi;
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
});
