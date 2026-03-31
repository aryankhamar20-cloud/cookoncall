/* ═══════════════════════════════════════════════════════
   CookOnCall — Shared JavaScript
   Update WhatsApp number, navbar links, footer HERE
   ═══════════════════════════════════════════════════════ */

// ─── CONFIG (edit these to update across ALL pages) ─── 
const CONFIG = {
    whatsapp: '919081444326',
    founders: 'Aryan Khamar & Aayushi Patel',
    year: 2025,
    city: 'Ahmedabad',
};


// ─── NAVBAR SCROLL EFFECT ─── 
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
}


// ─── MOBILE MENU TOGGLE ─── 
function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const navLinks = document.getElementById('navLinks');
    if (!toggle || !navLinks) return;
    toggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
}


// ─── SCROLL TO TOP BUTTON ─── 
function initScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// ─── LOGIN/SIGNUP TAB SWITCHING ─── 
function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    if (tabs.length === 0) return;

    window.switchTab = function(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        if (tab === 'login') {
            tabs[0].classList.add('active');
            document.getElementById('loginForm').classList.add('active');
        } else {
            tabs[1].classList.add('active');
            document.getElementById('signupForm').classList.add('active');
        }
    };

    tabs[0].addEventListener('click', () => switchTab('login'));
    tabs[1].addEventListener('click', () => switchTab('signup'));

    // Auto-switch to signup if hash is #signup
    if (window.location.hash === '#signup') switchTab('signup');
}


// ─── FAQ ACCORDION ─── 
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.classList.toggle('open');
        });
    });
}


// ─── EARNINGS CALCULATOR ─── 
function initCalculator() {
    const bookings = document.getElementById('bookings');
    const charge = document.getElementById('charge');
    if (!bookings || !charge) return;

    function calc() {
        const b = bookings.value;
        const c = charge.value;
        document.getElementById('bookingsVal').textContent = b;
        document.getElementById('chargeVal').textContent = '₹' + Number(c).toLocaleString('en-IN');
        const monthly = Math.round(b * c * 4 * 0.9); // 10% platform cut
        document.getElementById('earnings').textContent = '₹' + monthly.toLocaleString('en-IN');
    }

    bookings.addEventListener('input', calc);
    charge.addEventListener('input', calc);
    calc(); // initial calculation
}


// ─── ACTIVE NAV LINK HIGHLIGHTING ─── 
function initActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active-link');
        }
    });
}


// ─── SMOOTH SCROLL FOR ANCHOR LINKS ─── 
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}


// ─── INITIALIZE EVERYTHING ─── 
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initScrollTop();
    initAuthTabs();
    initFAQ();
    initCalculator();
    initActiveLink();
    initSmoothScroll();
});
