document.addEventListener('DOMContentLoaded', () => {
    // --- Toggle Forms ---
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    loginToggle.addEventListener('click', () => {
        loginToggle.classList.add('active');
        signupToggle.classList.remove('active');
        loginForm.classList.add('active-form');
        signupForm.classList.remove('active-form');
    });

    signupToggle.addEventListener('click', () => {
        signupToggle.classList.add('active');
        loginToggle.classList.remove('active');
        signupForm.classList.add('active-form');
        loginForm.classList.remove('active-form');
    });

    // --- Toggle Password Visibility ---
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Toggle icon
            if (type === 'text') {
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-off-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            } else {
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            }
        });
    });

    // --- Password Strength & Validation ---
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const matchText = document.getElementById('password-match-text');
    const signupSubmit = document.getElementById('signup-submit');
    const termsCheck = document.getElementById('terms');

    // Phone number formatting
    const phoneInput = document.getElementById('signup-number');
    phoneInput.addEventListener('input', function (e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,5})/);
        e.target.value = !x[2] ? x[1] : '+' + x[1] + ' ' + x[2] + (x[3] ? ' ' + x[3] : '');
    });

    // Check password strength
    signupPassword.addEventListener('input', () => {
        const val = signupPassword.value;
        let strength = 0;
        
        if (val.length > 5) strength += 1;
        if (val.length > 7) strength += 1;
        if (/[A-Z]/.test(val)) strength += 1;
        if (/[0-9]/.test(val)) strength += 1;
        if (/[^A-Za-z0-9]/.test(val)) strength += 1;

        switch(strength) {
            case 0:
                strengthBar.style.width = '0';
                strengthBar.style.backgroundColor = 'transparent';
                strengthText.textContent = 'Password strength';
                strengthText.style.color = 'var(--text-light)';
                break;
            case 1:
            case 2:
                strengthBar.style.width = '33%';
                strengthBar.style.backgroundColor = 'var(--error-color)';
                strengthText.textContent = 'Weak password';
                strengthText.style.color = 'var(--error-color)';
                break;
            case 3:
            case 4:
                strengthBar.style.width = '66%';
                strengthBar.style.backgroundColor = '#FFCC00';
                strengthText.textContent = 'Good password';
                strengthText.style.color = '#CC9900';
                break;
            case 5:
                strengthBar.style.width = '100%';
                strengthBar.style.backgroundColor = 'var(--success-color)';
                strengthText.textContent = 'Strong password';
                strengthText.style.color = 'var(--success-color)';
                break;
        }
        
        checkFormValidity();
    });

    // Check if passwords match
    signupConfirmPassword.addEventListener('input', checkFormValidity);
    termsCheck.addEventListener('change', checkFormValidity);

    function checkFormValidity() {
        const p1 = signupPassword.value;
        const p2 = signupConfirmPassword.value;
        
        if (p2.length > 0) {
            if (p1 === p2) {
                matchText.textContent = 'Passwords match';
                matchText.style.color = 'var(--success-color)';
                
                // If terms checked and password is okay
                if (termsCheck.checked && p1.length >= 6) {
                    signupSubmit.removeAttribute('disabled');
                } else {
                    signupSubmit.setAttribute('disabled', 'true');
                }
            } else {
                matchText.textContent = 'Passwords do not match';
                matchText.style.color = 'var(--error-color)';
                signupSubmit.setAttribute('disabled', 'true');
            }
        } else {
            matchText.textContent = '';
            signupSubmit.setAttribute('disabled', 'true');
        }
    }

    // Form Submissions
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email').value;
        const passwordInput = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('.submit-btn');
        btn.innerHTML = 'Logging in...';
        
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, password: passwordInput })
            });
            const data = await response.json();
            
            if (response.ok) {
                // The backend has set the HttpOnly cookie. We just redirect.
                window.location.href = 'home.html';
            } else {
                alert(data.error || 'Invalid email or password.');
                btn.innerHTML = 'Log In';
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Something went wrong. Please try again.');
            btn.innerHTML = 'Log In';
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = signupPassword.value;
        const name = document.getElementById('signup-name').value;
        const city = document.getElementById('signup-city').value;
        const number = document.getElementById('signup-number').value;
        const sangh = document.getElementById('signup-sangh').value;
        
        const btn = signupForm.querySelector('.submit-btn');
        btn.innerHTML = 'Creating account...';
        
        try {
            const response = await fetch('http://localhost:5000/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, city, number, sangh })
            });
            const data = await response.json();
            
            if (response.ok) {
                alert('Account created successfully! You can now log in.');
                btn.innerHTML = 'Create Account';
                signupForm.reset();
                strengthBar.style.width = '0';
                strengthText.textContent = 'Password strength';
                matchText.textContent = '';
                btn.setAttribute('disabled', 'true');
                loginToggle.click();
            } else {
                alert(data.error || 'An error occurred during signup.');
                btn.innerHTML = 'Create Account';
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Something went wrong. Please try again.');
            btn.innerHTML = 'Create Account';
        }
    });
});
