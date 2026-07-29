
        const ARADHANA_QUESTIONS = [
            { q: "1) तप करना", opts: ["नवकारसी (50)", "बियासण (250)", "एकासणा (400)", "आयंबिल (500)", "उपवास (700)", "कुछ नहीं किया (0)"] },
            { q: "2) माता-पिता / साहेबजी अथवा वडिलों के पैर छूना", opts: ["पैर छुआ (50)", "नहीं छुआ (0)"] },
            { q: "3) देरासर में तीन प्रदक्षिणा देना / दर्शन करना", opts: ["दर्शन किया (50)", "प्रदक्षिणा दी (50)", "दोनों किया (100)", "नहीं किया (0)"] },
            { q: "4) परमात्मा की पूजा करना", opts: ["अष्टप्रकारी पूजा की (200)", "वासक्षेप पूजा / पखाल पूजा / केसर पूजा की (100)", "पूजा नहीं की (0)"] },
            { q: "5) गुरु महाराज / गुरु मूर्ति को वंदन करना एवं मा. सा. को गोचरी की विनंती करना (उपाश्रय में जाकर) अथवा गोचरी वोहराना", opts: ["वंदन किया (100)", "विनंती की या वोहराया (100)", "दोनों किया (200)", "दोनों नहीं किया (0)"] },
            { q: "6) बच्चों के हाथों से अनुकंपा / जीवदया करना", opts: ["अनुकंपा (50)", "जीवदया (50)", "दोनों (100)", "नहीं किया (0)"] },
            { q: "7) सुबह उठते समय 8 नवकार गिनना/सुनाना एवं सोने से पहले 7 नवकार गिनना/सुनाना", opts: ["सुबह गिना/सुनाया (50)", "रात को गिना/सुनाया (50)", "दोनों समय गिना/सुनाया (100)", "नहीं गिना/सुनाया (0)"] },
            { q: "8) एक लुखी रोटी खाना", opts: ["लुखी रोटी खाई (50)", "नहीं खाई (0)"] },
            { q: "9) गरम पानी पीना", opts: ["पिया (100)", "नहीं पिया (0)"] },
            { q: "10) थाली धोकर पीना", opts: ["एक टाइम (50)", "दो टाइम (100)", "तीन टाइम (150)", "नहीं पिया (0)"] },
            { q: "11) बाहर की अभक्ष्य वस्तु एवं कंदमूल का त्याग", opts: ["त्याग किया (100)", "त्याग नहीं किया (0)"] },
            { q: "12) सामायिक करना", opts: ["0 (0)", "1 सामायिक (150)", "2 सामायिक (300)", "3 सामायिक (450)"] },
            { q: "13) बाढ़ी / पक्की नवकार वाली गिनना (108 नवकार)", opts: ["0 (0)", "1 (100)", "2 (200)", "3 (300)"] },
            { q: "14) रात्रि भोजन का त्याग", opts: ["तिविहार (100)", "चौविहार (200)", "त्याग नहीं किया (0)"] },
            { q: "15) संध्या प्रभु दर्शन / आरती", opts: ["प्रभु दर्शन किया (50)", "आरती की (50)", "दोनों किया (100)", "दोनों नहीं किया (0)"] },
            { q: "16) पाठशाला जाना / संस्कार शाला", opts: ["पाठशाला जाना (100)", "पाठशाला जाना एवं नई गाथा करना (150)", "पाठशाला नहीं गए (0)"] },
            { q: "17) प्रतिक्रमण करना", opts: ["राई प्रतिक्रमण किया (200)", "देवसिय प्रतिक्रमण किया (200)", "दोनों प्रतिक्रमण किया (400)", "नहीं किया (0)"] },
            { q: "18) पोषध करना", opts: ["दिवस (1500)", "रात्रि (500)", "दोनों (2000)", "नहीं किया (0)"] },
            { q: "19) मोबाइल एवं टी.वी. का त्याग", opts: ["मोबाइल और टीवी दोनों का त्याग (300)", "सिर्फ मोबाइल का त्याग (200)", "सिर्फ टीवी का त्याग (100)", "दोनों का त्याग नहीं किया (0)"] },
            { q: "20) आराधक के माता-पिता का रात्रि भोजन त्याग", opts: ["पिता ने त्याग किया (100)", "माता ने त्याग किया (100)", "दोनों ने त्याग किया (200)", "किसी ने त्याग नहीं किया (0)"] }
        ];
        
        function updateDependentOptions() {
            const q0Selected = document.querySelector('input[name="aradhana-q-0"]:checked');
            if (q0Selected) {
                const q0Value = parseInt(q0Selected.value);
                const q9Radios = document.querySelectorAll('input[name="aradhana-q-9"]');
                q9Radios.forEach(radio => {
                    const val = parseInt(radio.value);
                    const label = radio.parentElement;
                    let show = true;
                    if (q0Value === 1) { // बियासण - max 2 times (hide 3 time)
                        if (val === 2) show = false;
                    } else if (q0Value === 2 || q0Value === 3) { // एकासणा / आयंबिल - max 1 time
                        if (val === 1 || val === 2) show = false;
                    } else if (q0Value === 4) { // उपवास - only D option (nahi piya)
                        if (val !== 3) show = false;
                    }
                    if (show) {
                        label.style.display = 'block';
                    } else {
                        label.style.display = 'none';
                        if (radio.checked) {
                            radio.checked = false;
                            const defaultRadio = document.querySelector('input[name="aradhana-q-9"][value="3"]');
                            if (defaultRadio) defaultRadio.checked = true;
                        }
                    }
                });
            }
            
            // --- Q17 (पोषध) restricting Q8 (गरम पानी) & Q11 (सामायिक) ---
            const q17Selected = document.querySelector('input[name="aradhana-q-17"]:checked');
            if (q17Selected) {
                const q17Value = parseInt(q17Selected.value);
                // 0 = दिवस, 1 = रात्रि, 2 = दोनों, 3 = नहीं किया
                const isDivasiyaOrDono = (q17Value === 0 || q17Value === 2);

                // Q8 (गरम पानी): index 8. Opts: 0: पिया, 1: नहीं पिया
                const q8Radios = document.querySelectorAll('input[name="aradhana-q-8"]');
                q8Radios.forEach(radio => {
                    const val = parseInt(radio.value);
                    const label = radio.parentElement;
                    let show = true;
                    if (isDivasiyaOrDono && val === 0) {
                        show = false; // Cannot get points for garam pani if divasiya/dono poshad
                    }
                    if (show) {
                        label.style.display = 'block';
                    } else {
                        label.style.display = 'none';
                        if (radio.checked) {
                            radio.checked = false;
                            const defaultRadio = document.querySelector('input[name="aradhana-q-8"][value="1"]'); // "नहीं पिया (0)"
                            if (defaultRadio) defaultRadio.checked = true;
                        }
                    }
                });

                // Q11 (सामायिक): index 11. Opts: 0: "0 (0)", 1: "1 सामायिक", 2: "2 सामायिक", 3: "3 सामायिक"
                const q11Radios = document.querySelectorAll('input[name="aradhana-q-11"]');
                q11Radios.forEach(radio => {
                    const val = parseInt(radio.value);
                    const label = radio.parentElement;
                    let show = true;
                    if (isDivasiyaOrDono && val !== 0) {
                        show = false; // Cannot get individual samayik points if divasiya/dono poshad
                    }
                    if (show) {
                        label.style.display = 'block';
                    } else {
                        label.style.display = 'none';
                        if (radio.checked) {
                            radio.checked = false;
                            const defaultRadio = document.querySelector('input[name="aradhana-q-11"][value="0"]'); // "0 (0)"
                            if (defaultRadio) defaultRadio.checked = true;
                        }
                    }
                });
            }
            calculateLiveScore();
        }
        
        function calculateLiveScore() {
            let total = 0;
            for (let i = 0; i < 20; i++) {
                const checked = document.querySelector(`input[name="aradhana-q-${i}"]:checked`);
                if (checked) {
                    const oIndex = parseInt(checked.value);
                    const optText = ARADHANA_QUESTIONS[i].opts[oIndex];
                    const match = optText.match(/\((\d+)\)/);
                    if (match) {
                        total += parseInt(match[1]);
                    }
                }
            }
            document.getElementById('live-score-value').textContent = total;
        }

        function openAradhanaForm() {
            // Get today's date in IST
            const now = new Date();
            const istDate = new Date(now.getTime() + (330 * 60000));
            const dateDisplay = istDate.toISOString().split('T')[0];
            
            document.getElementById('aradhana-form-date-display').textContent = 'Date: ' + dateDisplay;

            const container = document.getElementById('aradhana-questions-container');
            container.innerHTML = '';
            document.getElementById('live-score-value').textContent = '0';
            
            document.getElementById('aradhana-submit-btn').style.display = 'block';
            const msgBox = document.getElementById('preview-msg');
            if (msgBox) msgBox.remove();
            
            ARADHANA_QUESTIONS.forEach((qData, qIndex) => {
                const qDiv = document.createElement('div');
                qDiv.style.background = '#f8f9fa';
                qDiv.style.padding = '1rem';
                qDiv.style.borderRadius = '8px';
                qDiv.style.border = '1px solid var(--border-color)';
                
                const qTitle = document.createElement('h4');
                qTitle.textContent = qData.q;
                qTitle.style.marginBottom = '0.75rem';
                qTitle.style.color = 'var(--text-dark)';
                qDiv.appendChild(qTitle);
                
                qData.opts.forEach((optText, oIndex) => {
                    const label = document.createElement('label');
                    label.style.display = 'block';
                    label.style.marginBottom = '0.5rem';
                    label.style.cursor = 'pointer';
                    label.style.color = 'var(--text-dark)';
                    
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `aradhana-q-${qIndex}`;
                    radio.value = oIndex;
                    radio.required = true;
                    radio.style.marginRight = '8px';
                    radio.addEventListener('change', () => {
                        calculateLiveScore();
                        if (qIndex === 0 || qIndex === 17) updateDependentOptions();
                    });
                    
                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(optText));
                    qDiv.appendChild(label);
                });
                
                container.appendChild(qDiv);
            });
            
            // Ensure logic is applied initially if something is pre-selected
            updateDependentOptions();
            
            document.getElementById('aradhana-form-modal').classList.add('active');
        }

        window.previewAaradhnaForm = function() {
            try {
                openAradhnaForm();
                
                setTimeout(() => {
                    const inputs = document.querySelectorAll('#aradhana-questions-container input[type="radio"]');
                    inputs.forEach(input => input.disabled = true);
                    
                    const submitBtn = document.getElementById('aradhana-submit-btn');
                    if (submitBtn) {
                        submitBtn.style.display = 'none';
                    }
                    
                    let msgBox = document.getElementById('preview-msg');
                    if(!msgBox) {
                        msgBox = document.createElement('div');
                        msgBox.id = 'preview-msg';
                        msgBox.style.padding = '1rem';
                        msgBox.style.background = '#FFF3E0';
                        msgBox.style.color = '#E67A00';
                        msgBox.style.borderRadius = '8px';
                        msgBox.style.marginBottom = '1.5rem';
                        msgBox.style.fontWeight = 'bold';
                        msgBox.style.textAlign = 'center';
                        msgBox.textContent = 'Preview Mode: Viewing only. Submissions are not yet active.';
                        const container = document.getElementById('aradhana-questions-container');
                        container.insertBefore(msgBox, container.firstChild);
                    }
                }, 50);
            } catch (err) {
        async function verifyAuth() {
            try {
                const response = await fetch('/api/me');
                if (!response.ok) {
                    window.location.href = 'index.html';
                    return;
                }
                const data = await response.json();
                populateUserData(data.user, data.registration);
            } catch (error) {
                console.error('Auth verification failed', error);
                window.location.href = 'index.html';
            }
        }
        
        // Run immediately
        verifyAuth();

        let currentUser = null;
        let currentRegistration = null;
        function populateUserData(user, registration) {
            currentUser = user;
            currentRegistration = registration;
            document.getElementById('welcome-name').textContent = user.name;
            document.getElementById('user-sangh').textContent = user.sangh;
            
            // Populate Profile Modal
            const profileInitial = document.getElementById('profile-initial');
            if (profileInitial && user.name) profileInitial.textContent = user.name.charAt(0).toUpperCase();
            
            const profileName = document.getElementById('profile-name');
            if (profileName) profileName.textContent = user.name;
            
            const profileEmail = document.getElementById('profile-email');
            if (profileEmail) profileEmail.textContent = user.email || 'No email provided';
            
            const fallbackUsername = 'JT_' + (user._id ? user._id.toString().slice(-4).toUpperCase() : 'XXXX') + '_' + (user.name ? user.name.split(' ')[0] : 'User');
            const displayUsername = user.username || fallbackUsername;

            const profileUsername = document.getElementById('profile-username');
            if (profileUsername) profileUsername.textContent = displayUsername;
            
            const cardUsername = document.getElementById('card-username-display');
            if (cardUsername) cardUsername.textContent = displayUsername;
            
            const profilePhone = document.getElementById('profile-phone');
            if (profilePhone) profilePhone.textContent = user.number;
            
            const profileCity = document.getElementById('profile-city');
            if (profileCity) profileCity.textContent = user.city || 'Not provided';
            
            const profileSangh = document.getElementById('profile-sangh');
            if (profileSangh) profileSangh.textContent = user.sangh;
            
            const profileRegs = document.getElementById('profile-registrations');
            if (profileRegs) {
                if (registration) {
                    profileRegs.style.display = 'block';
                    document.getElementById('profile-reg-status').textContent = registration.isPaymentVerified ? 'Verified & Active' : 'Pending Verification';
                    document.getElementById('profile-reg-status').style.color = registration.isPaymentVerified ? '#4CAF50' : '#FF9800';
                } else {
                    profileRegs.style.display = 'none';
                }
            }
            
            const registerBtn = document.getElementById('open-register-btn');
            const eventCountdown = document.getElementById('event-countdown-container');
            const whatsappGroup = document.getElementById('whatsapp-group-container');
            if (registration) {
                if (eventCountdown) eventCountdown.style.display = 'block';
                if (whatsappGroup) whatsappGroup.style.display = 'block';
                if (registration.isPaymentVerified || user.email === 'maahirmshah4252@gmail.com' || user.email.toLowerCase() === 'akshitjain61130@gmail.com') {
                    registerBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="#34C759" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                        Unlocked: View Aaradhna Card
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto;"><path d="M9 18l6-6-6-6"></path></svg>
                    `;
                    registerBtn.style.color = 'var(--primary-dark)';
                    registerBtn.style.background = 'white';
                    registerBtn.style.cursor = 'pointer';
                    registerBtn.style.opacity = '1';
                } else {
                    registerBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Locked: Verification Pending...
                    `;
                    registerBtn.style.opacity = '0.7';
                    registerBtn.style.cursor = 'not-allowed';
                    registerBtn.style.background = '#f1f1f1';
                    registerBtn.style.color = '#888';
                }
            }

            if (user._id) fetchUserReels(user._id);

            document.body.style.display = 'block'; // Unhide body once verified
        }
        
        async function fetchUserReels(userId) {
            try {
                const response = await fetch(`/api/users/${userId}/reels`);
                if (response.ok) {
                    const reels = await response.json();
                    document.getElementById('profile-post-count').textContent = reels.length;
                    
                    const grid = document.getElementById('profile-reels-grid');
                    grid.innerHTML = '';
                    
                    reels.forEach((reel, index) => {
                        grid.innerHTML += `
                            <div style="aspect-ratio: 9/16; background: #000; position: relative; cursor: pointer;" onclick="openReelsFeed('${userId}', ${index})">
                                <video src="${reel.videoUrl}" playsinline webkit-playsinline muted style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;"></video>
                                <div style="position: absolute; top: 5px; right: 5px; color: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h5v5m-5-5l10 10-10 10m-8-12h8m-8 4h8"></path><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect></svg>
                                </div>
                            </div>
                        `;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch reels", err);
            }
        }
        
        function openAaradhnaCard() {
            if (!currentUser || !currentRegistration) return;
            
            document.getElementById('card-name').textContent = currentUser.name || 'Not Provided';
            document.getElementById('card-sangh').textContent = currentUser.sangh || 'Not Provided';
            document.getElementById('card-city').textContent = currentRegistration.city || currentUser.city || 'Not Provided';
            document.getElementById('card-age').textContent = currentRegistration.age || 'Not Provided';
            
            fetchAradhanaStatus();
            document.getElementById('aaradhna-card-modal').classList.add('active');
        }

        async function fetchAradhanaStatus() {
            try {
                const response = await fetch('/api/aradhana/status?t=' + Date.now(), { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    renderAradhanaDashboard(data);
                }
            } catch (err) {
                console.error('Failed to fetch Aradhana status', err);
            }
        }

        function renderAradhanaDashboard(data) {
            document.getElementById('aradhana-yesterday-points').textContent = data.yesterdaysPoints;
            document.getElementById('aradhana-today-points').textContent = data.todaysPoints;
            document.getElementById('aradhana-total-points').textContent = data.totalPoints;
            
            const motiBox = document.getElementById('aradhana-motivation-box');
            if (data.yesterdaysPoints > 0 || data.todaysPoints > 0) {
                motiBox.style.display = 'block';
                if (data.todaysPoints > data.yesterdaysPoints) {
                    motiBox.innerHTML = `🌟 <strong>Great job!</strong> You earned ${data.todaysPoints} points today, beating yesterday's score of ${data.yesterdaysPoints}. Keep it up!`;
                } else if (data.todaysPoints < data.yesterdaysPoints && data.hasSubmittedToday) {
                    motiBox.innerHTML = `💪 <strong>Well done!</strong> You scored ${data.todaysPoints} today. Yesterday you scored ${data.yesterdaysPoints}—let's aim higher tomorrow!`;
                } else if (!data.hasSubmittedToday) {
                    motiBox.innerHTML = `✨ <strong>Ready for today?</strong> You scored ${data.yesterdaysPoints} yesterday. Let's see if you can beat it!`;
                } else {
                    motiBox.innerHTML = `🔥 <strong>Consistent!</strong> You maintained your score of ${data.todaysPoints} from yesterday.`;
                }
            } else {
                motiBox.style.display = 'none';
            }
            
            const formBtn = document.getElementById('open-aradhana-form-btn');
            if (data.hasSubmittedToday && !data.isTestingBypass) {
                formBtn.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i> Today's Aradhana Completed`;
                formBtn.style.background = '#4CAF50';
                formBtn.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4)';
                formBtn.style.cursor = 'default';
                formBtn.onclick = null;
            } else {
                formBtn.innerHTML = `<i class="fas fa-pencil-alt" style="margin-right: 8px;"></i> Fill Today's Aradhana`;
                formBtn.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
                formBtn.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
                formBtn.style.cursor = 'pointer';
                formBtn.onclick = openAradhanaForm;
            }
            window.aradhanaCalendarData = data.calendar;
            if (!window.currentCalMonth) {
                const now = new Date();
                window.currentCalMonth = now.getMonth();
                window.currentCalYear = now.getFullYear();
            }
            renderCalendarMonth();          
        }

        function renderCalendarMonth() {
            const gridContainer = document.getElementById('aaradhna-grid');
            const monthDisplay = document.getElementById('calendar-month-display');
            if (!gridContainer || !monthDisplay || !window.aradhanaCalendarData) return;
            
            gridContainer.innerHTML = '';
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            monthDisplay.textContent = monthNames[window.currentCalMonth] + " " + window.currentCalYear;
            
            const firstDay = new Date(window.currentCalYear, window.currentCalMonth, 1).getDay();
            const daysInMonth = new Date(window.currentCalYear, window.currentCalMonth + 1, 0).getDate();
            
            for (let i = 0; i < firstDay; i++) {
                const emptyDiv = document.createElement('div');
                gridContainer.appendChild(emptyDiv);
            }
            
            const calMap = {};
            window.aradhanaCalendarData.forEach(d => { calMap[d.date] = d; });
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('day-dot');
                dayDiv.style.width = '32px';
                dayDiv.style.height = '32px';
                dayDiv.style.borderRadius = '50%';
                dayDiv.style.display = 'flex';
                dayDiv.style.alignItems = 'center';
                dayDiv.style.justifyContent = 'center';
                dayDiv.style.fontSize = '0.85rem';
                dayDiv.style.fontWeight = 'bold';
                
                const mStr = (window.currentCalMonth + 1).toString().padStart(2, '0');
                const dStr = i.toString().padStart(2, '0');
                const dateStr = `${window.currentCalYear}-${mStr}-${dStr}`;
                
                dayDiv.textContent = i;
                
                const dayData = calMap[dateStr];
                if (dayData) {
                    dayDiv.style.color = 'white';
                    if (dayData.status === 'FILLED') {
                        dayDiv.style.background = '#4CAF50';
                        dayDiv.style.boxShadow = '0 2px 5px rgba(76, 175, 80, 0.4)';
                        dayDiv.title = `${dayData.date}: ${dayData.points} Points`;
                    } else if (dayData.status === 'MISSED') {
                        dayDiv.style.background = '#F44336';
                        dayDiv.style.boxShadow = '0 2px 5px rgba(244, 67, 54, 0.4)';
                        dayDiv.title = `${dayData.date}: Missed`;
                    } else {
                        dayDiv.style.background = '#E0E0E0';
                        dayDiv.style.color = '#333';
                        dayDiv.title = `${dayData.date}: Upcoming`;
                    }
                } else {
                    dayDiv.style.color = '#ccc';
                    dayDiv.style.background = 'transparent';
                }
                
                gridContainer.appendChild(dayDiv);
            }
        }

        window.prevMonth = function() {
            window.currentCalMonth--;
            if (window.currentCalMonth < 0) {
                window.currentCalMonth = 11;
                window.currentCalYear--;
            }
            renderCalendarMonth();
        };

        window.nextMonth = function() {
            window.currentCalMonth++;
            if (window.currentCalMonth > 11) {
                window.currentCalMonth = 0;
                window.currentCalYear++;
            }
            renderCalendarMonth();
        };

                alert("Error in preview: " + err.message + "\n" + err.stack);
            }
        }

        // Attach form event listeners directly since DOM is already loaded
        if (!window.aradhanaFormListenersAttached) {
            const closeBtn = document.getElementById('close-aradhana-form-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    document.getElementById('aradhana-form-modal').classList.remove('active');
                });
            }
            const submitBtn = document.getElementById('aradhana-submit-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const answers = [];
                    let calculatedPoints = 0;
                    
                    for (let i = 0; i < 20; i++) {
                        const checked = document.querySelector(`input[name="aradhana-q-${i}"]:checked`);
                        if (!checked) return alert('Please answer all 20 questions.');
                        
                        const oIndex = parseInt(checked.value);
                        answers.push(oIndex);
                        
                        // Extract points from the bracket in the text (e.g. "नवकारसी (50)")
                        const optText = ARADHANA_QUESTIONS[i].opts[oIndex];
                        const match = optText.match(/\((\d+)\)/);
                        if (match) {
                            calculatedPoints += parseInt(match[1]);
                        }
                    }
                    
                    // Remove the blocking alert for calculated score
                    try {
                        const sBtn = document.getElementById('aradhana-submit-btn');
                        sBtn.textContent = 'Saving ' + calculatedPoints + ' points...';
                        sBtn.disabled = true;
                        
                        const response = await fetch('/api/aradhana/submit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ answers })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            sBtn.textContent = 'Success! ' + data.points + ' points awarded.';
                            sBtn.style.background = '#4CAF50';
                            setTimeout(() => {
                                document.getElementById('aradhana-form-modal').classList.remove('active');
                                fetchAradhanaStatus(); // Refresh dashboard
                            }, 1500);
                        } else {
                            alert(data.error || 'Submission failed');
                            sBtn.textContent = 'Submit Aradhana';
                            sBtn.disabled = false;
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Connection error');
                        const sBtn = document.getElementById('aradhana-submit-btn');
                        sBtn.textContent = 'Submit Aradhana';
                        sBtn.disabled = false;
                    }
                });
            }
            window.aradhanaFormListenersAttached = true;
        }
    

        document.addEventListener('DOMContentLoaded', () => {
            console.log('Aradhana v2 loaded');
            // Logout logic
            document.getElementById('logout-btn').addEventListener('click', async () => {
                try {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = 'index.html';
                } catch (err) {
                    console.error('Logout failed', err);
                }
            });
            
            // Bottom Nav active state logic
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                });
            });

            // Modal Logic
            const modal = document.getElementById('registration-modal');
            const openBtn = document.getElementById('open-register-btn');
            const closeBtn = document.getElementById('close-modal');
            const closeSuccessBtn = document.getElementById('close-success-btn');
            const form = document.getElementById('registration-form');
            const successMsg = document.getElementById('reg-success-msg');

            // Profile Modal/View Logic
            const desktopProfileBtn = document.getElementById('desktop-profile-btn');
            const mobileProfileBtn = document.getElementById('mobile-profile-btn');
            const desktopHomeBtn = document.getElementById('desktop-home-btn');
            const mobileHomeBtn = document.getElementById('mobile-home-btn');
            const profileLogoutBtn = document.getElementById('profile-logout-btn');
            
            const closeReelsModal = () => {
                const reelsModal = document.getElementById('reels-feed-modal');
                if (reelsModal) reelsModal.classList.remove('active');
                document.querySelectorAll('#reels-feed-container video').forEach(v => v.pause());
            };
            
            const goHome = (e) => {
                e.preventDefault();
                closeReelsModal();
                document.querySelector('.main-content').style.display = 'block';
                document.getElementById('profile-page-view').style.display = 'none';
                Array.from(document.querySelector('.main-content').children).forEach(el => {
                    if (el.id !== 'profile-page-view') {
                        if (el.id === 'parva-tithi-banner') {
                            try {
                                const tithi = calculateTithi(new Date());
                                const isParva = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"].includes(tithi.name);
                                el.style.display = isParva ? 'flex' : 'none';
                            } catch(e) { el.style.display = 'none'; }
                        } else {
                            el.style.display = '';
                        }
                    }
                });
                
                // Hide alerts modal if open
                const alertsModal = document.getElementById('alerts-modal');
                if (alertsModal) alertsModal.classList.remove('active');
                
                // Update nav classes
                document.querySelectorAll('.desktop-nav-item, .nav-item').forEach(nav => nav.classList.remove('active'));
                if (desktopHomeBtn) desktopHomeBtn.classList.add('active');
                if (mobileHomeBtn) mobileHomeBtn.classList.add('active');
            };
            
            if (desktopHomeBtn) desktopHomeBtn.addEventListener('click', goHome);
            if (mobileHomeBtn) mobileHomeBtn.addEventListener('click', goHome);

            // Alerts Modal Logic
            const alertsModal = document.getElementById('alerts-modal');
            const desktopAlertsBtn = document.getElementById('desktop-alerts-btn');
            const mobileAlertsBtn = document.getElementById('mobile-alerts-btn');
            const closeAlertsBtn = document.getElementById('close-alerts-modal');

            if (desktopAlertsBtn) {
                desktopAlertsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    closeReelsModal();
                    if(window.generateAlerts) window.generateAlerts();
                    alertsModal.classList.add('active');
                });
            }
            if (mobileAlertsBtn) {
                mobileAlertsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    closeReelsModal();
                    if(window.generateAlerts) window.generateAlerts();
                    alertsModal.classList.add('active');
                });
            }
            if (closeAlertsBtn) {
                closeAlertsBtn.addEventListener('click', () => {
                    alertsModal.classList.remove('active');
                });
            }

            const profilePageView = document.getElementById('profile-page-view');
            const mainContentChildren = Array.from(document.querySelector('.main-content').children).filter(el => el.id !== 'profile-page-view');
            
            async function openProfileView(userId) {
                if (!userId) return;
                
                // Hide home content, show profile view
                mainContentChildren.forEach(el => el.style.display = 'none');
                profilePageView.style.display = 'flex';
                document.getElementById('close-profile-view').style.display = 'block';
                
                // Reset UI
                document.getElementById('profile-reels-grid').innerHTML = '<div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-light);">Loading...</div>';
                
                try {
                    // Fetch Profile Data
                    const res = await fetch(`/api/users/${userId}/profile`);
                    if (res.ok) {
                        const user = await res.json();
                        document.getElementById('profile-username').textContent = user.username || user.name;
                        document.getElementById('profile-initial').textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                        document.getElementById('profile-name').textContent = user.name;
                        document.getElementById('profile-sangh').textContent = user.sangh || '';
                        document.getElementById('profile-city').textContent = user.city || '';
                        document.getElementById('profile-followers-count')?.remove();
                        document.getElementById('profile-following-count')?.remove();
                        
                        // Toggle Logout button
                        const isSelf = currentUser && currentUser._id === userId;
                        const logoutBtn = document.getElementById('profile-logout-btn');
                        
                        if (isSelf) {
                            logoutBtn.style.display = 'block';
                        } else {
                            logoutBtn.style.display = 'none';
                        }
                        
                        // Fetch Reels
                        fetchUserReels(userId);
                    }
                } catch (e) { console.error('Failed to load profile', e); }
            }
            
            document.getElementById('close-profile-view').addEventListener('click', () => {
                profilePageView.style.display = 'none';
                mainContentChildren.forEach(el => {
                    if (el.id === 'parva-tithi-banner') {
                        try {
                            const tithi = calculateTithi(new Date());
                            const isParva = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"].includes(tithi.name);
                            el.style.display = isParva ? 'flex' : 'none';
                        } catch(e) { el.style.display = 'none'; }
                    } else {
                        el.style.display = '';
                    }
                });
            });

            if (desktopProfileBtn) {
                desktopProfileBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    closeReelsModal();
                    if (!currentUser) return alert('Please log in first!');
                    openProfileView(currentUser._id);
                });
            }
            if (mobileProfileBtn) {
                mobileProfileBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    closeReelsModal();
                    if (!currentUser) return alert('Please log in first!');
                    openProfileView(currentUser._id);
                });
            }
            if (profileLogoutBtn) {
                profileLogoutBtn.addEventListener('click', async () => {
                    try {
                        await fetch('/api/logout', { method: 'POST' });
                        window.location.href = 'index.html';
                    } catch (err) {
                        console.error('Logout failed', err);
                    }
                });
            }

            openBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any link jumping if it was an <a>
                
                if (currentRegistration) {
                    if (currentRegistration.isPaymentVerified || currentUser.email === 'maahirmshah4252@gmail.com' || currentUser.email.toLowerCase() === 'akshitjain61130@gmail.com') {
                        openAaradhnaCard();
                    } else {
                        alert("Your registration is pending admin verification. Please check back later!");
                    }
                    return;
                }
                
                if(currentUser) {
                    document.getElementById('reg-name').value = currentUser.name;
                    document.getElementById('reg-email').value = currentUser.email;
                    document.getElementById('reg-number').value = currentUser.number;
                    if (currentUser.city) document.getElementById('reg-city').value = currentUser.city;
                }
                form.style.display = 'block';
                successMsg.style.display = 'none';
                modal.classList.add('active');
            });
            
            const closeCardBtn = document.getElementById('close-card-modal');
            const cardModal = document.getElementById('aaradhna-card-modal');
            
            closeCardBtn.addEventListener('click', () => {
                cardModal.classList.remove('active');
            });

            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            closeSuccessBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            // Reels Logic
            const uploadReelModal = document.getElementById('upload-reel-modal');
            const reelsFeedModal = document.getElementById('reels-feed-modal');
            
            const openUploadBtns = [document.getElementById('desktop-upload-btn'), document.getElementById('mobile-upload-btn')];
            openUploadBtns.forEach(btn => {
                if (btn) btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!currentUser) return alert('Please wait for profile to load.');
                    uploadReelModal.classList.add('active');
                });
            });
            
            const openReelsBtns = [document.getElementById('desktop-reels-btn'), document.getElementById('mobile-reels-btn'), document.getElementById('home-reels-card')];
            openReelsBtns.forEach(btn => {
                if (btn) btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.modal-overlay').forEach(m => {
                        if(m.id !== 'reels-feed-modal') m.classList.remove('active');
                    });
                    openReelsFeed();
                });
            });
            
            document.getElementById('close-upload-reel')?.addEventListener('click', () => uploadReelModal.classList.remove('active'));
            document.getElementById('close-reels-feed')?.addEventListener('click', () => {
                reelsFeedModal.classList.remove('active');
                // Stop videos when closed
                document.querySelectorAll('#reels-feed-container video').forEach(v => v.pause());
            });
            
            document.getElementById('upload-reel-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('reel-video');
                const submitBtn = document.getElementById('submit-reel-btn');
                const statusDiv = document.getElementById('upload-reel-status');
                
                if (!fileInput.files[0]) return;
                
                const formData = new FormData();
                formData.append('video', fileInput.files[0]);
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading... (Please wait)';
                statusDiv.textContent = 'Compressing and uploading video to Cloudinary...';
                statusDiv.style.color = 'var(--text-light)';
                
                try {
                    // 1. Get Cloudinary Signature
                    const sigRes = await fetch('/api/cloudinary-signature');
                    const sigData = await sigRes.json();
                    
                    if (!sigRes.ok) {
                        throw new Error(sigData.error || 'Failed to get upload signature');
                    }
                    
                    // 2. Upload directly to Cloudinary
                    const cloudData = new FormData();
                    cloudData.append('file', fileInput.files[0]);
                    cloudData.append('api_key', sigData.apiKey);
                    cloudData.append('timestamp', sigData.timestamp);
                    cloudData.append('signature', sigData.signature);
                    cloudData.append('folder', 'jain_talks_reels');
                    
                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`, {
                        method: 'POST',
                        body: cloudData
                    });
                    
                    const uploadResult = await uploadRes.json();
                    
                    if (!uploadRes.ok) {
                        throw new Error(uploadResult.error?.message || 'Cloudinary upload failed');
                    }
                    
                    // 3. Save the video URL to the backend
                    const response = await fetch('/api/reels', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoUrl: uploadResult.secure_url }) 
                    });
                    
                    if (response.ok) {
                        statusDiv.textContent = 'Reel posted successfully!';
                        statusDiv.style.color = '#4CAF50';
                        setTimeout(() => {
                            uploadReelModal.classList.remove('active');
                            fileInput.value = '';
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Post Reel';
                            statusDiv.textContent = '';
                            if (currentUser) fetchUserReels(currentUser._id);
                        }, 2000);
                    } else {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || 'Failed to save reel to database');
                    }
                } catch (err) {
                    statusDiv.textContent = 'Error: ' + err.message;
                    statusDiv.style.color = '#F44336';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Post Reel';
                }
            });
            
            async function openReelsFeed(userId = null, startIndex = 0) {
                const container = document.getElementById('reels-feed-container');
                container.innerHTML = '<div style="color: white; text-align: center; padding-top: 50vh;">Loading Reels...</div>';
                reelsFeedModal.classList.add('active');
                
                try {
                    const fetchUrl = userId ? `/api/users/${userId}/reels` : '/api/reels';
                    const response = await fetch(fetchUrl);
                    if (response.ok) {
                        const reels = await response.json();
                        if (reels.length === 0) {
                            container.innerHTML = '<div style="color: white; text-align: center; padding-top: 50vh;">No reels yet! Be the first to post.</div>';
                            return;
                        }
                        
                        container.innerHTML = '';
                        reels.forEach(reel => {
                            const isLiked = currentUser ? (reel.likes || []).includes(currentUser._id) : false;
                            const slide = document.createElement('div');
                            slide.className = 'reel-slide';
                            slide.style.height = '100vh';
                            slide.style.width = '100%';
                            slide.style.scrollSnapAlign = 'start';
                            slide.style.position = 'relative';
                            slide.style.backgroundColor = 'black';
                            
                            slide.innerHTML = `
                                <video src="${reel.videoUrl}" loop autoplay playsinline webkit-playsinline style="width: 100%; height: 100%; object-fit: cover;" onclick="this.paused ? this.play() : this.pause()"></video>
                                <div style="position: absolute; bottom: 5rem; left: 1rem; right: 4rem; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                                    <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;" onclick="document.getElementById('reels-feed-modal').classList.remove('active'); document.querySelectorAll('#reels-feed-container video').forEach(v => v.pause()); openProfileView('${reel.userId._id}');">
                                        <div style="width: 32px; height: 32px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem;">
                                            ${reel.userId.name ? reel.userId.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        ${reel.userId.username || reel.userId.name}
                                    </div>
                                    </div>
                                </div>
                                <div style="position: absolute; bottom: 5rem; right: 1rem; display: flex; flex-direction: column; gap: 1.5rem; align-items: center; color: white;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); cursor: pointer;" onclick="likeReel('${reel._id}', this)">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="${isLiked ? '#F44336' : 'none'}" stroke="${isLiked ? '#F44336' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                        <span class="like-count" style="font-size: 0.8rem; font-weight: 600;">${reel.likes ? reel.likes.length : 0}</span>
                                    </div>
                                </div>
                            `;
                            container.appendChild(slide);
                        });
                        
                        setTimeout(() => {
                            if (container.children[startIndex]) {
                                container.children[startIndex].scrollIntoView({ behavior: 'auto' });
                                const video = container.children[startIndex].querySelector('video');
                                if (video) video.play();
                            }
                        }, 50);

                        // Intersection Observer for playing/pausing visible videos
                        const observer = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                const video = entry.target.querySelector('video');
                                if (entry.isIntersecting) {
                                    video.play();
                                } else {
                                    video.pause();
                                }
                            });
                        }, { threshold: 0.6 });
                        
                        Array.from(container.children).forEach(slide => observer.observe(slide));
                    }
                } catch (err) {
                    console.error('Failed to load feed', err);
                    container.innerHTML = '<div style="color: white; text-align: center; padding-top: 50vh;">Failed to load feed.</div>';
                }
            }
            
            window.likeReel = async function(reelId, element) {
                if (!currentUser) return alert("Please log in to like a reel.");
                
                const svg = element.querySelector('svg');
                const countSpan = element.querySelector('.like-count');
                
                // Optimistic UI update
                const isCurrentlyLiked = svg.getAttribute('fill') !== 'none';
                let count = parseInt(countSpan.textContent) || 0;
                
                if (isCurrentlyLiked) {
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', 'currentColor');
                    countSpan.textContent = Math.max(0, count - 1);
                } else {
                    svg.setAttribute('fill', '#F44336');
                    svg.setAttribute('stroke', '#F44336');
                    countSpan.textContent = count + 1;
                }
                
                try {
                    const response = await fetch(`/api/reels/${reelId}/like`, { method: 'POST' });
                    if (response.ok) {
                        const data = await response.json();
                        // Re-sync with server
                        svg.setAttribute('fill', data.isLiked ? '#F44336' : 'none');
                        svg.setAttribute('stroke', data.isLiked ? '#F44336' : 'currentColor');
                        countSpan.textContent = data.likes;
                    }
                } catch (e) {
                    console.error('Failed to like reel');
                }
            };

            // Countdown Logic
            const targetDate = new Date('July 28, 2026 00:00:00').getTime();
            setInterval(() => {
                const now = new Date().getTime();
                const distance = targetDate - now;
                
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                const timerEl = document.getElementById('countdown-timer');
                const eventTimerEl = document.getElementById('event-countdown-timer');
                const timeStr = distance < 0 ? "Started!" : `${days}d ${hours}h ${minutes}m ${seconds}s`;
                if (timerEl) timerEl.innerHTML = timeStr;
                if (eventTimerEl) eventTimerEl.innerHTML = timeStr;
            }, 1000);

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('reg-submit-btn');
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;

                const formData = new FormData(form);

                try {
                    const response = await fetch('/api/register-course', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        form.style.display = 'none';
                        successMsg.style.display = 'block';
                        verifyAuth(); // Update background button state immediately
                    } else {
                        const data = await response.json();
                        alert(data.error || 'Registration failed');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error submitting registration.');
                } finally {
                    submitBtn.textContent = 'Submit Registration';
                    submitBtn.disabled = false;
                }
            });
            // Removed Panchang event listeners here to use inline functions instead
        });
    