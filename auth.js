/* ═══════════════════════════════════════════════════════
   CookOnCall — Auth System (auth.js)
   Handles: signup, login, session, redirect, protection
   ═══════════════════════════════════════════════════════ */

// ─── SIMPLE SHA-256 HASH (sync) ───
function hashPassword(password) {
    const msg = 'COC2026' + password + 'COOKONCALL';
    function sha256(str) {
        function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
        var mp = Math.pow, mw = mp(2, 32), i, j, result = '', words = [],
            abl = str.length * 8, hash = [], k = [], pc = 0, ic = {};
        for (var c = 2; pc < 64; c++) {
            if (!ic[c]) {
                for (i = 0; i < 313; i += c) ic[i] = c;
                hash[pc] = (mp(c, .5) * mw) | 0;
                k[pc++] = (mp(c, 1 / 3) * mw) | 0;
            }
        }
        str += '\x80';
        while (str.length % 64 - 56) str += '\x00';
        for (i = 0; i < str.length; i++) {
            j = str.charCodeAt(i);
            if (j >> 8) return '';
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words.length] = ((abl / mw) | 0);
        words[words.length] = (abl | 0);
        for (j = 0; j < words.length;) {
            var W = words.slice(j, j += 16), oh = hash.slice(0);
            for (i = 0; i < 64; i++) {
                var w15 = W[i - 15], w2 = W[i - 2], a = hash[0], e = hash[4];
                var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
                    ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
                    (W[i] = (i < 16) ? W[i] : (W[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) +
                        W[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
                var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
                    ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash = [(t1 + t2) | 0].concat(hash);
                hash[4] = (hash[4] + t1) | 0;
                hash.length = 8;
            }
            hash = hash.map(function (x, i) { return (x + oh[i]) | 0; });
        }
        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }
    return sha256(msg);
}

function checkPassword(plain, stored) {
    if (!stored || stored.length !== 64) return plain === stored;
    return hashPassword(plain) === stored;
}

// ─── USER STORAGE ───
function getUsers() {
    try { return JSON.parse(localStorage.getItem('coc_users') || '[]'); }
    catch (e) { return []; }
}

function saveUsers(users) {
    localStorage.setItem('coc_users', JSON.stringify(users));
}

// ─── SESSION ───
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
}

// ─── REDIRECT ───
function redirectToDashboard(user) {
    if (!user) return;
    setCurrentUser(user);
    setTimeout(function () {
        if (user.role === 'Chef') {
            window.location.href = 'chef-dashboard.html';
        } else {
            window.location.href = 'customer-dashboard.html';
        }
    }, 500);
}

// Call on dashboard pages — sends back to login if not logged in
function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// ─── LOGIN ───
function doLogin(emailOrPhone, password) {
    if (!emailOrPhone || !password) return { ok: false, msg: 'Please enter email/phone and password.' };

    const users = getUsers();
    const found = users.find(function (u) {
        return (u.email === emailOrPhone || u.phone === emailOrPhone) && checkPassword(password, u.pass);
    });

    if (!found) {
        var exists = users.find(function (u) { return u.email === emailOrPhone || u.phone === emailOrPhone; });
        if (exists) return { ok: false, msg: 'Incorrect password. Please try again.' };
        return { ok: false, msg: 'No account found. Please sign up first.' };
    }

    var user = {
        name: found.fname,
        lastName: found.lname,
        email: found.email,
        phone: found.phone,
        role: found.role || 'Customer',
        initials: ((found.fname || '?').charAt(0) + (found.lname || '?').charAt(0)).toUpperCase(),
        location: found.location || ''
    };

    return { ok: true, user: user };
}

// ─── SIGNUP ───
function doSignup(data) {
    if (!data.fname || !data.lname) return { ok: false, msg: 'Please enter your full name.' };
    if (!data.phone) return { ok: false, msg: 'Phone number is required.' };
    if (!data.email) return { ok: false, msg: 'Email address is required.' };
    if (!data.password) return { ok: false, msg: 'Please create a password.' };
    if (data.password.length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };
    if (!data.termsAccepted) return { ok: false, msg: 'Please accept the Terms of Service.' };

    var users = getUsers();

    if (users.find(function (u) { return u.email === data.email; })) {
        return { ok: false, msg: 'This email is already registered.' };
    }
    if (users.find(function (u) { return u.phone === data.phone; })) {
        return { ok: false, msg: 'This phone number is already registered.' };
    }

    var role = data.role || 'Customer';
    var newUser = {
        id: Date.now(),
        fname: data.fname,
        lname: data.lname,
        email: data.email,
        phone: data.phone,
        pass: hashPassword(data.password),
        role: role,
        joined: new Date().toLocaleDateString('en-IN'),
        location: data.location || '',
        bookings: 0,
        specialties: data.specialties || '',
        experience: data.experience || '',
        rate: data.rate || 400
    };

    users.push(newUser);
    saveUsers(users);

    var user = {
        name: data.fname,
        lastName: data.lname,
        email: data.email,
        phone: data.phone,
        role: role,
        initials: (data.fname.charAt(0) + data.lname.charAt(0)).toUpperCase(),
        location: ''
    };

    return { ok: true, user: user };
}

// ─── LOGOUT ───
function doLogout() {
    clearSession();
    window.location.href = 'login.html';
}

// ─── TOAST ───
function showToast(msg) {
    var existing = document.getElementById('coc-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'coc-toast';
    toast.style.cssText = 'position:fixed;bottom:-80px;left:50%;transform:translateX(-50%);background:#1A0F0A;color:#fff;padding:12px 28px;border-radius:50px;font-size:0.9rem;font-weight:500;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,0.2);transition:bottom 0.4s cubic-bezier(0.4,0,0.2,1);white-space:nowrap;font-family:DM Sans,sans-serif';
    toast.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#2E8B57;flex-shrink:0"></span>' + msg;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            toast.style.bottom = '28px';
        });
    });
    setTimeout(function () {
        toast.style.bottom = '-80px';
        setTimeout(function () { toast.remove(); }, 500);
    }, 2800);
}
