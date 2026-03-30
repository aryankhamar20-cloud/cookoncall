

    /* ══════════════════════════════════════
       PASSWORD HASHING — Sync SHA-256
       No async needed — runs synchronously
    ══════════════════════════════════════ */
    function hashPassword(password) {
      // Pure JS SHA-256 — synchronous, no external library
      const msg = 'COC2026' + password + 'COOKONCALL';
      function sha256(str) {
        function rightRotate(value, amount) {
          return (value >>> amount) | (value << (32 - amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = str.length * 8;
        var hash = [];
        var k = [];
        var primeCounter = 0;
        var isComposite = {};
        for (var candidate = 2; primeCounter < 64; candidate++) {
          if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
          }
        }
        str += '\x80';
        while (str.length % 64 - 56) str += '\x00';
        for (i = 0; i < str.length; i++) {
          j = str.charCodeAt(i);
          if (j >> 8) return ''; // non-ASCII
          words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words.length] = ((asciiBitLength / maxWord) | 0);
        words[words.length] = (asciiBitLength | 0);
        for (j = 0; j < words.length;) {
          var W = words.slice(j, j += 16);
          var oldHash = hash.slice(0);
          for (i = 0; i < 64; i++) {
            var w15 = W[i - 15], w2 = W[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7] +
              (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
              ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (W[i] = (i < 16) ? W[i] :
                (W[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  W[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
              ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.length = 8;
          }
          hash = hash.map(function (x, i) { return (x + oldHash[i]) | 0; });
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
      if (!stored || stored.length !== 64) return plain === stored; // legacy
      return hashPassword(plain) === stored;
    }

    /* ──────────────────────────────
       STATE
    ────────────────────────────── */
    let currentUser = { name: 'Guest', lastName: '', email: '', initials: 'G' };
    let cart = [];

    /* ──────────────────────────────
       PAGE NAVIGATION
    ────────────────────────────── */
    function showPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + pageId).classList.add('active');
      window.scrollTo(0, 0);
    }

    /* ──────────────────────────────
       AUTH
    ────────────────────────────── */
    function showAuth(tab) {
      showPage('auth');
      switchTab(tab);
    }

    function switchTab(tab) {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      const tabEl = document.getElementById('tab-' + tab);
      const formEl = document.getElementById('form-' + tab);
      if (tabEl) tabEl.classList.add('active');
      if (formEl) formEl.classList.add('active');
      // Clear ALL fields on every tab switch for security
      ['login-email', 'login-pass', 'login-otp', 'signup-fname', 'signup-lname',
        'signup-phone', 'signup-email', 'signup-pass', 'signup-city',
        'signup-specialties'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
      // Hide OTP fields
      const sotp = document.getElementById('signup-otp-field');
      if (sotp) sotp.style.display = 'none';
      const lotp = document.getElementById('otp-field');
      if (lotp) lotp.style.display = 'none';
      // Reset button text
      const createBtn = document.querySelector('#form-signup .btn-auth');
      if (createBtn) createBtn.textContent = 'Create Account';
      // Reset OTP state fully
      otpVerified = false;
      confirmationResult = null;
      resetRecaptcha();
      // Re-apply user type UI state
      switchUserType(currentUserType);
    }

    function selectRole(el) {
      document.querySelectorAll('.role-opt').forEach(r => r.classList.remove('selected'));
      el.classList.add('selected');
    }

    function doLogin() {
      const email = (document.getElementById('login-email') ? document.getElementById('login-email').value : '').trim();
      const pass = (document.getElementById('login-pass') ? document.getElementById('login-pass').value : '').trim();
      if (!email || !pass) { showToast('Please enter email and password.'); return; }
      const users = getUsers();
      const found = users.find(u => (u.email === email || u.phone === email) && checkPassword(pass, u.pass));
      if (!found) {
        // Try fetching from Firestore if not in local cache
        if (dbReady) {
          db.collection('users').where('email', '==', email).limit(1).get()
            .then(snap => {
              if (snap.empty) {
                db.collection('users').where('phone', '==', email).limit(1).get()
                  .then(s2 => {
                    if (s2.empty) { showToast('No account found. Please sign up first.'); }
                    else { showToast('Incorrect password. Please try again.'); }
                  });
              } else {
                const cloudUser = snap.docs[0].data();
                if (checkPassword(pass, cloudUser.pass)) {
                  const users = getUsers(); users.push(cloudUser); saveUsers(users);
                  currentUser = {
                    name: cloudUser.fname, lastName: cloudUser.lname,
                    email: cloudUser.email, phone: cloudUser.phone, role: cloudUser.role,
                    initials: ((cloudUser.fname || '?').charAt(0) + (cloudUser.lname || '?').charAt(0)).toUpperCase(),
                    location: cloudUser.location || ''
                  };
                  sessionStorage.setItem('coc_user', JSON.stringify(currentUser));
                  updateUserUI(); showDashboard();
                  showToast('Welcome back, ' + currentUser.name + '!');
                  showLocationModalIfNeeded();
                } else {
                  showToast('Incorrect password. Please try again.');
                }
              }
            }).catch(() => showToast('No account found. Please sign up first.'))
        } else {
          const anyUser = getUsers().find(u => u.email === email || u.phone === email);
          showToast(anyUser ? 'Incorrect password. Please try again.' : 'No account found. Please sign up first.');
        }
        return;
      }
      currentUser = { name: found.fname, lastName: found.lname, email: found.email, phone: found.phone, role: found.role, initials: ((found.fname || '?').charAt(0) + (found.lname || '?').charAt(0)).toUpperCase(), location: found.location || '' };
      sessionStorage.setItem('coc_user', JSON.stringify(currentUser));
      logActivity(currentUser.name + ' ' + currentUser.lastName, 'Login', 'Logged in as ' + currentUser.role);
      updateUserUI();
      if (currentUser.role === 'Chef') { showDashboard(); showToast('Welcome back, Chef ' + currentUser.name + '!'); }
      else { showDashboard(); showToast('Welcome back, ' + currentUser.name + '!'); }
      showLocationModalIfNeeded();
    }

    async function doSignup() {
      const fn = (document.getElementById('signup-fname').value || '').trim();
      const ln = (document.getElementById('signup-lname').value || '').trim();
      const phone = (document.getElementById('signup-phone').value || '').trim();
      const em = (document.getElementById('signup-email').value || '').trim();
      const pass = (document.getElementById('signup-pass').value || '').trim();
      const role = currentUserType === 'chef' ? 'Chef' : 'Customer';
      if (!fn || !ln) { showToast('Please enter your full name.'); return; }
      if (!phone) { showToast('Phone number is required.'); return; }
      if (!em) { showToast('Email address is required.'); return; }
      if (!pass) { showToast('Please create a password.'); return; }
      if (pass.length < 6) { showToast('Password must be at least 6 characters.'); return; }
      // OTP verification — show OTP field if not yet verified
      const otpField = document.getElementById('signup-otp-field');
      if (otpField && otpField.style.display === 'none') {
        // First time: send OTP
        await sendSignupOTP();
        // Update button text to guide user
        const createBtn = document.querySelector('#form-signup .btn-auth');
        if (createBtn) createBtn.textContent = 'Verify OTP & Create Account';
        return;
      }
      if (otpField && otpField.style.display !== 'none' && !otpVerified) {
        // OTP field visible — verify the code user entered
        const otpVal = (document.getElementById('signup-otp') || {}).value || '';
        if (!otpVal.trim()) { showToast('Please enter the OTP sent to your phone.'); return; }
        const verified = await verifySignupOTP();
        if (!verified) return;
      }
      const users = getUsers();
      if (users.find(u => u.email === em)) { showToast('This email is already registered.'); return; }
      if (users.find(u => u.phone === phone)) { showToast('This phone number is already registered.'); return; }
      const city = (document.getElementById('signup-city')?.value || '').trim();
      const specs = (document.getElementById('signup-specialties')?.value || '').trim();
      const exp = (document.getElementById('signup-exp')?.value || '').trim();
      const newUser = {
        id: Date.now(), fname: fn, lname: ln, email: em, phone: phone, pass: hashPassword(pass), role: role,
        joined: new Date().toLocaleDateString('en-IN'), location: city || '', bookings: 0,
        ...(role === 'Chef' ? { city, specialties: specs, experience: exp } : {})
      };
      users.push(newUser);
      saveUsers(users);
      saveUserToCloud(newUser); // Save to Firebase
      currentUser = { name: fn, lastName: ln, email: em, phone: phone, role: role, initials: (fn.charAt(0) + ln.charAt(0)).toUpperCase(), location: '' };
      sessionStorage.setItem('coc_user', JSON.stringify(currentUser));
      logActivity(fn + ' ' + ln, 'Signup', 'New ' + role + ' registered');
      // Clear signup form
      ['signup-fname', 'signup-lname', 'signup-phone', 'signup-email', 'signup-pass'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      updateUserUI();
      showDashboard();
      showToast('Welcome to CookOnCall, ' + fn + '!');
      showLocationModal();
    }

    function updateUserUI() {
      const initials = currentUser.initials;
      const fullName = currentUser.name + ' ' + currentUser.lastName;
      const role = currentUser.role || 'Customer';

      // Sidebar
      const sbAva = document.getElementById('sb-ava');
      const sbUname = document.getElementById('sb-uname');
      if (sbAva) {
        sbAva.textContent = initials;
        sbAva.style.background = role === 'Chef'
          ? 'linear-gradient(135deg,#F5A623,#E8832A)'
          : 'linear-gradient(135deg,#4A2C0A,#8B6B47)';
      }
      if (sbUname) sbUname.textContent = fullName;
      const sbRole = document.getElementById('sb-role');
      if (sbRole) {
        sbRole.textContent = role;
        sbRole.style.color = role === 'Chef' ? 'var(--turmeric)' : 'rgba(255,255,255,0.45)';
        sbRole.style.fontWeight = role === 'Chef' ? '700' : '500';
      }

      // Header avatar — click goes to profile
      const hAva = document.getElementById('h-ava');
      if (hAva) {
        hAva.textContent = initials;
        hAva.title = fullName + ' · ' + role;
      }

      // Welcome banner
      const wbName = document.getElementById('wb-name');
      if (wbName) wbName.textContent = currentUser.name;

      // Profile panel
      const pAva = document.getElementById('profile-ava');
      const pName = document.getElementById('profile-name');
      const pEmail = document.getElementById('profile-email');
      if (pAva) pAva.textContent = initials;
      if (pName) pName.textContent = fullName;
      if (pEmail) pEmail.textContent = currentUser.email;
      // Set referral code
      const refCode = document.getElementById('referral-code-val');
      if (refCode && currentUser.name) {
        // Stable referral code based on email (same every login)
        const emailHash = (currentUser.email || '').split('').reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0);
        const refNum = Math.abs(emailHash % 9000) + 1000;
        refCode.value = 'COOK' + (currentUser.name || 'X').toUpperCase().slice(0, 4) + refNum;
      }
    }

    function showDashboard() {
      showPage('dashboard');
      showPanel('home');
      // Setup chef-specific UI if chef
      if (currentUser.role === 'Chef') {
        setTimeout(setupChefDashboard, 100);
      }
      // Set greeting
      const h = new Date().getHours();
      const greet = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
      const wbg = document.getElementById('wb-greeting');
      if (wbg) wbg.textContent = greet;
      // Restore location strip
      if (currentUser.location) updateLocationStrip(currentUser.location);
      // Update dynamic panel data
      setTimeout(() => {
        updateHomePanelStats();
        renderOrdersList();
        updateLoyaltyUI();
      }, 200);
      // Set today as default date in booking modal
      const bd = document.getElementById('book-date');
      if (bd) {
        const today = new Date().toISOString().split('T')[0];
        bd.value = today;
      }
    }

    function logout() {
      cart = [];
      sessionStorage.removeItem('coc_user');
      currentUser = { name: '', lastName: '', email: '', phone: '', initials: '', role: '', location: '' };
      // Reset all UI references
      const els = { 'sb-ava': 'G', 'sb-uname': 'Guest', 'h-ava': 'G', 'wb-name': 'Guest', 'wb-greeting': 'Good Morning' };
      Object.entries(els).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
      showPage('landing');
      showToast('You have been logged out.');
    }

    /* ──────────────────────────────
       DASHBOARD PANELS
    ────────────────────────────── */
    const panelTitles = {
      'home': 'Dashboard',
      'book-chef': 'Book a Chef',
      'delivery': 'Food Delivery',
      'orders': 'My Orders',
      'profile': 'My Profile',
      'chef-requests': 'Booking Requests',
      'chef-earnings': 'My Earnings'
    };

    function showPanel(panelId) {
      // Hide all panels
      document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));

      // Show target panel
      const target = document.getElementById('panel-' + panelId);
      if (target) target.classList.add('active');

      // Update header title
      const titleEl = document.getElementById('dash-title');
      if (titleEl) titleEl.textContent = panelTitles[panelId] || 'Dashboard';

      // Update sidebar active link — use data-panel attribute (reliable)
      document.querySelectorAll('.sb-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-panel') === panelId) {
          l.classList.add('active');
        }
      });
      // Close sidebar on mobile after panel selection
      if (window.innerWidth <= 900) closeSidebar();
    }

    /* ──────────────────────────────
       BOOKING MODAL
    ────────────────────────────── */
    function openBookingModal(name, spec, initials, avatarClass, price) {
      const cname = document.getElementById('modal-chef-name');
      const cspec = document.getElementById('modal-spec');
      const cprice = document.getElementById('modal-chef-price');
      const ava = document.getElementById('modal-ava');

      if (cname) cname.textContent = name;
      if (cspec) cspec.textContent = spec;
      if (cprice) cprice.textContent = '₹' + price + '/hr';

      if (ava) {
        ava.textContent = initials;
        ava.className = 'mcp-ava';
        if (avatarClass) {
          ava.classList.add(avatarClass);
          ava.style.background = '';
        } else {
          ava.style.background = 'linear-gradient(135deg, #EDE7F6, #B39DDB)';
        }
      }

      document.getElementById('booking-modal').classList.add('open');
    }

    function closeBookingModal() {
      document.getElementById('booking-modal').classList.remove('open');
    }

    function confirmBooking() {
      const chefName = document.getElementById('modal-chef-name') ? document.getElementById('modal-chef-name').textContent : 'Chef';
      const bDate = document.getElementById('book-date') ? document.getElementById('book-date').value : new Date().toLocaleDateString('en-IN');
      const bDur = document.getElementById('book-duration') ? document.getElementById('book-duration').value : '2 Hours';
      const bGuests = document.getElementById('book-guests') ? document.getElementById('book-guests').value : '2';
      const bPrice = document.getElementById('modal-chef-price') ? parseInt(document.getElementById('modal-chef-price').textContent.replace(/[^0-9]/g, '')) || 500 : 500;
      const hrs = bDur.includes('Full') ? 8 : (parseInt(bDur) || 2);
      const amount = bPrice * hrs;
      const booking = { customer: currentUser.name + ' ' + currentUser.lastName, chef: chefName, date: bDate, duration: bDur, guests: bGuests, amount, status: 'Pending', time: new Date().toLocaleTimeString('en-IN') };
      closeBookingModal();
      openPayModal(amount, { type: 'booking', booking, base: amount });
    }

    /* ──────────────────────────────
       CART
    ────────────────────────────── */
    function addToCart(name, price) {
      const existing = cart.find(i => i.name === name);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({ name, price, qty: 1 });
      }
      renderCart();
      showToast(name + ' added to cart!');
    }

    function changeQty(name, delta) {
      const idx = cart.findIndex(i => i.name === name);
      if (idx === -1) return;
      cart[idx].qty += delta;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
      renderCart();
    }

    function renderCart() {
      const container = document.getElementById('cart-items');
      const footer = document.getElementById('cart-footer');
      const countEl = document.getElementById('cart-count');
      const totalItems = cart.reduce((s, i) => s + i.qty, 0);
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

      if (countEl) countEl.textContent = totalItems;

      if (!container) return;

      if (cart.length === 0) {
        container.innerHTML = `
        <div class="cart-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p>Your cart is empty.<br/>Add items to get started.</p>
        </div>`;
        if (footer) footer.style.display = 'none';
        return;
      }

      container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="ci-name">${item.name}</div>
        <div class="ci-qty">
          <button class="qty-btn" onclick="changeQty('${item.name.replace(/'/g, "\\'")}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.name.replace(/'/g, "\\'")}', 1)">+</button>
        </div>
        <div class="ci-price">₹${item.price * item.qty}</div>
      </div>`).join('');

      const subEl = document.getElementById('cart-sub');
      const totalEl = document.getElementById('cart-total-val');
      if (subEl) subEl.textContent = '₹' + subtotal.toLocaleString('en-IN');
      if (totalEl) totalEl.textContent = '₹' + (subtotal + 50).toLocaleString('en-IN');
      if (footer) footer.style.display = 'block';
    }

    function toggleCart() {
      document.getElementById('cart-panel').classList.toggle('open');
    }

    function placeOrder() {
      if (cart.length === 0) { showToast('Your cart is empty.'); return; }
      const items = cart.map(i => i.name + ' x' + i.qty).join(', ');
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      const amount = subtotal + 50;
      const delivery = { customer: currentUser.name + ' ' + currentUser.lastName, items, amount, address: currentUser.location || 'Not set', time: new Date().toLocaleTimeString('en-IN'), status: 'Delivered' };
      openPayModal(amount, { type: 'delivery', delivery, base: amount });
    }

    /* ──────────────────────────────
       UI HELPERS
    ────────────────────────────── */
    function toggleCuisine(el) {
      const row = el.closest('.cuisine-row');
      if (row) { row.querySelectorAll('.ctag').forEach(t => t.classList.remove('active')); }
      el.classList.add('active');
    }

    /* ── MENU FILTER ── */
    const MENU_SECTIONS = {
      'gujarati': 'ms-gujarati',
      'punjabi': 'ms-punjabi',
      'chinese': 'ms-chinese',
      'south-indian': 'ms-south-indian',
      'fast-food': 'ms-fast-food',
      'chole-kulche': 'ms-chole-kulche',
      'dessert': 'ms-dessert',
      'cakes': 'ms-cakes'
    };

    /* FIX 1: Accordion menu filter */
    function filterMenu(cat, btn) {
      document.querySelectorAll('.mcat-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      const si = document.getElementById('menu-search-inp');
      if (si) si.value = '';
      hideSearchSuggestions();
      const all = cat === 'all';
      Object.entries(MENU_SECTIONS).forEach(([key, id]) => {
        const sec = document.getElementById(id);
        if (!sec) return;
        const body = document.getElementById('body-' + id);
        const chevron = document.getElementById('chevron-' + id);
        const show = all || ('ms-' + cat) === id;
        sec.classList.toggle('visible', show);
        sec.querySelectorAll('.menu-row').forEach(r => r.style.display = '');
        if (body) body.style.display = show ? '' : 'none';
        if (chevron) chevron.style.transform = show ? 'rotate(0deg)' : 'rotate(-90deg)';
      });
      const nr = document.getElementById('menu-no-results');
      if (nr) nr.style.display = 'none';
    }

    /* FIX 1: Click header to collapse/expand that cuisine */
    function toggleMenuSection(sectionId) {
      const body = document.getElementById('body-' + sectionId);
      const chevron = document.getElementById('chevron-' + sectionId);
      if (!body) return;
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : '';
      if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
    }

    /* FIX 2: Search with suggestions after 3+ chars */
    let _searchTimer = null;
    function filterMenuSearch(raw) {
      clearTimeout(_searchTimer);
      const q = raw.trim();
      if (q.length === 0) {
        hideSearchSuggestions();
        filterMenu('all', null);
        const first = document.querySelector('.mcat-btn');
        if (first) first.classList.add('active');
        return;
      }
      if (q.length < 3) { hideSearchSuggestions(); return; }
      _searchTimer = setTimeout(() => _runMenuSearch(q), 150);
    }

    function _runMenuSearch(q) {
      const ql = q.toLowerCase();
      document.querySelectorAll('.mcat-btn').forEach(b => b.classList.remove('active'));
      const suggestions = [];
      Object.values(MENU_SECTIONS).forEach(id => {
        const sec = document.getElementById(id);
        if (!sec) return;
        const body = document.getElementById('body-' + id);
        const chevron = document.getElementById('chevron-' + id);
        let hasMatch = false;
        sec.querySelectorAll('.menu-row').forEach(row => {
          const nameEl = row.querySelector('.mr-name');
          const subEl = row.querySelector('.mr-sub');
          const name = nameEl ? nameEl.textContent : '';
          const sub = subEl ? subEl.textContent : '';
          const match = name.toLowerCase().includes(ql) || sub.toLowerCase().includes(ql);
          row.style.display = match ? '' : 'none';
          if (match) { hasMatch = true; suggestions.push({ name: name.trim(), sub: sub.trim() }); }
        });
        sec.classList.toggle('visible', hasMatch);
        if (body) body.style.display = hasMatch ? '' : 'none';
        if (chevron) chevron.style.transform = hasMatch ? 'rotate(0deg)' : 'rotate(-90deg)';
      });
      const hasAny = Object.values(MENU_SECTIONS).some(id => {
        const e = document.getElementById(id); return e && e.classList.contains('visible');
      });
      const nr = document.getElementById('menu-no-results');
      if (nr) nr.style.display = hasAny ? 'none' : 'block';
      showSearchSuggestions(suggestions.slice(0, 7), q);
    }

    function showSearchSuggestions(items, query) {
      let box = document.getElementById('menu-search-suggestions');
      if (!box) {
        box = document.createElement('div');
        box.id = 'menu-search-suggestions';
        box.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--white);border:1.5px solid var(--border);border-radius:12px;box-shadow:0 8px 28px rgba(26,16,8,0.12);z-index:999;overflow:hidden;max-height:280px;overflow-y:auto;';
        const wrap = document.querySelector('.menu-search-wrap');
        if (wrap) wrap.appendChild(box);
      }
      if (!items.length) { box.style.display = 'none'; return; }
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
      box.innerHTML = items.map(item => {
        const hl = item.name.replace(new RegExp('(' + esc(query) + ')', 'gi'),
          '<strong style="color:var(--saffron)">$1</strong>');
        return `<div onclick="applyMenuSuggestion('${item.name.replace(/'/g,"\'")}')"
          style="padding:11px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(232,131,42,0.07);"
          onmouseover="this.style.background='rgba(232,131,42,0.06)'"
          onmouseout="this.style.background=''">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.88rem;font-weight:600;color:var(--dark);">${hl}</div>
            ${item.sub ? `<div style="font-size:0.74rem;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.sub.slice(0,55)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      box.style.display = 'block';
    }

    function applyMenuSuggestion(name) {
      const si = document.getElementById('menu-search-inp');
      if (si) si.value = name;
      hideSearchSuggestions();
      _runMenuSearch(name);
    }

    function hideSearchSuggestions() {
      const box = document.getElementById('menu-search-suggestions');
      if (box) box.style.display = 'none';
    }

    document.addEventListener('click', function(e) {
      if (!e.target.closest || !e.target.closest('.menu-search-wrap')) hideSearchSuggestions();
    });

    /* Clone menu into chef booking reference panel */
    function buildChefMenuRef() {
      const target = document.getElementById('chef-booking-menu-ref');
      const source = document.getElementById('panel-delivery');
      if (!target || !source) return;
      // Only copy the menu sections, not the cart/header
      const cloned = document.createElement('div');
      source.querySelectorAll('.menu-section').forEach(sec => {
        const c = sec.cloneNode(true);
        c.style.pointerEvents = 'none'; // read-only view
        // hide add buttons in chef ref
        c.querySelectorAll('.btn-add').forEach(b => b.style.display = 'none');
        // Adjust grid - remove last column
        c.querySelectorAll('.menu-table-head, .menu-row').forEach(row => {
          row.style.gridTemplateColumns = '48px 1fr 80px 90px';
        });
        c.classList.add('visible');
        cloned.appendChild(c);
      });
      target.innerHTML = '';
      target.appendChild(cloned);
    }
    // Build chef menu ref after DOM loads
    setTimeout(buildChefMenuRef, 600);

    function filterOrders(el) {
      document.querySelectorAll('.o-filter').forEach(f => f.classList.remove('active'));
      el.classList.add('active');
    }

    let toastTimer = null;
    function showToast(msg) {
      const toast = document.getElementById('toast');
      const msgEl = document.getElementById('toast-msg');
      if (!toast || !msgEl) return;
      msgEl.textContent = msg;
      toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    /* ──────────────────────────────
       SCROLL REVEAL (landing only)
    ────────────────────────────── */
    const revObs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 70);
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

    /* ──────────────────────────────
       CLOSE MODAL ON BACKDROP CLICK
    ────────────────────────────── */
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) {
      bookingModal.addEventListener('click', function (e) {
        if (e.target === this) closeBookingModal();
      });
    }



    /* ══════════════════════════════════════
       MOBILE NAV (LANDING PAGE)
    ══════════════════════════════════════ */
    function toggleMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      const overlay = document.getElementById('mobile-nav-overlay');
      const burger = document.getElementById('nav-hamburger');
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        burger.classList.remove('open');
        document.body.style.overflow = '';
      } else {
        drawer.classList.add('open');
        overlay.classList.add('open');
        burger.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }
    function closeMobileNav() {
      document.getElementById('mobile-nav-drawer').classList.remove('open');
      document.getElementById('mobile-nav-overlay').classList.remove('open');
      const b = document.getElementById('nav-hamburger');
      if (b) { b.classList.remove('open'); }
      document.body.style.overflow = '';
    }

    /* ══════════════════════════════════════
       SIDEBAR TOGGLE (DASHBOARD MOBILE)
    ══════════════════════════════════════ */
    function toggleSidebar() {
      // Mobile: slide in/out
      if (window.innerWidth <= 900) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const isOpen = sidebar && sidebar.classList.contains('open');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.style.display = isOpen ? 'none' : 'block';
        document.body.style.overflow = isOpen ? '' : 'hidden';
      } else {
        // Desktop: collapse to icon strip
        toggleSidebarCollapse();
      }
    }

    function toggleSidebarCollapse() {
      const collapsed = document.body.classList.toggle('sb-collapsed');
      localStorage.setItem('coc_sb_collapsed', collapsed ? '1' : '0');
    }

    function toggleAdminCollapse() {
      const collapsed = document.body.classList.toggle('admin-sb-collapsed');
      localStorage.setItem('coc_admin_sb_collapsed', collapsed ? '1' : '0');
    }

    function initSidebarState() {
      if (localStorage.getItem('coc_sb_collapsed') === '1') {
        document.body.classList.add('sb-collapsed');
      }
      if (localStorage.getItem('coc_admin_sb_collapsed') === '1') {
        document.body.classList.add('admin-sb-collapsed');
      }
    }
    function closeSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.style.display = 'none';
      document.body.style.overflow = '';
    }


    /* ══════════════════════════════════════
       HERO SEARCH
    ══════════════════════════════════════ */
    function heroSearch() {
      const city = document.getElementById('hs-city') ? document.getElementById('hs-city').value.trim() : '';
      const cuisine = document.getElementById('hs-cuisine') ? document.getElementById('hs-cuisine').value : '';
      const type = document.getElementById('hs-type') ? document.getElementById('hs-type').value : '';
      showAuth('signup');
      showToast('Sign up to search chefs' + (city ? ' in ' + city : '') + '!');
    }

    /* ══════════════════════════════════════
       FAQ TOGGLE
    ══════════════════════════════════════ */
    function toggleFaq(el) {
      const isOpen = el.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
      if (!isOpen) el.classList.add('open');
    }

    /* ══════════════════════════════════════
       NOTIFICATIONS
    ══════════════════════════════════════ */
    let notifications = [];
    function addNotification(text) {
      notifications.unshift({ text, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), read: false });
      renderNotifications();
      updateNotifBadge();
    }
    function renderNotifications() {
      const list = document.getElementById('notif-list');
      if (!list) return;
      if (!notifications.length) { list.innerHTML = '<div class="notif-empty">No notifications yet</div>'; return; }
      list.innerHTML = notifications.map((n, i) => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead(${i})">
        <div class="notif-dot ${n.read ? 'read' : ''}"></div>
        <div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time}</div></div>
      </div>`).join('');
    }
    function markNotifRead(i) { if (notifications[i]) { notifications[i].read = true; renderNotifications(); updateNotifBadge(); } }
    function updateNotifBadge() {
      const count = notifications.filter(n => !n.read).length;
      const badge = document.getElementById('notif-badge');
      if (!badge) return;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    function toggleNotifPanel() {
      const panel = document.getElementById('notif-panel');
      const overlay = document.getElementById('notif-overlay');
      if (!panel) return;
      const isOpen = panel.classList.contains('open');
      if (isOpen) { panel.classList.remove('open'); if (overlay) overlay.classList.remove('open'); }
      else { panel.classList.add('open'); if (overlay) overlay.classList.add('open'); renderNotifications(); notifications.forEach(n => n.read = true); updateNotifBadge(); }
    }
    function closeNotifPanel() {
      const p = document.getElementById('notif-panel');
      const o = document.getElementById('notif-overlay');
      if (p) p.classList.remove('open');
      if (o) o.classList.remove('open');
    }
    function clearNotifications() { notifications = []; renderNotifications(); updateNotifBadge(); closeNotifPanel(); }

    /* ══════════════════════════════════════
       REVIEW SYSTEM
    ══════════════════════════════════════ */
    let currentRating = 0;
    let reviewChefName = '';
    function openReviewModal(chefName, initials) {
      reviewChefName = chefName;
      currentRating = 0;
      const txt = document.getElementById('review-chef-name-txt');
      if (txt) txt.textContent = 'How was your experience with ' + chefName + '?';
      document.querySelectorAll('#star-picker span').forEach(s => s.classList.remove('active'));
      const rtxt = document.getElementById('review-text-input');
      if (rtxt) rtxt.value = '';
      document.getElementById('review-modal').classList.add('open');
    }
    function closeReviewModal() { document.getElementById('review-modal').classList.remove('open'); }
    function setRating(n) {
      currentRating = n;
      document.querySelectorAll('#star-picker span').forEach((s, i) => {
        s.classList.toggle('active', i < n);
      });
    }
    function submitReview() {
      if (!currentRating) { showToast('Please select a star rating.'); return; }
      const text = document.getElementById('review-text-input').value.trim();
      const review = {
        author: currentUser.name + ' ' + currentUser.lastName,
        initials: currentUser.initials,
        chef: reviewChefName,
        rating: currentRating,
        text: text || 'Great experience!',
        date: 'Just now'
      };
      // Save to reviews
      try {
        const reviews = JSON.parse(localStorage.getItem('coc_reviews') || '[]');
        reviews.unshift(review);
        localStorage.setItem('coc_reviews', JSON.stringify(reviews));
        // Save to Firestore
        if (dbReady) {
          db.collection('reviews').add({
            ...review,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(e => console.warn('Firestore review:', e));
        }
      } catch (e) { }
      // Add to reviews list UI
      const list = document.getElementById('reviews-list');
      if (list) {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        list.insertAdjacentHTML('afterbegin', `
        <div class="review-item" style="animation:fadeUp 0.4s ease both">
          <div class="review-header">
            <div class="review-ava">${review.initials}</div>
            <div class="review-meta">
              <div class="review-author">${review.author}</div>
              <div class="review-date">${review.date}</div>
            </div>
            <div class="review-stars">${stars}</div>
          </div>
          <div class="review-text">${review.text}</div>
        </div>`);
      }
      logActivity(currentUser.name, 'Review', 'Rated ' + reviewChefName + ' ' + currentRating + ' stars');
      closeReviewModal();
      showToast('Review submitted! Thank you.');
    }

    /* ══════════════════════════════════════
       PAYMENT MODAL
    ══════════════════════════════════════ */
    let payContext = {};
    let selectedPayMethod = 'upi';
    let couponDiscount = 0;
    const VALID_COUPONS = { 'COOK100': 100, 'FIRST200': 200, 'SAVE50': 50 };

    function openPayModal(amount, context) {
      payContext = context || {};
      couponDiscount = 0;
      const couponIn = document.getElementById('coupon-code-input');
      const couponSuc = document.getElementById('coupon-success');
      if (couponIn) couponIn.value = '';
      if (couponSuc) couponSuc.style.display = 'none';
      updatePaySummary(amount);
      const pm = document.getElementById('pay-modal'); if (pm) pm.classList.add('open');
    }
    function closePayModal() { document.getElementById('pay-modal').classList.remove('open'); }
    function updatePaySummary(base) {
      const fee = Math.round(base * 0.05);
      const total = base + fee - couponDiscount;
      const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      setEl('pay-booking-amt', '₹' + base.toLocaleString('en-IN'));
      setEl('pay-platform-fee', '₹' + fee.toLocaleString('en-IN'));
      setEl('pay-total-amt', '₹' + Math.max(0, total).toLocaleString('en-IN'));
      payContext.total = Math.max(0, total);
      payContext.base = base;
    }
    function selectPayMethod(el, method) {
      document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
      el.classList.add('selected');
      selectedPayMethod = method;
    }
    function applyCoupon() {
      const code = (document.getElementById('coupon-code-input').value || '').trim().toUpperCase();
      if (!code) { showToast('Please enter a coupon code.'); return; }
      if (VALID_COUPONS[code]) {
        couponDiscount = VALID_COUPONS[code];
        const sucEl = document.getElementById('coupon-success');
        const saveEl = document.getElementById('coupon-save');
        const discRow = document.getElementById('pay-discount-row');
        const discAmt = document.getElementById('pay-discount-amt');
        if (sucEl) sucEl.style.display = 'block';
        if (saveEl) saveEl.textContent = couponDiscount;
        if (discRow) discRow.style.display = 'flex';
        if (discAmt) discAmt.textContent = '-₹' + couponDiscount;
        updatePaySummary(payContext.base || 0);
        showToast('Coupon applied! ₹' + couponDiscount + ' off.');
      } else {
        showToast('Invalid coupon code.');
      }
    }
    function processPayment() {
      closePayModal();
      if (payContext.type === 'booking') {
        // Save booking
        const bookings = getBookings();
        bookings.push({ ...payContext.booking, amount: payContext.total, payMethod: selectedPayMethod, status: 'Pending', createdAt: new Date().toISOString() });
        saveBookings(bookings);
        logActivity(currentUser.name, 'Payment', '₹' + payContext.total + ' via ' + selectedPayMethod);
        addNotification('Booking confirmed for ' + (payContext.booking?.chef || 'chef') + '! Payment of ₹' + payContext.total + ' received.');
        showToast('Payment successful! Booking confirmed.');
        addLoyaltyPoints(payContext.total);
        showPanel('orders');
        setTimeout(renderOrdersList, 100);
        setTimeout(updateHomePanelStats, 100);
        setTimeout(updateLoyaltyUI, 200);
      } else if (payContext.type === 'delivery') {
        const deliveries = getDeliveries();
        deliveries.push({ ...payContext.delivery, amount: payContext.total, payMethod: selectedPayMethod, status: 'Delivered' });
        saveDeliveries(deliveries);
        logActivity(currentUser.name, 'Payment', '₹' + payContext.total + ' delivery via ' + selectedPayMethod);
        addNotification('Order placed! Estimated delivery: 45–60 mins.');
        cart = []; renderCart();
        document.getElementById('cart-panel').classList.remove('open');
        showToast('Order placed! Payment of ₹' + payContext.total + ' done.');
        addLoyaltyPoints(payContext.total);
        showPanel('orders');
        setTimeout(renderOrdersList, 100);
        setTimeout(updateHomePanelStats, 100);
        setTimeout(updateLoyaltyUI, 200);
      }
    }

    /* ══════════════════════════════════════
       FORGOT PASSWORD
    ══════════════════════════════════════ */
    function openForgotModal() { document.getElementById('forgot-modal').classList.add('open'); showForgotStep(1); }
    function closeForgotModal() { document.getElementById('forgot-modal').classList.remove('open'); }
    function showForgotStep(n) {
      document.querySelectorAll('.forgot-step').forEach(s => s.classList.remove('active'));
      const step = document.getElementById('forgot-step-' + n);
      if (step) step.classList.add('active');
    }
    async function forgotSendOTP() {
      const id = (document.getElementById('forgot-identifier').value || '').trim();
      if (!id) { showToast('Please enter your phone or email.'); return; }
      const users = getUsers();
      const found = users.find(u => u.email === id || u.phone === id);
      if (!found) { showToast('No account found with this phone/email.'); return; }
      // Use phone number for OTP
      const phone = found.phone;
      if (!phone) { showToast('No phone number linked to this account.'); return; }
      const formatted = formatPhone(phone);
      const btn = document.querySelector('#forgot-step-1 button');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      try {
        const appVerifier = initRecaptcha();
        if (!appVerifier) throw new Error('reCAPTCHA not ready');
        confirmationResult = await firebase.auth().signInWithPhoneNumber(formatted, appVerifier);
        showToast('OTP sent to ' + formatted + ' ✅');
        showForgotStep(2);
      } catch (e) {
        console.error('Forgot OTP error:', e);
        resetRecaptcha();
        if (e.code === 'auth/too-many-requests') {
          showToast('Too many attempts. Wait a few minutes.');
        } else if (e.code === 'auth/captcha-check-failed') {
          showToast('Security check failed. Please refresh and try again.');
        } else {
          showToast('Could not send OTP. Please refresh and try again.');
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Send OTP'; }
      }
    }
    async function forgotVerifyOTP() {
      const otp = (document.getElementById('forgot-otp').value || '').trim();
      if (!otp || otp.length < 6) { showToast('Enter the 6-digit OTP.'); return; }
      if (!confirmationResult) { showToast('Please request OTP first.'); return; }
      try {
        await confirmationResult.confirm(otp);
        showToast('OTP verified! ✅');
        showForgotStep(3);
      } catch (e) {
        if (e.code === 'auth/invalid-verification-code') {
          showToast('Incorrect OTP. Please try again.');
        } else if (e.code === 'auth/code-expired') {
          showToast('OTP expired. Please request a new one.');
        } else {
          showToast('Verification failed. Try again.');
        }
      }
    }
    function forgotResetPassword() {
      const np = (document.getElementById('forgot-new-pass').value || '').trim();
      const cp = (document.getElementById('forgot-confirm-pass').value || '').trim();
      if (!np || !cp) { showToast('Please fill both fields.'); return; }
      if (np.length < 6) { showToast('Password must be at least 6 characters.'); return; }
      if (np !== cp) { showToast('Passwords do not match.'); return; }
      const id = (document.getElementById('forgot-identifier').value || '').trim();
      const users = getUsers();
      const idx = users.findIndex(u => u.email === id || u.phone === id);
      if (idx > -1) {
        // Hash the new password before saving
        users[idx].pass = hashPassword(np);
        saveUsers(users);

      }
      closeForgotModal();
      showToast('Password reset successfully! Please login.');
    }

    /* ══════════════════════════════════════
       CHEF DASHBOARD
    ══════════════════════════════════════ */
    function setupChefDashboard() {
      // Show chef-specific sidebar items
      const chefItems = ['sb-chef-requests', 'sb-chef-earnings'];
      chefItems.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
      // Hide customer-only items for chefs
      ['[data-panel="delivery"]', '[data-panel="book-chef"]'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
      });
      // Update welcome banner for chef
      const wbName = document.getElementById('wb-name');
      if (wbName) wbName.textContent = currentUser.name;
      // Update service cards visibility
      const sCards = document.querySelector('.service-cards');
      if (sCards) sCards.style.display = 'none';
      // Show chef welcome instead
      const wb = document.querySelector('.welcome-banner');
      if (wb) {
        const actions = wb.querySelector('.wb-actions');
        if (actions) actions.innerHTML = '<button class="wb-btn wb-btn-primary" onclick="showPanel(&quot;chef-requests&quot;)">&#128197; View Requests</button><button class="wb-btn wb-btn-secondary" onclick="showPanel(&quot;chef-earnings&quot;)">&#128176; My Earnings</button>';
      }
      // Load pending bookings for chef
      const bookings = getBookings();
      const chefBookings = bookings.filter(b => b.chef && b.chef.toLowerCase().includes(currentUser.name.toLowerCase()) && b.status === 'Pending');
      const list = document.getElementById('chef-requests-list');
      if (list && chefBookings.length) {
        list.innerHTML = chefBookings.map((b, i) => `
        <div class="booking-req-card">
          <div class="brq-ava">${(b.customer || 'C').charAt(0)}</div>
          <div class="brq-info">
            <div class="brq-name">${b.customer}</div>
            <div class="brq-detail">${b.date} · ${b.duration || '2hr'} · ${b.guests || 2} guests</div>
          </div>
          <div class="brq-amount">₹${b.amount}</div>
          <div class="brq-actions">
            <button class="btn-accept" onclick="respondBooking(${i},'Confirmed')">Accept</button>
            <button class="btn-reject" onclick="respondBooking(${i},'Cancelled')">Decline</button>
          </div>
        </div>`).join('');
        const badge = document.getElementById('sb-req-badge');
        if (badge) { badge.textContent = chefBookings.length; badge.style.display = 'inline'; }
        addNotification('You have ' + chefBookings.length + ' new booking request(s).');
      }
      // Load earnings
      const jobs = bookings.filter(b => b.chef && b.chef.toLowerCase().includes(currentUser.name.toLowerCase()) && b.status === 'Confirmed');
      const totalEarned = jobs.reduce((s, b) => s + (Number(b.amount) * 0.8 || 0), 0);
      const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      setEl('earn-total', '₹' + Math.round(totalEarned).toLocaleString('en-IN'));
      setEl('earn-month', '₹' + Math.round(totalEarned * 0.4).toLocaleString('en-IN'));
      setEl('earn-week', '₹' + Math.round(totalEarned * 0.15).toLocaleString('en-IN'));
      setEl('earn-today', '₹' + Math.round(totalEarned * 0.05).toLocaleString('en-IN'));
      const jobsBody = document.getElementById('chef-jobs-body');
      if (jobsBody && jobs.length) {
        jobsBody.innerHTML = jobs.map(b => `
        <tr><td>${b.customer}</td><td>${b.date}</td><td>${b.duration || '2hr'}</td>
        <td style="color:var(--green);font-weight:700">₹${Math.round(b.amount * 0.8).toLocaleString('en-IN')}</td>
        <td><span class="bi-status status-confirmed">Done</span></td></tr>`).join('');
      }
    }
    function respondBooking(idx, status) {
      const bookings = getBookings();
      if (bookings[idx]) {
        bookings[idx].status = status;
        saveBookings(bookings);
        if (dbReady && bookings[idx]._fid) {
          db.collection('bookings').doc(bookings[idx]._fid)
            .update({ status }).catch(e => console.warn('Firestore booking:', e));
        }
      }
      setupChefDashboard();
      addNotification('Booking ' + status.toLowerCase() + ' successfully.');
      showToast(status === 'Confirmed' ? '✅ Booking accepted!' : '❌ Booking declined.');
    }

    function updateBookingStatus(bookingFid, newStatus) {
      const bookings = getBookings();
      const idx = bookings.findIndex(b => b._fid === bookingFid || String(b.id) === String(bookingFid));
      if (idx > -1) {
        bookings[idx].status = newStatus;
        saveBookings(bookings);
        if (dbReady && bookings[idx]._fid) {
          db.collection('bookings').doc(bookings[idx]._fid)
            .update({ status: newStatus }).catch(e => console.warn('Firestore status:', e));
        }
        logActivity(currentUser.name, 'Status', 'Booking → ' + newStatus);
        showToast('Status: ' + newStatus);
        renderOrdersList();
        setupChefDashboard();
      }
    }
    function toggleChefAvailability(el) {
      const label = el.closest('.chef-avail-toggle').querySelector('.toggle-label');
      if (label) label.textContent = el.checked ? 'Available' : 'Offline';
      showToast(el.checked ? 'You are now available for bookings.' : 'You are now offline.');
    }

    /* ══════════════════════════════════════
       REFERRAL CODE
    ══════════════════════════════════════ */
    function copyReferralCode() {
      const code = document.getElementById('referral-code-val');
      if (code) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code.value)
            .then(() => showToast('Referral code copied!'))
            .catch(() => {
              code.select(); code.setSelectionRange(0, 99999);
              try { document.execCommand('copy'); showToast('Referral code copied!'); }
              catch (e) { showToast('Please copy: ' + code.value); }
            });
        } else {
          code.select(); code.setSelectionRange(0, 99999);
          try { document.execCommand('copy'); showToast('Referral code copied!'); }
          catch (e) { showToast('Please copy: ' + code.value); }
        }
      }
    }

    /* ══════════════════════════════════════
       CONTACT FORM
    ══════════════════════════════════════ */
    function sendContactMessage() {
      const name = (document.getElementById('contact-name').value || '').trim();
      const email = (document.getElementById('contact-email').value || '').trim();
      const subject = (document.getElementById('contact-subject').value || '').trim();
      const message = (document.getElementById('contact-message').value || '').trim();
      if (!name || !email || !message) { showToast('Please fill all required fields.'); return; }
      // Save to localStorage for admin to see
      try {
        const msgs = JSON.parse(localStorage.getItem('coc_messages') || '[]');
        msgs.unshift({ name, email, subject, message, time: new Date().toLocaleString('en-IN') });
        localStorage.setItem('coc_messages', JSON.stringify(msgs));
        // Save to Firestore
        if (dbReady) {
          db.collection('messages').add({
            name, email, subject, message,
            time: new Date().toLocaleString('en-IN'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(e => console.warn('Firestore message:', e));
        }
      } catch (e) { }
      document.getElementById('contact-name').value = '';
      document.getElementById('contact-email').value = '';
      document.getElementById('contact-subject').value = '';
      document.getElementById('contact-message').value = '';
      showToast('Message sent! We will reply within 24 hours.');
      logActivity(name, 'Contact', subject || 'New message');
    }

    /* ══════════════════════════════════════
       BOOKING STATUS TRAIL
    ══════════════════════════════════════ */
    function getBookingStatusStep(status) {
      const steps = ['Pending', 'Confirmed', 'On the way', 'Arrived', 'Completed'];
      return steps.indexOf(status);
    }


    /* ══════════════════════════════════════
       FIREBASE INIT
    ══════════════════════════════════════ */
    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyBjySHeMwUh25r0begsKd5UBZcVIPD4Pms",
      authDomain: "cookoncall.firebaseapp.com",
      projectId: "cookoncall",
      storageBucket: "cookoncall.firebasestorage.app",
      messagingSenderId: "196763612872",
      appId: "1:196763612872:web:e61b0c26413d682dae57fd",
      measurementId: "G-S6GS34N5N6"
    };
    let db = null;
    let dbReady = false;
    try {
      if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log('✅ Firebase SDK loaded');
      } else {
        console.warn('⚠️ Firebase SDK not loaded — running in offline mode');
      }
    } catch (e) {
      console.warn('⚠️ Firebase init error:', e.message);
    }


    /* ══════════════════════════════════════
       CURRENT USER TYPE (customer / chef)
    ══════════════════════════════════════ */
    let currentUserType = 'customer'; // 'customer' or 'chef'



    /* ══════════════════════════════════════
       USER TYPE SWITCHER
    ══════════════════════════════════════ */
    function switchUserType(type) {
      currentUserType = type;
      // Update buttons
      document.querySelectorAll('.utype-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('utype-' + type);
      if (btn) btn.classList.add('active');
      // Update text
      const loginSub = document.getElementById('login-subtitle');
      const signupH = document.getElementById('signup-heading');
      const signupSub = document.getElementById('signup-subtitle');
      const chefExtra = document.getElementById('chef-extra-fields');
      const signupOTP = document.getElementById('signup-otp-field');
      if (type === 'chef') {
        if (loginSub) loginSub.textContent = 'Login to your chef account';
        if (signupH) signupH.textContent = 'Join as a Chef';
        if (signupSub) signupSub.textContent = 'Start earning by cooking for families';
        if (chefExtra) chefExtra.style.display = 'block';
      } else {
        if (loginSub) loginSub.textContent = 'Login to your customer account';
        if (signupH) signupH.textContent = 'Create Account';
        if (signupSub) signupSub.textContent = 'Join CookOnCall today';
        if (chefExtra) chefExtra.style.display = 'none';
      }
      // Clear all fields
      ['login-email', 'login-pass', 'login-otp', 'signup-fname', 'signup-lname',
        'signup-phone', 'signup-email', 'signup-pass', 'signup-city', 'signup-specialties'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
      // Reset OTP on user type switch
      const _f = document.getElementById('signup-otp-field'); if (_f) _f.style.display = 'none';
      const _b = document.querySelector('#form-signup .btn-auth'); if (_b) _b.textContent = 'Create Account';
      otpVerified = false; confirmationResult = null; resetRecaptcha();
    }

    /* ══════════════════════════════════════
       REAL FIREBASE PHONE AUTH — OTP
    ══════════════════════════════════════ */
    let otpVerified = false;
    let confirmationResult = null;  // Firebase confirmation object
    let recaptchaVerifier = null;  // Firebase reCAPTCHA

    // Format phone number to E.164 format (+91XXXXXXXXXX)
    function formatPhone(phone) {
      phone = phone.replace(/\s+/g, '').replace(/-/g, '');
      if (phone.startsWith('+')) return phone;
      if (phone.startsWith('0')) phone = phone.slice(1);
      return '+91' + phone;
    }

    // Initialize reCAPTCHA verifier (invisible — user never sees it)
    function initRecaptcha() {
      try {
        if (!firebase.auth) { console.warn('Firebase Auth not ready'); return null; }
        // Reuse existing verifier if valid
        if (recaptchaVerifier) return recaptchaVerifier;
        // Clear container HTML first to avoid "already rendered" error
        const container = document.getElementById('recaptcha-container');
        if (container) container.innerHTML = '';
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
          callback: () => { },
          'expired-callback': () => {
            showToast('Session expired. Please try again.');
            recaptchaVerifier = null;
          }
        });
        return recaptchaVerifier;
      } catch (e) {
        console.warn('reCAPTCHA init error:', e.message);
        recaptchaVerifier = null;
        return null;
      }
    }
    // Reset reCAPTCHA (call after each OTP attempt)
    function resetRecaptcha() {
      try {
        if (recaptchaVerifier) { recaptchaVerifier.clear(); }
      } catch (e) { }
      recaptchaVerifier = null;
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';
    }

    // ── SEND OTP (Signup) ──────────────────────────────────────
    async function sendSignupOTP() {
      const rawPhone = (document.getElementById('signup-phone').value || '').trim();
      if (!rawPhone || rawPhone.replace(/\D/g, '').length < 10) {
        showToast('Please enter a valid 10-digit phone number.');
        return;
      }
      const phone = formatPhone(rawPhone);
      const sendBtn = document.querySelector('#signup-otp-field button');
      if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }
      try {
        const appVerifier = initRecaptcha();
        if (!appVerifier) throw new Error('reCAPTCHA not ready');
        confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, appVerifier);
        const field = document.getElementById('signup-otp-field');
        if (field) field.style.display = 'block';
        showToast('OTP sent to ' + phone + ' ✅');
        if (sendBtn) { sendBtn.textContent = 'Resend'; sendBtn.disabled = false; }
      } catch (e) {
        console.error('OTP send error:', e);
        resetRecaptcha();
        if (e.code === 'auth/invalid-phone-number') {
          showToast('Invalid phone number. Use format: 9876543210');
        } else if (e.code === 'auth/too-many-requests') {
          showToast('Too many attempts. Please wait a few minutes.');
        } else if (e.code === 'auth/quota-exceeded') {
          showToast('SMS quota exceeded. Try again tomorrow.');
        } else if (e.code === 'auth/captcha-check-failed') {
          showToast('Security check failed. Please refresh the page and try again.');
        } else {
          showToast('Could not send OTP. Please refresh and try again.');
        }
        if (sendBtn) { sendBtn.textContent = 'Send OTP'; sendBtn.disabled = false; }
      }
    }

    // ── VERIFY OTP (Signup) ────────────────────────────────────
    async function verifySignupOTP() {
      const entered = (document.getElementById('signup-otp').value || '').trim();
      if (!entered || entered.length < 6) {
        showToast('Please enter the 6-digit OTP.');
        return false;
      }
      if (!confirmationResult) {
        showToast('Please send OTP first.');
        return false;
      }
      try {
        await confirmationResult.confirm(entered);
        otpVerified = true;
        showToast('Phone verified successfully! ✅');
        return true;
      } catch (e) {
        console.error('OTP verify error:', e);
        if (e.code === 'auth/invalid-verification-code') {
          showToast('Incorrect OTP. Please check and try again.');
        } else if (e.code === 'auth/code-expired') {
          showToast('OTP has expired. Please request a new one.');
        } else {
          showToast('Verification failed. Please try again.');
        }
        return false;
      }
    }

    // ── RESEND OTP ─────────────────────────────────────────────
    function resendOTP() {
      showToast('Sending new OTP...');
      sendSignupOTP();
    }

    /* ══════════════════════════════════════
       ADMIN SIDEBAR MOBILE TOGGLE
    ══════════════════════════════════════ */
    function toggleAdminSidebar() {
      if (window.innerWidth <= 640) {
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) sidebar.classList.toggle('open');
      } else {
        toggleAdminCollapse();
      }
    }

    /* ══════════════════════════════════════
       UPDATE ORDERS LIST DYNAMICALLY
    ══════════════════════════════════════ */
    function renderOrdersList() {
      const list = document.getElementById('orders-dynamic-list');
      if (!list) return;
      const bookings = getBookings().filter(b => b.customer && currentUser.name &&
        b.customer.toLowerCase().includes(currentUser.name.toLowerCase()));
      const deliveries = getDeliveries().filter(d => d.customer && currentUser.name &&
        d.customer.toLowerCase().includes(currentUser.name.toLowerCase()));
      const all = [
        ...bookings.map(b => ({ ...b, _type: 'booking' })),
        ...deliveries.map(d => ({ ...d, _type: 'delivery' }))
      ].sort((a, b) => (b.id || 0) - (a.id || 0));
      if (!all.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No orders yet. Book a chef or order food to get started!</div>';
        return;
      }
      list.innerHTML = all.map(o => {
        if (o._type === 'booking') {
          const bColor = o.status === 'Completed' ? 'status-completed' : o.status === 'Pending' ? 'status-pending' : 'status-confirmed';
          return `<div class="ot-row">
          <span><strong style="font-size:0.85rem">${o.chef || 'Chef'}</strong><br/><small style="color:var(--muted)">${o.duration || ''}</small></span>
          <span style="color:var(--muted)">${o.date || ''}</span>
          <span><span class="mc-tag" style="background:rgba(232,131,42,0.1);color:var(--saffron)">Chef</span></span>
          <span class="ot-id">₹${(o.amount || 0).toLocaleString('en-IN')}</span>
          <span><span class="bi-status ${bColor}">${o.status || 'Pending'}</span></span>
        </div>`;
        } else {
          const dColor = o.status === 'Delivered' ? 'status-completed' : 'status-pending';
          return `<div class="ot-row">
          <span><strong style="font-size:0.85rem">Delivery</strong><br/><small style="color:var(--muted)">${(o.items || '').slice(0, 30)}</small></span>
          <span style="color:var(--muted)">${o.time || ''}</span>
          <span><span class="mc-tag tag-veg">Delivery</span></span>
          <span class="ot-id">₹${(o.amount || 0).toLocaleString('en-IN')}</span>
          <span><span class="bi-status ${dColor}">${o.status || 'Delivered'}</span></span>
        </div>`;
        }
      }).join('');
    }

    /* ══════════════════════════════════════
       UPDATE HOME PANEL STATS DYNAMICALLY
    ══════════════════════════════════════ */
    function updateHomePanelStats() {
      const bookings = getBookings().filter(b => b.customer && currentUser.name &&
        b.customer.toLowerCase().includes(currentUser.name.toLowerCase()));
      const deliveries = getDeliveries().filter(d => d.customer && currentUser.name &&
        d.customer.toLowerCase().includes(currentUser.name.toLowerCase()));
      const totalSpent = [...bookings, ...deliveries].reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      setEl('stat-bookings', bookings.length);
      setEl('stat-bookings-sub', bookings.length > 0 ? '+' + bookings.length + ' total' : '');
      setEl('stat-orders', deliveries.length);
      setEl('stat-orders-sub', deliveries.length > 0 ? '+' + deliveries.length + ' total' : '');
      setEl('stat-spent', '₹' + totalSpent.toLocaleString('en-IN'));
      setEl('stat-spent-sub', totalSpent > 0 ? 'Lifetime spend' : '');
      // Recent bookings widget
      const rb = document.getElementById('home-recent-bookings');
      if (rb) {
        if (!bookings.length) {
          rb.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:0.85rem">No bookings yet</div>';
        } else {
          rb.innerHTML = bookings.slice(0, 4).map(b => `
          <div class="booking-item">
            <div class="bi-ava" style="background:linear-gradient(135deg,#FFE4B5,#FFB347);color:rgba(74,44,10,0.5);font-size:0.65rem;font-weight:700">${(b.chef || 'C').charAt(0)}</div>
            <div class="bi-info">
              <div class="bi-name">${b.chef || 'Chef'}</div>
              <div class="bi-detail">${b.date || ''} · ${b.duration || ''}</div>
            </div>
            <span class="bi-status ${b.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}">${b.status || 'Pending'}</span>
          </div>`).join('');
        }
      }
    }




    /* ══════════════════════════════════════
       LOYALTY POINTS
    ══════════════════════════════════════ */
    function getLoyaltyPoints() {
      const users = getUsers();
      const u = users.find(x => x.email === currentUser.email);
      return u ? (u.loyaltyPoints || 0) : 0;
    }
    function addLoyaltyPoints(amount) {
      const pts = Math.floor(amount / 10); // 1 point per ₹10 spent
      const users = getUsers();
      const idx = users.findIndex(u => u.email === currentUser.email);
      if (idx > -1) {
        users[idx].loyaltyPoints = (users[idx].loyaltyPoints || 0) + pts;
        saveUsers(users);
        if (pts > 0) showToast('🎉 You earned ' + pts + ' loyalty points!');
      }
    }
    function updateLoyaltyUI() {
      const pts = getLoyaltyPoints();
      const el = document.getElementById('loyalty-points-val');
      if (el) el.textContent = pts + ' pts';
      const bar = document.getElementById('loyalty-bar');
      if (bar) bar.style.width = Math.min(100, (pts % 100)) + '%';
      const level = document.getElementById('loyalty-level');
      if (level) {
        if (pts >= 500) level.textContent = '🥇 Gold Member';
        else if (pts >= 200) level.textContent = '🥈 Silver Member';
        else level.textContent = '🥉 Bronze Member';
      }
    }

    /* ══════════════════════════════════════
       REFERRAL SYSTEM
    ══════════════════════════════════════ */
    function applyReferralCode(code) {
      if (!code) return false;
      const users = getUsers();
      const referrer = users.find(u => {
        const emailHash = (u.email || '').split('').reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0);
        const refNum = Math.abs(emailHash % 9000) + 1000;
        const expectedCode = 'COOK' + (u.fname || 'X').toUpperCase().slice(0, 4) + refNum;
        return expectedCode === code.toUpperCase();
      });
      if (referrer && referrer.email !== currentUser.email) {
        // Give referrer bonus points
        const rIdx = users.findIndex(u => u.email === referrer.email);
        if (rIdx > -1) {
          users[rIdx].loyaltyPoints = (users[rIdx].loyaltyPoints || 0) + 50;
          saveUsers(users);
        }
        return true; // referral valid
      }
      return false;
    }

    /* ══════════════════════════════════════
       CHEF FILTERS
    ══════════════════════════════════════ */
    function filterChefsPanel(cuisine, minRating, maxPrice) {
      const grid = document.getElementById('chefs-panel-grid');
      if (!grid) return;
      const cards = grid.querySelectorAll('.chef-panel-card');
      let visible = 0;
      cards.forEach(card => {
        const spec = (card.querySelector('.cpc-spec')?.textContent || '').toLowerCase();
        const price = parseInt(card.querySelector('.cpc-price')?.textContent || '999');
        const rating = parseFloat(card.querySelector('.cpc-rating')?.textContent || '0');
        const show = (!cuisine || cuisine === 'All' || spec.includes(cuisine.toLowerCase())) &&
          (!maxPrice || price <= maxPrice) &&
          (!minRating || rating >= minRating);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      const noMsg = document.getElementById('no-chefs-msg');
      if (noMsg) noMsg.style.display = visible === 0 ? 'block' : 'none';
    }

    /* ══════════════════════════════════════
       ADMIN CRUD — Add / Edit / Delete
       All changes sync to Firebase
    ══════════════════════════════════════ */
    let adminEditMode = { type: null, id: null, fid: null };
    let adminDeleteCtx = { type: null, id: null, fid: null };

    // ── Open Add/Edit Modal ─────────────────────────────────────
    function openAdminAddModal(type, data) {
      adminEditMode = { type, id: data ? data.id : null, fid: data ? data._fid : null };
      const modal = document.getElementById('admin-data-modal');
      const title = document.getElementById('adm-title');
      const body = document.getElementById('adm-body');
      if (!modal || !body) return;
      title.textContent = (data ? 'Edit' : 'Add') + ' ' + type.charAt(0).toUpperCase() + type.slice(1);
      body.innerHTML = getAdminForm(type, data || {});
      modal.classList.add('open');
    }

    function closeAdminDataModal() {
      const modal = document.getElementById('admin-data-modal');
      if (modal) modal.classList.remove('open');
      adminEditMode = { type: null, id: null, fid: null };
    }

    // ── Dynamic Form Builder ────────────────────────────────────
    function getAdminForm(type, d) {
      if (type === 'customer') return `
      <div class="adm-row">
        <div class="adm-field"><label>First Name</label><input id="af-fname" value="${d.fname || ''}"/></div>
        <div class="adm-field"><label>Last Name</label><input id="af-lname" value="${d.lname || ''}"/></div>
      </div>
      <div class="adm-field"><label>Email</label><input id="af-email" type="email" value="${d.email || ''}"/></div>
      <div class="adm-field"><label>Phone</label><input id="af-phone" value="${d.phone || ''}"/></div>
      <div class="adm-field"><label>Location / Address</label><input id="af-location" value="${d.location || ''}"/></div>
      <div class="adm-field"><label>Status</label>
        <select id="af-status">
          <option value="Active" ${d.status === 'Active' || !d.status ? 'selected' : ''}>Active</option>
          <option value="Suspended" ${d.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
        </select>
      </div>`;

      if (type === 'chef') return `
      <div class="adm-row">
        <div class="adm-field"><label>First Name</label><input id="af-fname" value="${d.fname || ''}"/></div>
        <div class="adm-field"><label>Last Name</label><input id="af-lname" value="${d.lname || ''}"/></div>
      </div>
      <div class="adm-field"><label>Email</label><input id="af-email" type="email" value="${d.email || ''}"/></div>
      <div class="adm-field"><label>Phone</label><input id="af-phone" value="${d.phone || ''}"/></div>
      <div class="adm-row">
        <div class="adm-field"><label>City</label><input id="af-city" value="${d.city || ''}"/></div>
        <div class="adm-field"><label>Rate (₹/hr)</label><input id="af-rate" type="number" value="${d.rate || ''}"/></div>
      </div>
      <div class="adm-field"><label>Specialties</label><input id="af-specialties" value="${d.specialties || ''}" placeholder="North Indian, Gujarati, Chinese"/></div>
      <div class="adm-field"><label>Experience</label>
        <select id="af-exp">
          <option value="Less than 1 year" ${d.experience === 'Less than 1 year' ? 'selected' : ''}>Less than 1 year</option>
          <option value="1-3 years" ${d.experience === '1-3 years' ? 'selected' : ''}>1-3 years</option>
          <option value="3-5 years" ${d.experience === '3-5 years' ? 'selected' : ''}>3-5 years</option>
          <option value="5-10 years" ${d.experience === '5-10 years' ? 'selected' : ''}>5-10 years</option>
          <option value="10+ years" ${d.experience === '10+ years' ? 'selected' : ''}>10+ years</option>
        </select>
      </div>
      <div class="adm-field"><label>Chef Status</label>
        <select id="af-status">
          <option value="Under Review" ${d.chefStatus === 'Under Review' || !d.chefStatus ? 'selected' : ''}>Under Review</option>
          <option value="Approved" ${d.chefStatus === 'Approved' ? 'selected' : ''}>Approved</option>
          <option value="Suspended" ${d.chefStatus === 'Suspended' ? 'selected' : ''}>Suspended</option>
        </select>
      </div>`;

      if (type === 'booking') return `
      <div class="adm-field"><label>Customer Name</label><input id="af-customer" value="${d.customer || ''}"/></div>
      <div class="adm-field"><label>Chef Name</label><input id="af-chef" value="${d.chef || ''}"/></div>
      <div class="adm-row">
        <div class="adm-field"><label>Date</label><input id="af-date" type="date" value="${d.date || ''}"/></div>
        <div class="adm-field"><label>Duration</label>
          <select id="af-duration">
            <option value="2 Hours" ${d.duration === '2 Hours' ? 'selected' : ''}>2 Hours</option>
            <option value="3 Hours" ${d.duration === '3 Hours' ? 'selected' : ''}>3 Hours</option>
            <option value="4 Hours" ${d.duration === '4 Hours' ? 'selected' : ''}>4 Hours</option>
            <option value="Full Day" ${d.duration === 'Full Day' ? 'selected' : ''}>Full Day</option>
          </select>
        </div>
      </div>
      <div class="adm-row">
        <div class="adm-field"><label>Guests</label><input id="af-guests" type="number" value="${d.guests || 2}" min="1" max="50"/></div>
        <div class="adm-field"><label>Amount (₹)</label><input id="af-amount" type="number" value="${d.amount || ''}"/></div>
      </div>
      <div class="adm-field"><label>Status</label>
        <select id="af-status">
          <option value="Pending" ${d.status === 'Pending' || !d.status ? 'selected' : ''}>Pending</option>
          <option value="Confirmed" ${d.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="On the way" ${d.status === 'On the way' ? 'selected' : ''}>On the way</option>
          <option value="Completed" ${d.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${d.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>`;

      if (type === 'order') return `
      <div class="adm-field"><label>Customer Name</label><input id="af-customer" value="${d.customer || ''}"/></div>
      <div class="adm-field"><label>Items</label><input id="af-items" value="${d.items || ''}"/></div>
      <div class="adm-row">
        <div class="adm-field"><label>Amount (₹)</label><input id="af-amount" type="number" value="${d.amount || ''}"/></div>
        <div class="adm-field"><label>Status</label>
          <select id="af-status">
            <option value="Placed" ${d.status === 'Placed' ? 'selected' : ''}>Placed</option>
            <option value="Preparing" ${d.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
            <option value="Delivered" ${d.status === 'Delivered' || !d.status ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${d.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      </div>
      <div class="adm-field"><label>Delivery Address</label><input id="af-address" value="${d.address || ''}"/></div>`;

      return '<p style="color:rgba(255,255,255,0.5)">No form available for this type.</p>';
    }

    // ── Save Admin Data (Add/Edit) ──────────────────────────────
    function saveAdminData() {
      const { type, id, fid } = adminEditMode;
      const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

      if (type === 'customer' || type === 'chef') {
        const users = getUsers();
        const isEdit = id !== null;
        const idx = isEdit ? users.findIndex(u => u.id == id) : -1;
        const data = {
          fname: g('af-fname'),
          lname: g('af-lname'),
          email: g('af-email'),
          phone: g('af-phone'),
          location: g('af-location') || g('af-city'),
          city: g('af-city'),
          specialties: g('af-specialties'),
          experience: g('af-exp'),
          rate: g('af-rate'),
          chefStatus: type === 'chef' ? g('af-status') : undefined,
          status: type === 'customer' ? g('af-status') : undefined,
          role: type === 'chef' ? 'Chef' : 'Customer',
        };
        if (!data.fname || !data.email) { showToast('Name and email are required.'); return; }
        if (isEdit && idx > -1) {
          Object.assign(users[idx], data);
          saveUsers(users);
          if (dbReady && (fid || users[idx]._fid)) {
            db.collection('users').doc(fid || users[idx]._fid).update(data)
              .catch(e => console.warn('Firestore update user:', e));
          }
          showToast('User updated successfully!');
        } else {
          const newUser = {
            ...data, id: Date.now(), pass: hashPassword('Welcome@123'),
            joined: new Date().toLocaleDateString('en-IN'), bookings: 0
          };
          users.push(newUser);
          saveUsers(users);
          if (dbReady) {
            const docId = data.email.replace(/[^a-zA-Z0-9_-]/g, '_');
            newUser._fid = docId;
            db.collection('users').doc(docId).set(newUser)
              .catch(e => console.warn('Firestore add user:', e));
          }
          showToast('User added! Default password: Welcome@123');
        }
      }

      else if (type === 'booking') {
        const bookings = getBookings();
        const isEdit = id !== null;
        const idx = isEdit ? bookings.findIndex(b => b.id == id) : -1;
        const data = {
          customer: g('af-customer'), chef: g('af-chef'),
          date: g('af-date'), duration: g('af-duration'),
          guests: g('af-guests'), amount: Number(g('af-amount')),
          status: g('af-status'),
        };
        if (!data.customer || !data.chef) { showToast('Customer and chef are required.'); return; }
        if (isEdit && idx > -1) {
          Object.assign(bookings[idx], data);
          saveBookings(bookings);
          if (dbReady && (fid || bookings[idx]._fid)) {
            db.collection('bookings').doc(fid || bookings[idx]._fid).update(data)
              .catch(e => console.warn('Firestore update booking:', e));
          }
          showToast('Booking updated!');
        } else {
          const newBooking = {
            ...data, id: Date.now(), payMethod: 'Admin',
            createdAt: new Date().toISOString()
          };
          bookings.push(newBooking);
          saveBookings(bookings);
          if (dbReady) {
            db.collection('bookings').add({
              ...newBooking,
              savedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
              .catch(e => console.warn('Firestore add booking:', e));
          }
          showToast('Booking added!');
        }
      }

      else if (type === 'order') {
        const orders = getDeliveries();
        const isEdit = id !== null;
        const idx = isEdit ? orders.findIndex(o => o.id == id) : -1;
        const data = {
          customer: g('af-customer'), items: g('af-items'),
          amount: Number(g('af-amount')), address: g('af-address'),
          status: g('af-status'),
        };
        if (isEdit && idx > -1) {
          Object.assign(orders[idx], data);
          saveDeliveries(orders);
          if (dbReady && (fid || orders[idx]._fid)) {
            db.collection('orders').doc(fid || orders[idx]._fid).update(data)
              .catch(e => console.warn('Firestore update order:', e));
          }
          showToast('Order updated!');
        } else {
          const newOrder = { ...data, id: Date.now(), time: new Date().toLocaleTimeString('en-IN') };
          orders.push(newOrder);
          saveDeliveries(orders);
          if (dbReady) {
            db.collection('orders').add({
              ...newOrder,
              savedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
              .catch(e => console.warn('Firestore add order:', e));
          }
          showToast('Order added!');
        }
      }

      logActivity('Admin', 'Data ' + (adminEditMode.id ? 'Updated' : 'Added'), type);
      closeAdminDataModal();
      setTimeout(refreshAdminData, 200);
    }

    // ── Delete Record ───────────────────────────────────────────
    function openAdminDelete(type, id, fid, label) {
      adminDeleteCtx = { type, id, fid };
      const msg = document.getElementById('acm-msg');
      if (msg) msg.textContent = 'Delete "' + label + '"? This cannot be undone.';
      const modal = document.getElementById('admin-confirm-modal');
      if (modal) modal.classList.add('open');
    }

    function closeAdminConfirm() {
      const modal = document.getElementById('admin-confirm-modal');
      if (modal) modal.classList.remove('open');
    }

    function confirmAdminDelete() {
      const { type, id, fid } = adminDeleteCtx;
      if (type === 'customer' || type === 'chef') {
        const users = getUsers().filter(u => u.id != id);
        saveUsers(users);
        if (dbReady && fid) {
          db.collection('users').doc(fid).delete()
            .catch(e => console.warn('Firestore delete user:', e));
        }
        showToast('User deleted.');
      } else if (type === 'booking') {
        const bookings = getBookings().filter(b => b.id != id);
        saveBookings(bookings);
        if (dbReady && fid) {
          db.collection('bookings').doc(fid).delete()
            .catch(e => console.warn('Firestore delete booking:', e));
        }
        showToast('Booking deleted.');
      } else if (type === 'order') {
        const orders = getDeliveries().filter(o => o.id != id);
        saveDeliveries(orders);
        if (dbReady && fid) {
          db.collection('orders').doc(fid).delete()
            .catch(e => console.warn('Firestore delete order:', e));
        }
        showToast('Order deleted.');
      }
      logActivity('Admin', 'Deleted', type + ' #' + id);
      closeAdminConfirm();
      setTimeout(refreshAdminData, 200);
    }

    // ── Chef Approve / Suspend ──────────────────────────────────
    function adminChefAction(userId, fid, action) {
      const users = getUsers();
      const idx = users.findIndex(u => u.id == userId);
      if (idx > -1) {
        users[idx].chefStatus = action;
        saveUsers(users);
        if (dbReady && (fid || users[idx]._fid)) {
          db.collection('users').doc(fid || users[idx]._fid).update({ chefStatus: action })
            .catch(e => console.warn('Firestore chef action:', e));
        }
        showToast('Chef ' + action + ' successfully!');
        logActivity('Admin', 'Chef ' + action, users[idx].fname + ' ' + users[idx].lname);
        refreshAdminData();
      }
    }

    // ── Admin Booking Status Change ─────────────────────────────
    function adminChangeStatus(type, id, fid, newStatus) {
      if (type === 'booking') {
        const bookings = getBookings();
        const idx = bookings.findIndex(b => b.id == id);
        if (idx > -1) {
          bookings[idx].status = newStatus;
          saveBookings(bookings);
          if (dbReady && (fid || bookings[idx]._fid)) {
            db.collection('bookings').doc(fid || bookings[idx]._fid)
              .update({ status: newStatus })
              .catch(e => console.warn('Firestore status:', e));
          }
          showToast('Status: ' + newStatus);
          refreshAdminData();
        }
      } else if (type === 'order') {
        const orders = getDeliveries();
        const idx = orders.findIndex(o => o.id == id);
        if (idx > -1) {
          orders[idx].status = newStatus;
          saveDeliveries(orders);
          if (dbReady && (fid || orders[idx]._fid)) {
            db.collection('orders').doc(fid || orders[idx]._fid)
              .update({ status: newStatus })
              .catch(e => console.warn('Firestore order status:', e));
          }
          showToast('Order status: ' + newStatus);
          refreshAdminData();
        }
      }
    }


    /* ══════════════════════════════════════
       ENTER KEY SUPPORT — All Forms
    ══════════════════════════════════════ */
    function setupEnterKeys() {
      // Login form
      ['login-email', 'login-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      });
      // Signup form — Enter on password field submits
      const sp = document.getElementById('signup-pass');
      if (sp) sp.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });
      // OTP fields — Enter verifies
      const sotp = document.getElementById('signup-otp');
      if (sotp) sotp.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });
      const lotp = document.getElementById('login-otp');
      if (lotp) lotp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      // Forgot password
      const fi = document.getElementById('forgot-identifier');
      if (fi) fi.addEventListener('keydown', e => { if (e.key === 'Enter') forgotSendOTP(); });
      const fo = document.getElementById('forgot-otp');
      if (fo) fo.addEventListener('keydown', e => { if (e.key === 'Enter') forgotVerifyOTP(); });
      const fnp = document.getElementById('forgot-new-pass');
      const fcp = document.getElementById('forgot-confirm-pass');
      if (fnp) fnp.addEventListener('keydown', e => { if (e.key === 'Enter') forgotResetPassword(); });
      if (fcp) fcp.addEventListener('keydown', e => { if (e.key === 'Enter') forgotResetPassword(); });
      // Admin login
      const au = document.getElementById('admin-user');
      const ap = document.getElementById('admin-pass');
      if (au) au.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
      if (ap) ap.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
      // Booking modal — Enter on date field
      const bd = document.getElementById('book-date');
      if (bd) bd.addEventListener('keydown', e => { if (e.key === 'Enter') confirmBooking(); });
      // Admin data modal — Enter saves
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          closeAdminDataModal();
          closeAdminConfirm();
          closeBookingModal();
          closePayModal();
          closeTrackModal();
          closeForgotModal();
        }
      });
    }
    /* ══════════════════════════════════════
       DATABASE HELPERS — Firebase + localStorage
       localStorage = fast local cache
       Firestore    = real cloud database
    ══════════════════════════════════════ */

    // ── LOCAL CACHE helpers ──────────────────────
    function getUsers() { try { return JSON.parse(localStorage.getItem('coc_users') || '[]'); } catch (e) { return []; } }
    function getBookings() { try { return JSON.parse(localStorage.getItem('coc_bookings') || '[]'); } catch (e) { return []; } }
    function getDeliveries() { try { return JSON.parse(localStorage.getItem('coc_deliveries') || '[]'); } catch (e) { return []; } }
    function getActivityLog() { try { return JSON.parse(localStorage.getItem('coc_activity') || '[]'); } catch (e) { return []; } }

    // ── SAVE USERS ───────────────────────────────
    function saveUsers(users) {
      localStorage.setItem('coc_users', JSON.stringify(users));
      if (!dbReady) return;
      try {
        const batch = db.batch();
        users.forEach(u => {
          const docId = (u.email || u.phone || u.id || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
          if (!u._fid) u._fid = docId;
          batch.set(db.collection('users').doc(u._fid), u);
        });
        batch.commit().catch(e => console.warn('Firestore saveUsers:', e));
      } catch (e) { console.warn('Firestore saveUsers:', e); }
    }

    // ── SAVE SINGLE USER (upsert) ────────────────
    async function saveUserToCloud(user) {
      if (!dbReady) return;
      try {
        const docId = (user.email || user.phone || '').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
        user._fid = docId;
        await db.collection('users').doc(docId).set(user);
      } catch (e) { console.warn('Firestore saveUser:', e); }
    }

    // ── SAVE BOOKINGS ────────────────────────────
    function saveBookings(bookings) {
      localStorage.setItem('coc_bookings', JSON.stringify(bookings));
      if (!dbReady) return;
      // Save latest booking to Firestore
      const latest = bookings[bookings.length - 1];
      if (latest) {
        db.collection('bookings').add({ ...latest, savedAt: firebase.firestore.FieldValue.serverTimestamp() })
          .catch(e => console.warn('Firestore saveBookings:', e));
      }
    }

    // ── SAVE DELIVERIES ──────────────────────────
    function saveDeliveries(orders) {
      localStorage.setItem('coc_deliveries', JSON.stringify(orders));
      if (!dbReady) return;
      const latest = orders[orders.length - 1];
      if (latest) {
        db.collection('orders').add({ ...latest, savedAt: firebase.firestore.FieldValue.serverTimestamp() })
          .catch(e => console.warn('Firestore saveDeliveries:', e));
      }
    }

    // ── LOG ACTIVITY ─────────────────────────────
    function logActivity(user, action, detail) {
      const log = getActivityLog();
      const entry = { time: new Date().toLocaleTimeString('en-IN'), user, action, detail };
      log.unshift(entry);
      if (log.length > 200) log.pop();
      localStorage.setItem('coc_activity', JSON.stringify(log));
      if (dbReady) {
        db.collection('activity').add({ ...entry, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
          .catch(e => console.warn('Firestore logActivity:', e));
      }
    }

    // ── SYNC FROM FIRESTORE → localStorage ───────
    async function syncFromFirestore() {
      try {
        const [usersSnap, bookingsSnap, ordersSnap] = await Promise.all([
          db.collection('users').get(),
          db.collection('bookings').orderBy('savedAt', 'desc').limit(200).get().catch(() => db.collection('bookings').get()),
          db.collection('orders').orderBy('savedAt', 'desc').limit(200).get().catch(() => db.collection('orders').get())
        ]);
        if (usersSnap.docs.length > 0) {
          const users = usersSnap.docs.map(d => ({ _fid: d.id, ...d.data() }));
          localStorage.setItem('coc_users', JSON.stringify(users));
        }
        if (bookingsSnap.docs.length > 0) {
          const bookings = bookingsSnap.docs.map(d => ({ _fid: d.id, ...d.data() }));
          localStorage.setItem('coc_bookings', JSON.stringify(bookings));
        }
        if (ordersSnap.docs.length > 0) {
          const orders = ordersSnap.docs.map(d => ({ _fid: d.id, ...d.data() }));
          localStorage.setItem('coc_deliveries', JSON.stringify(orders));
        }
        dbReady = true;
        console.log('✅ Firebase synced:', usersSnap.docs.length, 'users,', bookingsSnap.docs.length, 'bookings');
        // Refresh admin panel if open
        if (document.getElementById('page-admin') && document.getElementById('page-admin').classList.contains('active')) {
          refreshAdminData();
        }
      } catch (e) {
        console.warn('Firebase sync failed — using local data:', e.message);
        dbReady = false;
      }
    }

    // ── SAVE CHEF APPLICATION ────────────────────
    async function saveChefToCloud(chef) {
      if (!dbReady) return;
      try {
        const docId = (chef.email || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        chef._fid = docId;
        await db.collection('users').doc(docId).set(chef);
      } catch (e) { console.warn('Firestore saveChef:', e); }
    }

    // ── REAL-TIME LISTENER for admin panel ───────
    function startRealtimeListeners() {
      if (!dbReady) return;
      // Listen for new users in real time
      db.collection('users').onSnapshot(snap => {
        if (snap.docs.length > 0) {
          const users = snap.docs.map(d => ({ _fid: d.id, ...d.data() }));
          localStorage.setItem('coc_users', JSON.stringify(users));
          // Update admin stats if admin panel open
          const adminPage = document.getElementById('page-admin');
          if (adminPage && adminPage.classList.contains('active')) refreshAdminData();
        }
      }, e => console.warn('Listener error:', e));
    }

    /* ══════════════════════════════════════
       ADMIN LOGIN
    ══════════════════════════════════════ */
    // Admin credentials — passwords stored as SHA-256 hashes (COC2026+pass+COOKONCALL)
    // To add a new admin: use hashPassword('yourpassword') in the browser console
    const ADMIN_CREDS = [
      { user: 'Aryan', pass: 'Imaryan@9979' },
      { user: 'Aayushi', pass: 'Aayushi@25' }
    ];

    function showAdminLogin() {
      document.getElementById('admin-modal').classList.add('open');
    }
    function closeAdminModal() {
      document.getElementById('admin-modal').classList.remove('open');
      document.getElementById('admin-err').style.display = 'none';
    }
    function doAdminLogin() {
      const uEl = document.getElementById('admin-user');
      const pEl = document.getElementById('admin-pass');
      if (!uEl || !pEl) return;
      const u = uEl.value.trim();
      const p = pEl.value.trim();
      if (!u || !p) { showToast('Please enter username and password.'); return; }
      if (ADMIN_CREDS.some(a => a.user === u && (a.pass === p || hashPassword(p) === a.pass))) {
        closeAdminModal();
        sessionStorage.setItem('coc_admin', '1');
        showPage('admin');
        refreshAdminData();
        showToast('Admin panel loaded.');
      } else {
        document.getElementById('admin-err').style.display = 'block';
      }
    }
    function adminLogout() {
      sessionStorage.removeItem('coc_admin');
      showPage('landing');
    }

    /* ══════════════════════════════════════
       ADMIN PANEL NAVIGATION & DATA
    ══════════════════════════════════════ */
    function showAdminPanel(panelId, btn) {
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
      const panel = document.getElementById('apanel-' + panelId);
      if (panel) panel.classList.add('active');
      if (btn) btn.classList.add('active');
      const titles = { overview: 'Overview', customers: 'All Customers', chefs: 'All Chefs', bookings: 'Bookings', orders: 'Delivery Orders', activity: 'Activity Log' };
      const t = document.getElementById('admin-panel-title');
      if (t) t.textContent = titles[panelId] || 'Admin';
      refreshAdminData();
    }

    function refreshAdminData() {
      const users = getUsers();
      const bookings = getBookings();
      const deliveries = getDeliveries();
      const activity = getActivityLog();
      const customers = users.filter(u => u.role === 'Customer');
      const chefs = users.filter(u => u.role === 'Chef');
      // Overview stats
      const revenue = bookings.reduce((s, b) => s + (Number(b.amount) || 0), 0)
        + deliveries.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      setTxt('a-stat-customers', customers.length);
      setTxt('a-stat-chefs', chefs.length);
      setTxt('a-stat-bookings', bookings.length);
      setTxt('a-stat-revenue', '₹' + revenue.toLocaleString('en-IN'));

      // Recent registrations (overview)
      const rb = document.getElementById('a-recent-body');
      if (rb) rb.innerHTML = users.length ? users.slice(-10).reverse().map(u => `
      <tr><td>${u.fname} ${u.lname}</td><td><span class="status-badge ${u.role === 'Chef' ? 'sb-confirmed' : 'sb-pending'}">${u.role}</span></td>
      <td>${u.email}</td><td>${u.phone}</td><td>${u.joined}</td></tr>`).join('')
        : '<tr><td colspan="5" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No registrations yet</td></tr>';

      // Overview bookings
      const ob = document.getElementById('a-bookings-body-overview');
      if (ob) ob.innerHTML = bookings.length ? bookings.slice(-8).reverse().map(b => `
      <tr><td>${b.customer}</td><td>${b.chef}</td><td>${b.date}</td><td>₹${Number(b.amount).toLocaleString('en-IN')}</td>
      <td><span class="status-badge sb-confirmed">${b.status || 'Confirmed'}</span></td></tr>`).join('')
        : '<tr><td colspan="5" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No bookings yet</td></tr>';

      // Customers table
      const cb = document.getElementById('a-cust-body');
      if (cb) cb.innerHTML = customers.map(u => `
      <tr>
        <td>${u.fname} ${u.lname}</td><td>${u.email}</td><td>${u.phone}</td>
        <td>${u.location || '—'}</td><td>${u.bookings || 0}</td><td>${u.joined}</td>
        <td><span class="status-badge ${u.status === 'Suspended' ? 'sb-cancelled' : 'sb-active'}">${u.status || 'Active'}</span></td>
        <td>
          <button class="btn-admin-action btn-edit" onclick="openAdminAddModal('customer',${JSON.stringify(u).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn-admin-action btn-delete" onclick="openAdminDelete('customer',${u.id},'${u._fid || ''}','${u.fname} ${u.lname}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="8" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No customers yet</td></tr>';

      // Chefs table
      const chb = document.getElementById('a-chef-body');
      if (chb) chb.innerHTML = chefs.map(u => `
      <tr>
        <td>${u.fname} ${u.lname}</td><td>${u.email}</td><td>${u.phone}</td>
        <td>${u.city || '—'}</td><td>${u.specialties || '—'}</td>
        <td>₹${u.rate || '—'}/hr</td>
        <td><span class="status-badge ${u.chefStatus === 'Approved' ? 'sb-confirmed' : u.chefStatus === 'Suspended' ? 'sb-cancelled' : 'sb-review'}">${u.chefStatus || 'Under Review'}</span></td>
        <td>
          ${u.chefStatus !== 'Approved' ? `<button class="btn-admin-action btn-approve" onclick="adminChefAction(${u.id},'${u._fid || ''}','Approved')">Approve</button>` : ''}
          <button class="btn-admin-action btn-edit" onclick="openAdminAddModal('chef',${JSON.stringify(u).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn-admin-action btn-delete" onclick="openAdminDelete('chef',${u.id},'${u._fid || ''}','${u.fname} ${u.lname}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="8" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No chef applications yet</td></tr>';

      // Bookings table
      const bb = document.getElementById('a-book-body');
      if (bb) bb.innerHTML = bookings.map((b, i) => `
      <tr>
        <td>#BK${String(i + 1).padStart(3, '0')}</td>
        <td>${b.customer}</td><td>${b.chef}</td><td>${b.date}</td>
        <td>₹${Number(b.amount).toLocaleString('en-IN')}</td>
        <td>
          <select class="adm-status-sel" onchange="adminChangeStatus('booking',${b.id},'${b._fid || ''}',this.value)">
            ${['Pending', 'Confirmed', 'On the way', 'Completed', 'Cancelled'].map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <button class="btn-admin-action btn-edit" onclick="openAdminAddModal('booking',${JSON.stringify(b).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn-admin-action btn-delete" onclick="openAdminDelete('booking',${b.id},'${b._fid || ''}','Booking #BK${String(i + 1).padStart(3, '0')}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No bookings yet</td></tr>';

      // Delivery orders table
      const db2 = document.getElementById('a-orders-body');
      if (db2) db2.innerHTML = deliveries.map((d, i) => `
      <tr>
        <td>#ORD${String(i + 1).padStart(3, '0')}</td>
        <td>${d.customer}</td><td>${d.items}</td>
        <td>₹${Number(d.amount).toLocaleString('en-IN')}</td>
        <td>${d.address || '—'}</td>
        <td>
          <select class="adm-status-sel" onchange="adminChangeStatus('order',${d.id},'${d._fid || ''}',this.value)">
            ${['Placed', 'Preparing', 'Delivered', 'Cancelled'].map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <button class="btn-admin-action btn-edit" onclick="openAdminAddModal('order',${JSON.stringify(d).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn-admin-action btn-delete" onclick="openAdminDelete('order',${d.id},'${d._fid || ''}','Order #ORD${String(i + 1).padStart(3, '0')}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No delivery orders yet</td></tr>';

      // Activity log
      const alb = document.getElementById('a-activity-body');
      if (alb) alb.innerHTML = activity.slice(0, 50).map(a => `
      <tr><td style="color:rgba(255,255,255,0.4)">${a.time}</td><td>${a.user}</td>
      <td><span class="status-badge sb-pending">${a.action}</span></td><td>${a.detail}</td></tr>`).join('') || '<tr><td colspan="4" style="color:rgba(255,255,255,0.3);text-align:center;padding:24px">No activity yet</td></tr>';
    }

    function filterAdminTable(tbodyId, val) {
      const tbody = document.getElementById(tbodyId);
      if (!tbody) return;
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
      });
    }

    function setTxt(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    /* ══════════════════════════════════════
       CHEF REGISTRATION
    ══════════════════════════════════════ */
    function showChefRegPage() { showPage('chef-reg'); }

    function toggleSpec(el) { el.classList.toggle('selected'); }

    function submitChefReg() {
      const fn = (document.getElementById('cr-fname').value || '').trim();
      const ln = (document.getElementById('cr-lname').value || '').trim();
      const ph = (document.getElementById('cr-phone').value || '').trim();
      const em = (document.getElementById('cr-email').value || '').trim();
      const city = (document.getElementById('cr-city').value || '').trim();
      const exp = (document.getElementById('cr-exp').value || '').trim();
      const pass = (document.getElementById('cr-pass').value || '').trim();
      const specs = [...document.querySelectorAll('#cr-specialties .chef-spec-tag.selected')].map(t => t.textContent).join(', ');
      const bio = (document.getElementById('cr-bio').value || '').trim();
      const idno = (document.getElementById('cr-id').value || '').trim();

      if (!fn || !ln) { showToast('Please enter your full name.'); return; }
      if (!ph) { showToast('Phone number is required.'); return; }
      if (!em) { showToast('Email is required.'); return; }
      if (!city) { showToast('City is required.'); return; }
      if (!exp) { showToast('Please select your experience.'); return; }
      if (!specs) { showToast('Please select at least one specialty.'); return; }
      if (!pass) { showToast('Please create a password.'); return; }

      const users = getUsers();
      if (users.find(u => u.email === em)) { showToast('This email is already registered.'); return; }
      if (users.find(u => u.phone === ph)) { showToast('This phone is already registered.'); return; }

      const chef = { id: Date.now(), fname: fn, lname: ln, email: em, phone: ph, pass: hashPassword(pass), role: 'Chef', city, experience: exp, specialties: specs, bio, idNumber: idno, joined: new Date().toLocaleDateString('en-IN'), location: city, bookings: 0 };
      users.push(chef);
      saveUsers(users);
      saveChefToCloud(chef); // Save chef to Firebase
      logActivity(fn + ' ' + ln, 'Chef Signup', 'Applied from ' + city + ' — ' + specs);
      // Clear form
      ['cr-fname', 'cr-lname', 'cr-phone', 'cr-email', 'cr-city', 'cr-bio', 'cr-id', 'cr-pass'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      document.querySelectorAll('#cr-specialties .chef-spec-tag').forEach(t => t.classList.remove('selected'));
      const expEl = document.getElementById('cr-exp'); if (expEl) expEl.value = '';
      showToast('Application submitted! We will review and contact you.');
      setTimeout(() => showPage('landing'), 2000);
    }

    /* ══════════════════════════════════════
       LOCATION
    ══════════════════════════════════════ */
    function showLocationModal() {
      document.getElementById('loc-modal').classList.add('open');
    }
    function showLocationModalIfNeeded() {
      if (!currentUser.location) showLocationModal();
    }
    function toggleManualInput() {
      const d = document.getElementById('loc-manual-div');
      d.style.display = d.style.display === 'block' ? 'none' : 'block';
    }
    function getGpsLocation() {
      const statusEl = document.getElementById('loc-status-text');
      if (!navigator.geolocation) {
        statusEl.innerHTML = '<div class="loc-status" style="color:var(--red)">GPS not supported on this device.</div>';
        return;
      }
      statusEl.innerHTML = '<div class="loc-status" style="color:var(--muted)">Detecting location...</div>';
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = 'GPS: ' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
          saveUserLocation(loc);
          statusEl.innerHTML = '<div class="loc-status">Location saved successfully!</div>';
          updateLocationStrip(loc);
          setTimeout(() => document.getElementById('loc-modal').classList.remove('open'), 1500);
        },
        err => {
          statusEl.innerHTML = '<div class="loc-status" style="color:var(--red)">GPS denied. Please enter address manually.</div>';
          document.getElementById('loc-manual-div').style.display = 'block';
        }
      );
    }
    function saveManualLocation() {
      const val = (document.getElementById('loc-manual-text').value || '').trim();
      if (!val) { showToast('Please enter your address.'); return; }
      saveUserLocation(val);
      document.getElementById('loc-status-text').innerHTML = '<div class="loc-status">Location saved!</div>';
      updateLocationStrip(val);
      setTimeout(() => document.getElementById('loc-modal').classList.remove('open'), 1200);
    }
    function saveUserLocation(loc) {
      currentUser.location = loc;
      sessionStorage.setItem('coc_user', JSON.stringify(currentUser));
      const users = getUsers();
      const idx = users.findIndex(u => u.email === currentUser.email);
      if (idx > -1) { users[idx].location = loc; saveUsers(users); saveUserToCloud(users[idx]); }
      logActivity(currentUser.name, 'Location', 'Set location: ' + loc);
    }
    function updateLocationStrip(loc) {
      const strip = document.getElementById('loc-strip-val');
      if (strip) strip.textContent = loc;
    }

    /* ══════════════════════════════════════
       LIVE TRACKING
    ══════════════════════════════════════ */
    let trackInterval = null;
    let trackStep = 0;
    const trackPositions = [
      { left: '8%', top: '72%' }, { left: '20%', top: '65%' }, { left: '32%', top: '58%' },
      { left: '44%', top: '50%' }, { left: '56%', top: '44%' }, { left: '68%', top: '36%' },
      { left: '72%', top: '30%' }
    ];
    const etaLabels = ['~18 minutes', '~15 minutes', '~12 minutes', '~9 minutes', '~6 minutes', '~3 minutes', 'Arrived!'];

    function openTrackModal(chefName, chefInitials) {
      document.getElementById('track-modal').classList.add('open');
      document.getElementById('track-chef-name').textContent = chefName || 'Your Chef';
      document.getElementById('track-chef-ava').textContent = chefInitials || '?';
      trackStep = 0;
      moveChefDot();
      if (trackInterval) clearInterval(trackInterval);
      // Update step dots to initial state
      ['ts1', 'ts2', 'ts3', 'ts4'].forEach((id, i) => {
        const el = document.getElementById(id); if (el) { el.className = 'track-step-dot'; if (i === 0) el.classList.add('done'); }
      });
      trackInterval = setInterval(() => {
        if (trackStep < trackPositions.length - 1) { trackStep++; moveChefDot(); }
        else { clearInterval(trackInterval); }
      }, 3000);
    }
    function moveChefDot() {
      const pos = trackPositions[trackStep];
      const dot = document.getElementById('chef-dot');
      if (dot) { dot.style.left = pos.left; dot.style.top = pos.top; }
      const eta = document.getElementById('track-chef-eta');
      if (eta) eta.textContent = 'Arriving in ' + etaLabels[trackStep];
      const fill = document.getElementById('track-fill');
      if (fill) fill.style.width = ((trackStep / (trackPositions.length - 1)) * 100) + '%';
      // Update step dots
      ['ts1', 'ts2', 'ts3', 'ts4'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = 'track-step-dot';
        if (i < Math.floor(trackStep * 4 / trackPositions.length)) el.classList.add('done');
        else if (i === Math.floor(trackStep * 4 / trackPositions.length)) el.classList.add('current');
      });
    }
    function closeTrackModal() {
      document.getElementById('track-modal').classList.remove('open');
      if (trackInterval) clearInterval(trackInterval);
    }

    /* ══════════════════════════════════════
       CHEF REG PAGE NAVIGATION HELPER
    ══════════════════════════════════════ */
    function showAdminPanelFromNav(panelId) {
      showAdminPanel(panelId, document.querySelector('[data-apanel="' + panelId + '"]'));
    }

    /* ══════════════════════════════════════
       OVERRIDE placeOrder TO SAVE
    ══════════════════════════════════════ */

    /* ══════════════════════════════════════
       INIT
    ══════════════════════════════════════ */

    // INIT - Set greeting, restore session, sync Firebase
    (function () {
      initSidebarState();
      const h = new Date().getHours();
      const greet = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
      const wbEl = document.getElementById('wb-greeting');
      if (wbEl) wbEl.textContent = greet;

      // Restore session if user was logged in
      try {
        const saved = sessionStorage.getItem('coc_user');
        if (saved) {
          currentUser = JSON.parse(saved);
          updateUserUI();
          if (currentUser.location) updateLocationStrip(currentUser.location);
        }
      } catch (e) { }

      setupEnterKeys();
      // Modal overlay close handlers
      const am = document.getElementById('admin-modal');
      if (am) am.addEventListener('click', function (e) { if (e.target === this) closeAdminModal(); });
      const lm = document.getElementById('loc-modal');
      if (lm) lm.addEventListener('click', function (e) { if (e.target === this) document.getElementById('loc-modal').classList.remove('open'); });
      const tm = document.getElementById('track-modal');
      if (tm) tm.addEventListener('click', function (e) { if (e.target === this) closeTrackModal(); });

      // Admin Enter key support
      const ap = document.getElementById('admin-pass');
      if (ap) ap.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAdminLogin(); });
      const au = document.getElementById('admin-user');
      if (au) au.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAdminLogin(); });

      // ── FIREBASE: Sync from Firestore in background ──
      if (db) {
        syncFromFirestore().then(() => {
          dbReady = true;
          startRealtimeListeners();
          console.log('✅ CookOnCall — Firebase connected');
          const adminPage = document.getElementById('page-admin');
          if (adminPage && adminPage.classList.contains('active')) refreshAdminData();
        }).catch(e => {
          console.warn('⚠️ Firebase offline — using local data:', e.message);
        });
      } else {
        console.warn('⚠️ Running without Firebase — localStorage only');
      }
    })();