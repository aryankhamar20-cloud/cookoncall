const API_URL = 'https://cookoncall-backend-production-7c6d.up.railway.app/api/v1';

async function doSignup(data) {
    if (!data.fname || !data.lname) return { ok: false, msg: 'Please enter your full name.' };
    if (!data.phone) return { ok: false, msg: 'Phone number is required.' };
    if (!data.email) return { ok: false, msg: 'Email address is required.' };
    if (!data.password) return { ok: false, msg: 'Please create a password.' };
    if (data.password.length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };
    if (!data.termsAccepted) return { ok: false, msg: 'Please accept the Terms of Service.' };

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: data.fname,
                lastName: data.lname,
                email: data.email,
                phone: data.phone,
                password: data.password,
                role: data.role || 'customer'
            })
        });
        const result = await res.json();
        if (!res.ok) return { ok: false, msg: result.message || 'Signup failed.' };
        localStorage.setItem('coc_token', result.data.accessToken);
        return { ok: true, user: result.data.user };
    } catch (e) {
        return { ok: false, msg: 'Network error. Please try again.' };
    }
}

async function doLogin(emailOrPhone, password) {
    if (!emailOrPhone || !password) return { ok: false, msg: 'Please enter email and password.' };

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailOrPhone, password })
        });
        const result = await res.json();
        if (!res.ok) return { ok: false, msg: result.message || 'Login failed.' };
        localStorage.setItem('coc_token', result.data.accessToken);
        setCurrentUser(result.data.user);
        return { ok: true, user: result.data.user };
    } catch (e) {
        return { ok: false, msg: 'Network error. Please try again.' };
    }
}

function getCurrentUser() {
    const raw = sessionStorage.getItem('coc_user');
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) { return null; }
}

function setCurrentUser(user) {
    sessionStorage.setItem('coc_user', JSON.stringify(user));
}

function clearSession() {
    sessionStorage.removeItem('coc_user');
    localStorage.removeItem('coc_token');
}

function redirectToDashboard(user) {
    if (!user) return;
    setCurrentUser(user);
    setTimeout(function () {
        if (user.role === 'cook' || user.role === 'Chef') {
            window.location.href = 'chef-dashboard.html';
        } else {
            window.location.href = 'customer-dashboard.html';
        }
    }, 500);
}

function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

function doLogout() {
    clearSession();
    window.location.href = 'login.html';
}

function showToast(msg) {
    var existing = document.getElementById('coc-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'coc-toast';
    toast.style.cssText = 'position:fixed;bottom:-80px;left:50%;transform:translateX(-50%);background:#1A0F0A;color:#fff;padding:12px 28px;border-radius:50px;font-size:0.9rem;font-weight:500;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,0.2);transition:bottom 0.4s cubic-bezier(0.4,0,0.2,1);white-space:nowrap;font-family:DM Sans,sans-serif';
    toast.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#2E8B57;flex-shrink:0"></span>' + msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { toast.style.bottom = '28px'; });
    });
    setTimeout(function () {
        toast.style.bottom = '-80px';
        setTimeout(function () { toast.remove(); }, 500);
    }, 2800);
}