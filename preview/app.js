/* =========================================================
   KeuanganKu — Prototype UI (interaction + mock data)
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- Icons (lucide-style) ---------- */
  const ICONS = {
    'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'receipt-text': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'chart': '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M10.7 5.1A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.3"/><path d="M6.6 6.6A13 13 0 0 0 2 12s3 7 10 7a10.7 10.7 0 0 0 5.4-1.6"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    'wallet': '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'filter': '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'calendar-days': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
    'piggy-bank': '<circle cx="12" cy="12" r="10"/><path d="M12 6.5v11"/><path d="M8.5 9.5h5.5a2 2 0 0 1 0 4H9.5a2 2 0 0 0 0 4H15"/>',
    'edit': '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    'trash': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'logout': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    'key-round': '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    'palette': '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    'save': '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    'users-round': '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'tags': '<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l7.58-7.58a1 1 0 0 0 0-1.42z"/><circle cx="7" cy="7" r="1"/>',
    'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    'user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    'trending-down': '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'mail': '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'plus-circle': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  };

  function icon(name, size) {
    return '<svg class="svg-icon" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }
  function hydrateIcons() {
    $$('[data-icon]').forEach(function (el) {
      el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 18);
    });
  }

  /* ---------- Mock data ---------- */
  const USER = { name: 'Afrizal Rizki', email: 'afrizal@email.com', username: 'rizki_afrizal', role: 'owner', initials: 'AR' };

  const WALLETS = [
    { id: 'w1', name: 'Bank Mandiri', type: 'bank', typeLabel: 'Bank', balance: 4850000, color: 'blue', active: true },
    { id: 'w2', name: 'Tunai Rumah', type: 'cash', typeLabel: 'Cash', balance: 850000, color: 'green', active: true },
    { id: 'w3', name: 'OVO', type: 'ewallet', typeLabel: 'E-Wallet', balance: 320000, color: 'amber', active: true },
    { id: 'w4', name: 'Tabungan Sekolah', type: 'saving', typeLabel: 'Tabungan', balance: 2000000, color: 'rose', active: true },
    { id: 'w5', name: 'Dana Darurat', type: 'saving', typeLabel: 'Tabungan', balance: 7500000, color: 'violet', active: true }
  ];

  const BUDGETS = [
    { id: 'b1', name: 'Belanja Rumah', amount: 3000000, accountId: 'w1', month: 9, year: 2026, note: 'Sembako, listrik, kebutuhan rumah.' },
    { id: 'b2', name: 'Transportasi', amount: 800000, accountId: 'w2', month: 9, year: 2026, note: '' },
    { id: 'b3', name: 'Sekolah Anak', amount: 1500000, accountId: 'w4', month: 9, year: 2026, note: 'SPP dan kebutuhan sekolah.' },
    { id: 'b4', name: 'Makan di Luar', amount: 1000000, accountId: 'w3', month: 9, year: 2026, note: '' },
    { id: 'b5', name: 'Kebutuhan Bulanan', amount: 2000000, accountId: 'w1', month: 9, year: 2026, note: '' }
  ];

  const TRANSACTIONS = [
    { id: 't1', type: 'income', amount: 9500000, categoryId: 'c1', accountId: 'w1', budgetId: null, date: '2026-08-25', note: 'Gaji Bulanan', creator: 'Afrizal Rizki' },
    { id: 't2', type: 'expense', amount: 1250000, categoryId: null, accountId: 'w1', budgetId: 'b1', date: '2026-08-27', note: 'Belanja Pasar', creator: 'Rina Maulida' },
    { id: 't3', type: 'expense', amount: 250000, categoryId: null, accountId: 'w2', budgetId: 'b2', date: '2026-08-28', note: 'Bensin', creator: 'Afrizal Rizki' },
    { id: 't4', type: 'income', amount: 1200000, categoryId: 'c2', accountId: 'w1', budgetId: null, date: '2026-09-02', note: 'Bonus Project', creator: 'Afrizal Rizki' },
    { id: 't5', type: 'expense', amount: 900000, categoryId: null, accountId: 'w1', budgetId: 'b1', date: '2026-09-04', note: 'Token Listrik', creator: 'Afrizal Rizki' },
    { id: 't6', type: 'expense', amount: 1650000, categoryId: null, accountId: 'w4', budgetId: 'b3', date: '2026-09-05', note: 'SPP Sekolah', creator: 'Rina Maulida' },
    { id: 't7', type: 'expense', amount: 320000, categoryId: null, accountId: 'w3', budgetId: 'b4', date: '2026-09-06', note: 'Makan Keluarga', creator: 'Bima Pratama' },
    { id: 't8', type: 'expense', amount: 240000, categoryId: null, accountId: 'w3', budgetId: 'b4', date: '2026-09-08', note: 'Jajan Anak', creator: 'Rina Maulida' }
  ];

  const MEMBERS = [
    { id: 'm1', name: 'Afrizal Rizki', email: 'afrizal@email.com', username: 'rizki_afrizal', role: 'owner', self: true },
    { id: 'm2', name: 'Rina Maulida', email: 'rina@email.com', username: 'rina_maulida', role: 'admin', self: false },
    { id: 'm3', name: 'Bima Pratama', email: 'bima@email.com', username: 'bima_pratama', role: 'member', self: false }
  ];

  const CATEGORIES = {
    custom: [
      { id: 'c1', name: 'Gaji' },
      { id: 'c2', name: 'Bonus' },
      { id: 'c3', name: 'Usaha Sampingan' }
    ],
    default: [
      { id: 'd1', name: 'THR' },
      { id: 'd2', name: 'Bunga Tabungan' },
      { id: 'd3', name: 'Lainnya' }
    ]
  };

  const GOALS = [
    { id: 'g1', name: 'Dana Darurat', current: 2500000, target: 10000000 },
    { id: 'g2', name: 'Liburan Keluarga', current: 1500000, target: 5000000 },
    { id: 'g3', name: 'Tabungan Sekolah', current: 2000000, target: 12000000 }
  ];

  const NOTIFICATIONS = [
    { id: 'n1', title: 'Budget melewati batas', message: 'Alokasi Sekolah Anak sudah terpakai 110%.', read: false },
    { id: 'n2', title: 'Transaksi baru', message: 'Rina mencatat Jajan Anak sebesar Rp 240.000.', read: false },
    { id: 'n3', title: 'Siklus gajian', message: 'Periode gajian baru dimulai 25 Agustus.', read: true },
    { id: 'n4', title: 'Pengingat laporan', message: 'Waktunya mengevaluasi laporan bulanan keluarga.', read: false }
  ];

  const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' };
  const ACCOUNT_TYPE_LABEL = { cash: 'Cash', bank: 'Bank', ewallet: 'E-Wallet', saving: 'Tabungan', other: 'Lainnya' };
  const CYCLE_RANGE = '25 Agu – 24 Sep 2026';
  const CYCLE_LABEL = 'Agustus - September 2026';
  const CYCLE_MONTH = 9;
  const CYCLE_YEAR = 2026;

  /* ---------- Helpers ---------- */
  function rp(n) { return 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID'); }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function walletById(id) { return WALLETS.find(function (w) { return w.id === id; }); }
  function budgetById(id) { return BUDGETS.find(function (b) { return b.id === id; }); }
  function catById(id) { return CATEGORIES.custom.find(function (c) { return c.id === id; }) || { name: '' }; }
  function txMonth(t) { var d = new Date(t.date + 'T00:00:00'); return d.getMonth() + 1; }
  function txYear(t) { var d = new Date(t.date + 'T00:00:00'); return d.getFullYear(); }
  function budgetUsage(b, txs) {
    var used = txs.filter(function (t) { return t.type === 'expense' && t.budgetId === b.id; })
      .reduce(function (s, t) { return s + Number(t.amount || 0); }, 0);
    var remaining = Number(b.amount || 0) - used;
    var progressRaw = Number(b.amount || 0) > 0 ? Math.round((used / Number(b.amount || 0)) * 100) : 0;
    return {
      used: used,
      remaining: remaining,
      over: remaining < 0,
      overAmount: Math.max(0, Math.abs(Math.min(remaining, 0))),
      progress: Math.min(100, progressRaw),
      progressRaw: progressRaw,
      tone: (remaining < 0 || progressRaw >= 100) ? 'red' : (progressRaw >= 75 ? 'amber' : 'green')
    };
  }
  function sortedTx() {
    return TRANSACTIONS.slice().sort(function (a, b) { return (b.date < a.date) ? -1 : (b.date > a.date ? 1 : 0); });
  }
  function initials(name) {
    return String(name || 'P').split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p[0] ? p[0].toUpperCase() : ''; }).join('') || 'P';
  }

  /* ---------- State ---------- */
  let theme = loadTheme();
  let showBalance = true;
  let currentTab = 'dashboard';
  let currentPanel = 'menu';
  let sheetType = 'expense';
  let sheetBudgetId = '';
  let editingBudgetId = null;
  let editingWalletId = null;
  let txQuery = '';
  let txType = 'all';
  let txFilters = { creator: 'all', wallet: 'all', budget: 'all', category: 'all', start: '', end: '' };
  let report = { month: CYCLE_MONTH, year: CYCLE_YEAR, wallet: 'all', budget: 'all' };
  let cycle = { month: CYCLE_MONTH, year: CYCLE_YEAR };

  /* ---------- Theme ---------- */
  function loadTheme() {
    try {
      var stored = localStorage.getItem('keuanganku-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
    } catch (e) { /* noop */ }
    return 'auto';
  }
  function applyTheme(pref) {
    theme = pref;
    try { localStorage.setItem('keuanganku-theme', pref); } catch (e) { /* noop */ }
    var resolved = pref === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref;
    document.documentElement.setAttribute('data-theme', resolved);
    $$('.theme-segment button').forEach(function (b) { b.classList.toggle('active', b.dataset.theme === pref); });
    var quick = $('#authThemeBtn');
    if (quick) quick.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon', 18);
  }
  function setTheme(pref) { applyTheme(pref); }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }

  /* ---------- Screens / navigation ---------- */
  function showScreen(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + name); });
    if (name === 'app') { goTab('dashboard'); setPanel('menu'); }
  }
  function goTab(tab) {
    currentTab = tab;
    if (tab === 'settings') setPanel('menu');
    $$('#bottomNav .nav-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    var targetId = 'page-' + (tab === 'settings' ? 'settings-' + currentPanel : tab);
    $$('.app-scroll > .page').forEach(function (p) { p.classList.toggle('active', p.id === targetId); });
    $('#appScroll').scrollTop = 0;
  }
  function setPanel(panel) {
    currentPanel = panel;
    if (currentTab === 'settings') {
      $$('.app-scroll > .page').forEach(function (p) { p.classList.toggle('active', p.id === 'page-settings-' + panel); });
      $('#appScroll').scrollTop = 0;
    }
  }

  /* ---------- Auth ---------- */
  function setAuthMode(mode) {
    var t = $('#authTitle'), d = $('#authDesc'), ft = $('#authFormTitle');
    var fName = $('#fName'), fUser = $('#fUsername'), fEmail = $('#fEmail'), fId = $('#fIdentifier'), fPass = $('#fPassword');
    var submit = $('#authSubmit'), back = $('#authBackBtn'), actions = $('#authActions'), reg = $('#authRegisterBtn');
    var help = $('#authHelp'), form = $('#authForm');

    var isReg = mode === 'register', isForgot = mode === 'forgot', isHelp = mode === 'help', isLogin = mode === 'login';

    fName.hidden = !isReg;
    fUser.hidden = !isReg;
    fEmail.hidden = !isReg;
    fId.hidden = isReg || isHelp;
    fPass.hidden = !isLogin && !isReg;
    actions.hidden = !isLogin;
    reg.hidden = !isLogin && !isHelp;
    back.hidden = !isForgot && !isHelp;
    help.hidden = !isHelp;
    form.hidden = isHelp;

    $('#lIdentifier').textContent = isForgot ? 'Email atau Username' : 'Email / Username';
    ft.textContent = isReg ? 'Daftar' : isForgot ? 'Lupa Password' : isLogin ? 'Login' : '';
    submit.textContent = isReg ? 'Daftar Akun' : isForgot ? 'Kirim Link Reset' : 'Masuk';

    if (isHelp) {
      t.textContent = 'Butuh bantuan?';
      d.textContent = 'Jika mengalami kendala login, cek email, username, dan password terlebih dahulu atau hubungi pengelola keluarga.';
    } else if (isReg) {
      t.textContent = 'Mulai kelola bersama.';
      d.textContent = 'Daftar akun baru untuk membuat atau bergabung ke ruang keuangan keluarga.';
    } else if (isForgot) {
      t.textContent = 'Pulihkan akses akun.';
      d.textContent = 'Masukkan email atau username. Kami akan mengirim tautan reset password melalui email.';
    } else {
      t.textContent = 'Masuk dengan nyaman.';
      d.textContent = 'Pantau dompet, alokasi, transaksi, dan laporan keluarga dari satu aplikasi yang ringan.';
    }
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    $('#dashGreeting').textContent = 'Halo, ' + (USER.name.split(' ')[0] || 'Pengguna');
    $('#dashFamily').textContent = 'Keluarga Rizki';
    $('#dashAvatar').textContent = USER.initials;
    $('#cycleRange').textContent = CYCLE_RANGE;

    var total = WALLETS.filter(function (w) { return w.active; }).reduce(function (s, w) { return s + w.balance; }, 0);
    var income = TRANSACTIONS.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var expense = TRANSACTIONS.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + t.amount; }, 0);

    $('#totalBalance').textContent = showBalance ? rp(total) : 'Rp ••••••••';
    $('#monthIncome').textContent = showBalance ? rp(income) : 'Rp ••••••••';
    $('#monthExpense').textContent = showBalance ? rp(expense) : 'Rp ••••••••';
    $('#balanceToggle').innerHTML = (showBalance ? icon('eye-off', 15) : icon('eye', 15)) + ' ' + (showBalance ? 'Sembunyikan' : 'Tampilkan');

    renderWalletCarousel();
    renderBudgetSummary();
    renderLatestTx();
    renderNotifs();
  }

  function renderWalletCarousel() {
    var html = WALLETS.filter(function (w) { return w.active; }).map(function (w) {
      return '<button type="button" class="playful-wallet-card ' + w.color + ' wallet-card-btn" data-action="wallet-detail" data-id="' + w.id + '">'
        + '<div class="playful-wallet-top"><span class="playful-wallet-icon">' + icon('wallet', 18) + '</span>'
        + '<span class="wallet-type-pill">' + w.typeLabel + '</span></div>'
        + '<h3>' + w.name + '</h3>'
        + '<strong>' + (showBalance ? rp(w.balance) : 'Rp ••••••') + '</strong>'
        + '<p>Aktif • klik untuk detail transaksi & alokasi</p>'
        + '</button>';
    }).join('');
    $('#walletCarousel').innerHTML = html || '<div class="card">Belum ada dompet keluarga.</div>';
  }

  function renderBudgetSummary() {
    var currentBudgets = BUDGETS.filter(function (b) { return Number(b.month) === CYCLE_MONTH && Number(b.year) === CYCLE_YEAR; });
    var total = currentBudgets.reduce(function (s, b) { return s + Number(b.amount || 0); }, 0);
    var used = currentBudgets.reduce(function (s, b) { return s + budgetUsage(b, TRANSACTIONS).used; }, 0);
    var over = currentBudgets.reduce(function (s, b) { return s + budgetUsage(b, TRANSACTIONS).overAmount; }, 0);
    var raw = total > 0 ? Math.round((used / total) * 100) : 0;

    $('#budgetSummary').innerHTML =
      '<div><span>Total</span><strong>' + rp(total) + '</strong></div>'
      + '<div><span>Terpakai</span><strong>' + rp(used) + '</strong></div>'
      + '<div><span>' + (over > 0 ? 'Over budget' : 'Progress') + '</span><strong>' + (over > 0 ? rp(over) : raw + '%') + '</strong></div>';

    var prog = $('#budgetTotalProgress');
    prog.className = 'progress ' + ((over > 0 || raw >= 100) ? 'red' : (raw >= 75 ? 'amber' : 'green'));
    prog.querySelector('div').style.width = Math.min(100, raw) + '%';

    var rows = currentBudgets.slice(0, 4).map(function (b) {
      var u = budgetUsage(b, TRANSACTIONS);
      var w = walletById(b.accountId);
      return '<button type="button" class="playful-budget-row ' + (u.over ? 'over-budget' : '') + ' budget-row-btn" data-action="budget-detail" data-id="' + b.id + '">'
        + '<div class="budget-row-header"><div><h3>' + b.name + '</h3><p class="item-sub">' + (w ? w.name : 'Dompet tidak ditemukan') + '</p></div>'
        + '<strong class="amount ' + (u.over ? 'expense' : '') + '">' + (u.over ? 'Over ' + rp(u.overAmount) : rp(u.remaining)) + '</strong></div>'
        + '<div class="progress ' + u.tone + '"><div style="width:' + u.progress + '%"></div></div>'
        + '</button>';
    }).join('');
    $('#budgetRows').innerHTML = rows || '<p class="playful-empty-inline">Belum ada alokasi untuk periode gajian ini.</p>';
  }

  function renderLatestTx() {
    var html = sortedTx().slice(0, 4).map(function (t) {
      return '<div class="transaction-item ' + t.type + '">'
        + '<span class="transaction-icon ' + t.type + '">' + (t.type === 'income' ? '+' : '-') + '</span>'
        + '<div class="item-main"><strong style="font-size:14px">' + t.note + '</strong>'
        + '<p class="item-sub">' + fmtDate(t.date) + '</p></div>'
        + '<div class="transaction-amount-wrap"><p class="amount ' + t.type + '">' + (showBalance ? (t.type === 'income' ? '+' : '-') + rp(t.amount) : '••••••') + '</p></div>'
        + '</div>';
    }).join('');
    $('#latestTransactions').innerHTML = html || '<div class="card">Belum ada transaksi.</div>';
  }

  function renderNotifs() {
    var unread = NOTIFICATIONS.filter(function (n) { return !n.read; }).length;
    $('#bellDot').textContent = unread > 0 ? unread : '';
    $('#bellDot').style.display = unread > 0 ? 'grid' : 'none';
    var html = NOTIFICATIONS.slice(0, 8).map(function (n) {
      return '<button type="button" class="notification-row ' + (n.read ? 'read' : '') + '" data-action="notif" data-id="' + n.id + '">'
        + '<strong>' + n.title + '</strong><small>' + n.message + '</small></button>';
    }).join('');
    $('#notifList').innerHTML = html || '<p class="muted tiny">Belum ada notifikasi.</p>';
  }

/* ---------- Transactions ---------- */
  function filteredTransactions() {
    var q = txQuery.trim().toLowerCase();
    return TRANSACTIONS.filter(function (t) {
      if (txType !== 'all' && t.type !== txType) return false;
      if (txFilters.creator !== 'all' && t.creator !== txFilters.creator) return false;
      if (txFilters.wallet !== 'all' && t.accountId !== txFilters.wallet) return false;
      if (txFilters.budget !== 'all' && t.budgetId !== txFilters.budget) return false;
      if (txFilters.category !== 'all' && t.categoryId !== txFilters.category) return false;
      if (txFilters.start && t.date < txFilters.start) return false;
      if (txFilters.end && t.date > txFilters.end) return false;
      if (q) {
        var w = walletById(t.accountId), b = budgetById(t.budgetId), c = catById(t.categoryId);
        var text = [t.note, t.type === 'income' ? 'pemasukan' : 'pengeluaran', b && b.name, w && w.name, c.name, t.creator, t.date].filter(Boolean).join(' ').toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderTxList() {
    var list = filteredTransactions();
    var inc = list.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var exp = list.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    $('#txIncomeSum').textContent = showBalance ? rp(inc) : 'Rp ••••••';
    $('#txExpenseSum').textContent = showBalance ? rp(exp) : 'Rp ••••••';
    $('#txResultNote').textContent = 'Menampilkan ' + list.length + ' dari ' + TRANSACTIONS.length + ' transaksi.';

    if (!list.length) {
      $('#txList').innerHTML = '<div class="empty"><div class="emoji">🧾</div><h3>Belum ada transaksi</h3><p class="muted tiny">Tambahkan transaksi pertama Anda agar dashboard mulai terisi.</p></div>';
      return;
    }
    $('#txList').innerHTML = list.map(function (t) {
      var isInc = t.type === 'income';
      var b = budgetById(t.budgetId), c = catById(t.categoryId), w = walletById(t.accountId);
      var group = isInc ? (c.name || 'Pemasukan') : (b ? b.name : 'Tanpa Alokasi');
      return '<article class="transaction-item ' + t.type + '">'
        + '<div class="transaction-icon ' + t.type + '">' + icon(isInc ? 'trending-up' : 'trending-down', 18) + '</div>'
        + '<div class="item-main">'
        + '<div class="transaction-title-row"><h3 class="item-title">' + t.note + '</h3>'
        + '<span class="type-badge ' + t.type + '">' + (isInc ? 'Masuk' : 'Keluar') + '</span></div>'
        + '<div class="transaction-meta"><span>' + fmtDate(t.date) + '</span><span>•</span><span>' + group + '</span><span>•</span><span>Oleh ' + t.creator + '</span></div>'
        + '<div class="wallet-chip">' + icon('wallet', 13) + '<span>' + (w ? w.name : 'Dompet tidak ditemukan') + '</span><em>' + (w ? w.typeLabel : '') + '</em></div>'
        + '<div class="transaction-actions">'
        + '<button class="action-btn edit" type="button" data-action="edit-tx" data-id="' + t.id + '">' + icon('edit', 13) + ' Edit</button>'
        + '<button class="action-btn delete" type="button" data-action="del-tx" data-id="' + t.id + '">' + icon('trash', 13) + ' Hapus</button>'
        + '</div></div>'
        + '<div class="transaction-amount-wrap"><p class="amount ' + t.type + '">' + (showBalance ? (isInc ? '+' : '-') + rp(t.amount) : '••••••') + '</p></div>'
        + '</article>';
    }).join('');
  }

  function populateTxFilterSelects() {
    $('#fCreator').innerHTML = '<option value="all">Semua anggota</option>' + MEMBERS.map(function (m) {
      return '<option value="' + m.name + '">' + m.name + '</option>';
    }).join('');
    $('#fWallet').innerHTML = '<option value="all">Semua dompet</option>' + WALLETS.map(function (w) {
      return '<option value="' + w.id + '">' + w.name + '</option>';
    }).join('');
    $('#fBudget').innerHTML = '<option value="all">Semua alokasi</option>' + BUDGETS.map(function (b) {
      return '<option value="' + b.id + '">' + b.name + '</option>';
    }).join('');
    $('#fCategory').innerHTML = '<option value="all">Semua kategori</option>' + CATEGORIES.custom.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + '</option>';
    }).join('');
  }

  /* ---------- Budgets ---------- */
  const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function renderBudgetPage() {
    $('#cycleLabel').textContent = MONTH_NAMES[cycle.month - 1] + ' ' + cycle.year;
    $('#cycleRange2').textContent = CYCLE_RANGE;
    $('#cycleMonth').value = cycle.month;
    $('#cycleYear').value = cycle.year;
    $('#budgetFormPeriod').textContent = 'Periode form: ' + CYCLE_RANGE;

    var list = BUDGETS.filter(function (b) { return Number(b.month) === Number(cycle.month) && Number(b.year) === Number(cycle.year); });
    var totals = list.reduce(function (acc, b) {
      var u = budgetUsage(b, TRANSACTIONS);
      acc.total += Number(b.amount || 0); acc.used += u.used; acc.remaining += u.remaining; acc.over += u.overAmount;
      return acc;
    }, { total: 0, used: 0, remaining: 0, over: 0 });
    var raw = totals.total > 0 ? Math.round((totals.used / totals.total) * 100) : 0;

    $('#budgetStats').innerHTML =
      '<div><span>Total alokasi</span><strong>' + rp(totals.total) + '</strong></div>'
      + '<div><span>Terpakai</span><strong>' + rp(totals.used) + '</strong></div>'
      + '<div class="' + (totals.remaining < 0 ? 'danger' : '') + '"><span>Sisa bersih</span><strong>' + rp(totals.remaining) + '</strong></div>'
      + '<div class="' + (totals.over > 0 ? 'danger' : '') + '"><span>Over budget</span><strong>' + rp(totals.over) + '</strong></div>';

    var prog = $('#budgetCycleProgress');
    prog.className = 'progress ' + ((totals.over > 0 || raw >= 100) ? 'red' : (raw >= 75 ? 'amber' : 'green'));
    prog.querySelector('div').style.width = Math.min(100, raw) + '%';
    $('#budgetCycleNote').textContent = raw + '% terpakai · ' + (totals.over > 0 ? 'ada alokasi melewati budget' : 'masih dalam batas alokasi');
    $('#budgetCount').textContent = list.length + ' alokasi';

    $('#budgetCards').innerHTML = list.length ? list.map(function (b) {
      var u = budgetUsage(b, TRANSACTIONS);
      var w = walletById(b.accountId);
      return '<article class="salary-budget-card ' + (u.over ? 'over-budget' : '') + '" data-action="budget-detail" data-id="' + b.id + '" style="cursor:pointer">'
        + '<div class="salary-budget-card-head"><span class="salary-budget-icon">' + icon('piggy-bank', 18) + '</span>'
        + '<div><strong>' + b.name + '</strong><small>' + icon('wallet', 12) + ' ' + (w ? w.name : 'Dompet tidak ditemukan') + '</small></div></div>'
        + (b.note ? '<p class="salary-budget-note">' + b.note + '</p>' : '')
        + '<div class="salary-budget-card-metrics">'
        + '<span><small>Total</small><strong>' + rp(b.amount) + '</strong></span>'
        + '<span><small>Terpakai</small><strong>' + rp(u.used) + '</strong></span>'
        + '<span class="' + (u.over ? 'danger' : '') + '"><small>' + (u.over ? 'Over' : 'Sisa') + '</small><strong>' + (u.over ? rp(u.overAmount) : rp(u.remaining)) + '</strong></span>'
        + '</div>'
        + '<div class="salary-budget-card-progress"><div class="progress ' + u.tone + '"><div style="width:' + u.progress + '%"></div></div><small>' + u.progressRaw + '% terpakai</small></div>'
        + '<div class="salary-budget-card-footer">'
        + '<small>' + icon('calendar-days', 12) + ' ' + CYCLE_RANGE + '</small>'
        + '<span class="budget-card-actions">'
        + '<button class="action-btn edit" type="button" data-action="edit-budget" data-id="' + b.id + '">' + icon('edit', 13) + ' Edit</button>'
        + '<button class="action-btn danger" type="button" data-action="del-budget" data-id="' + b.id + '">' + icon('trash', 13) + ' Hapus</button>'
        + '</span></div></article>';
    }).join('') : '<div class="card empty-soft-card">Belum ada alokasi pada periode ini. Klik tombol Tambah untuk membuat alokasi pertama.</div>';
  }

  function openBudgetForm(budget) {
    editingBudgetId = budget ? budget.id : null;
    $('#budgetFormKicker').textContent = budget ? 'Edit alokasi' : 'Alokasi baru';
    $('#budgetFormTitle').textContent = budget ? budget.name : 'Tambah alokasi';
    $('#bfName').value = budget ? budget.name : '';
    $('#bfAmount').value = budget ? budget.amount : '';
    $('#bfWallet').value = budget ? budget.accountId : '';
    $('#bfMonth').value = budget ? budget.month : cycle.month;
    $('#bfYear').value = budget ? budget.year : cycle.year;
    $('#bfNote').value = budget ? (budget.note || '') : '';
    $('#budgetFormCard').hidden = false;
    $('#appScroll').scrollTop = 0;
  }
  function closeBudgetForm() {
    editingBudgetId = null;
    $('#budgetFormCard').hidden = true;
  }

  function populateBudgetFormSelects() {
    $('#bfWallet').innerHTML = '<option value="">Pilih dompet</option>' + WALLETS.filter(function (w) { return w.active; }).map(function (w) {
      return '<option value="' + w.id + '">' + w.name + '</option>';
    }).join('');
    $('#bfMonth').innerHTML = Array.from({ length: 12 }, function (_, i) { return i + 1; }).map(function (m) {
      return '<option value="' + m + '">' + String(m).padStart(2, '0') + '</option>';
    }).join('');
    $('#bfMonth').value = cycle.month;
  }

  /* ---------- Reports ---------- */
  function renderReports() {
    var repTx = TRANSACTIONS.filter(function (t) {
      if (txMonth(t) !== report.month || txYear(t) !== report.year) return false;
      if (report.wallet !== 'all' && t.accountId !== report.wallet) return false;
      if (report.budget !== 'all' && t.budgetId !== report.budget) return false;
      return true;
    });
    var income = repTx.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var expense = repTx.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var net = income - expense;

    var budgets = BUDGETS.filter(function (b) {
      if (Number(b.month) !== report.month || Number(b.year) !== report.year) return false;
      if (report.wallet !== 'all' && b.accountId !== report.wallet) return false;
      if (report.budget !== 'all' && b.id !== report.budget) return false;
      return true;
    });
    var allocTotal = budgets.reduce(function (s, b) { return s + Number(b.amount || 0); }, 0);
    var overTotal = budgets.reduce(function (s, b) { return s + budgetUsage(b, repTx).overAmount; }, 0);

    $('#repCycleRange').textContent = 'Periode gajian: ' + CYCLE_RANGE;
    var netEl = $('#repNet');
    netEl.className = 'reports-basic-net ' + (net < 0 ? 'is-minus' : 'is-plus');
    $('#repNetVal').textContent = (net < 0 ? '-' : '') + rp(Math.abs(net));
    $('#repNetCount').textContent = repTx.length + ' transaksi';

    $('#repSummary').innerHTML =
      '<article class="reports-basic-summary-card reports-basic-income"><span>Pemasukan</span><strong>' + rp(income) + '</strong><small>Total transaksi masuk</small></article>'
      + '<article class="reports-basic-summary-card reports-basic-expense"><span>Pengeluaran</span><strong>' + rp(expense) + '</strong><small>Total transaksi keluar</small></article>'
      + '<article class="reports-basic-summary-card"><span>Total alokasi</span><strong>' + rp(allocTotal) + '</strong><small>' + budgets.length + ' alokasi</small></article>'
      + '<article class="reports-basic-summary-card ' + (overTotal > 0 ? 'reports-basic-expense' : 'reports-basic-income') + '"><span>Over budget</span><strong>' + rp(overTotal) + '</strong><small>' + (overTotal > 0 ? 'Melewati batas' : 'Masih aman') + '</small></article>';

    $('#repAllocations').innerHTML = budgets.length ? budgets.map(function (b) {
      var u = budgetUsage(b, repTx);
      var w = walletById(b.accountId);
      var isOver = u.remaining < 0;
      return '<article class="reports-basic-allocation-row">'
        + '<div class="reports-basic-allocation-head"><div><strong>' + b.name + '</strong><span>' + (w ? w.name : 'Tanpa dompet') + '</span></div><b>' + rp(u.used) + '</b></div>'
        + '<div class="reports-basic-track"><div class="' + (isOver ? 'is-over' : '') + '" style="width:' + u.progress + '%"></div></div>'
        + '<div class="reports-basic-allocation-foot"><span>Alokasi ' + rp(b.amount) + '</span>'
        + '<span class="' + (isOver ? 'is-over-text' : '') + '">' + (isOver ? 'Over ' + rp(u.overAmount) : 'Sisa ' + rp(u.remaining)) + '</span></div></article>';
    }).join('') : '<div class="reports-basic-empty">Belum ada alokasi pada periode ini.</div>';

    var latest = repTx.slice().sort(function (a, b) { return (b.date < a.date) ? -1 : (b.date > a.date ? 1 : 0); }).slice(0, 8);
    $('#repTransactions').innerHTML = latest.length ? latest.map(function (t) {
      var isExp = t.type === 'expense';
      var b = budgetById(t.budgetId), w = walletById(t.accountId);
      return '<article class="reports-basic-transaction-row">'
        + '<div><strong>' + (b ? b.name : t.note || (isExp ? 'Pengeluaran' : 'Pemasukan')) + '</strong>'
        + '<span>' + fmtDate(t.date) + ' · ' + (w ? w.name : 'Dompet') + '</span></div>'
        + '<b class="' + (isExp ? 'is-expense' : 'is-income') + '">' + (isExp ? '-' : '+') + rp(t.amount) + '</b></article>';
    }).join('') : '<div class="reports-basic-empty">Belum ada transaksi pada periode ini.</div>';
  }

  function populateReportSelects() {
    $('#repMonth').innerHTML = Array.from({ length: 12 }, function (_, i) { return i + 1; }).map(function (m) {
      return '<option value="' + m + '">' + m + '</option>';
    }).join('');
    $('#repYear').innerHTML = '<option value="2026">2026</option>';
    $('#repWallet').innerHTML = '<option value="all">Semua dompet</option>' + WALLETS.map(function (w) {
      return '<option value="' + w.id + '">' + w.name + '</option>';
    }).join('');
    $('#repBudget').innerHTML = '<option value="all">Semua alokasi</option>' + BUDGETS.map(function (b) {
      return '<option value="' + b.id + '">' + b.name + '</option>';
    }).join('');
    $('#repMonth').value = report.month;
    $('#repYear').value = report.year;
  }

/* ---------- Settings renders ---------- */
  function renderMembers() {
    $('#familyStack').innerHTML = MEMBERS.map(function (m) {
      return '<div class="family-stack-avatar">' + initials(m.name) + '</div>';
    }).join('');

    $('#memberList').innerHTML = MEMBERS.map(function (m) {
      var locked = m.role === 'owner';
      var self = m.self;
      return '<div class="member-row role-member-row ' + (locked ? 'locked-owner' : '') + '">'
        + '<div class="member-avatar ' + m.role + '">' + initials(m.name) + '</div>'
        + '<div class="item-main"><p class="item-title" style="margin:0;font-size:14px;font-weight:800">' + m.name + '</p>'
        + '<p class="item-sub">' + m.email + '</p><p class="item-sub">@' + m.username + '</p></div>'
        + '<div class="role-member-actions">'
        + '<span class="role-pill ' + m.role + '">' + ROLE_LABEL[m.role] + '</span>'
        + (locked ? '' : '<select class="role-select" data-role-for="' + m.id + '"><option value="member" ' + (m.role === 'member' ? 'selected' : '') + '>Member</option><option value="admin" ' + (m.role === 'admin' ? 'selected' : '') + '>Admin</option></select>')
        + (self ? '<p class="muted tiny role-note">Akun Anda</p>' : '')
        + (locked && !self ? '<p class="muted tiny role-note">Owner utama</p>' : '')
        + ((!locked && !self) ? '<div class="role-action-row"><button class="action-btn edit" type="button" data-action="save-role" data-id="' + m.id + '">' + icon('save', 12) + ' Simpan</button><button class="action-btn danger" type="button" data-action="remove-member" data-id="' + m.id + '">' + icon('trash', 12) + ' Hapus</button></div>' : '')
        + '</div></div>';
    }).join('');
  }

  function renderWalletManage() {
    $('#walletManageList').innerHTML = WALLETS.map(function (w) {
      return '<div class="wallet-row wallet-management-row">'
        + '<div class="member-avatar">' + icon('wallet', 18) + '</div>'
        + '<div class="item-main"><p class="item-title" style="margin:0;font-size:14px;font-weight:800">' + w.name + '</p>'
        + '<p class="item-sub">' + ACCOUNT_TYPE_LABEL[w.type] + ' • ' + (w.active ? 'Aktif' : 'Nonaktif') + '</p></div>'
        + '<div class="wallet-actions"><p class="amount">' + rp(w.balance) + '</p>'
        + '<div class="inline-actions">'
        + '<button class="action-btn edit" type="button" data-action="edit-wallet" data-id="' + w.id + '">' + icon('edit', 12) + ' Edit</button>'
        + '<button class="action-btn danger" type="button" data-action="del-wallet" data-id="' + w.id + '">' + icon('trash', 12) + ' Hapus</button>'
        + '<button class="link-btn tiny" type="button" data-action="toggle-wallet" data-id="' + w.id + '">' + (w.active ? 'Nonaktifkan' : 'Aktifkan') + '</button>'
        + '</div></div></div>';
    }).join('');
  }

  function renderCategories() {
    $('#categoryCustom').innerHTML = CATEGORIES.custom.length ? CATEGORIES.custom.map(function (c) {
      return '<span class="category-chip income">' + c.name + '<em>Pemasukan</em>'
        + '<button type="button" data-action="del-category" data-id="' + c.id + '" aria-label="Hapus kategori">' + icon('trash', 12) + '</button></span>';
    }).join('') : '<p class="muted tiny">Belum ada kategori pemasukan custom.</p>';
    $('#categoryDefault').innerHTML = CATEGORIES.default.map(function (c) {
      return '<span class="category-chip readonly income">' + c.name + '</span>';
    }).join('');
  }

  function renderGoals() {
    $('#goalList').innerHTML = GOALS.map(function (g) {
      var pct = Math.min(100, Math.round((g.current / g.target) * 100));
      return '<div class="wallet-row" style="align-items:stretch;flex-direction:column">'
        + '<div class="row-between"><div><p class="item-title" style="margin:0;font-size:14px;font-weight:800">' + g.name + '</p>'
        + '<p class="item-sub">' + rp(g.current) + ' dari ' + rp(g.target) + '</p></div><strong>' + pct + '%</strong></div>'
        + '<div class="progress green"><div style="width:' + pct + '%"></div></div></div>';
    }).join('');
    $('#goalSelect').innerHTML = '<option value="">Pilih</option>' + GOALS.map(function (g) {
      return '<option value="' + g.id + '">' + g.name + '</option>';
    }).join('');
  }

  /* ---------- Transaction sheet ---------- */
  function openSheet() {
    sheetType = 'expense';
    sheetBudgetId = '';
    $('#sheetTitle').textContent = 'Catat cepat';
    $('#sheetDate').value = new Date().toISOString().slice(0, 10);
    $('#sheetNote').value = '';
    setSheetTypeUI('expense');
    $('#sheetBackdrop').hidden = false;
  }
  function closeSheet() { $('#sheetBackdrop').hidden = true; }
  function setSheetTypeUI(type) {
    sheetType = type;
    sheetBudgetId = '';
    $$('#sheetType button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.stype === type);
    });
    $('#sheetAllocationField').hidden = type !== 'expense';
    $('#sheetIncomeFields').hidden = type !== 'income';
    updateAllocationButton();
  }
  function updateAllocationButton() {
    var b = budgetById(sheetBudgetId);
    var btn = $('#allocationSelectBtn');
    if (b) {
      var w = walletById(b.accountId);
      btn.classList.add('selected');
      btn.innerHTML = '<span><strong>' + b.name + '</strong><small>' + (w ? w.name : 'Dompet tidak ditemukan') + '</small></span><em>' + rp(budgetUsage(b, TRANSACTIONS).remaining) + ' tersisa</em>';
      $('#allocationHint').className = 'budget-hint';
      $('#allocationHint').textContent = 'Sumber: ' + (w ? w.name : '') + ' · Sisa setelah transaksi otomatis diperbarui. Periode reset tiap tanggal 25.';
    } else {
      btn.classList.remove('selected');
      btn.innerHTML = '<span><strong>Pilih alokasi</strong><small>' + BUDGETS.length + ' alokasi tersedia · ' + CYCLE_RANGE + '</small></span><em>Pilih</em>';
      $('#allocationHint').className = 'budget-hint';
      $('#allocationHint').textContent = 'Pengeluaran wajib memilih alokasi. Daftar mengikuti periode gajian: tanggal 25 sampai 24 bulan berikutnya.';
    }
  }
  function openAllocationPicker() {
    $('#allocSearch').value = '';
    renderAllocList();
    $('#allocationBackdrop').hidden = false;
  }
  function closeAllocationPicker() { $('#allocationBackdrop').hidden = true; }
  function renderAllocList() {
    var q = $('#allocSearch').value.trim().toLowerCase();
    var list = BUDGETS.filter(function (b) {
      if (!q) return true;
      var w = walletById(b.accountId);
      return (b.name + ' ' + (b.note || '') + ' ' + (w ? w.name : '')).toLowerCase().indexOf(q) !== -1;
    });
    $('#allocList').innerHTML = list.length ? list.map(function (b) {
      var u = budgetUsage(b, TRANSACTIONS);
      var w = walletById(b.accountId);
      var sel = sheetBudgetId === b.id;
      return '<button type="button" class="allocation-option-card ' + (sel ? 'selected' : '') + '" data-action="pick-allocation" data-id="' + b.id + '">'
        + '<span class="allocation-option-check">' + (sel ? icon('check', 16) : '') + '</span>'
        + '<span class="allocation-option-main"><strong>' + b.name + '</strong>'
        + '<span class="allocation-option-meta">' + icon('wallet', 14) + ' ' + (w ? w.name : 'Dompet tidak ditemukan') + '</span>'
        + (b.note ? '<small>' + b.note + '</small>' : '')
        + '<span class="allocation-option-progress"><i style="width:' + u.progress + '%"></i></span></span>'
        + '<span class="allocation-option-amounts"><em>Sisa</em>'
        + '<strong class="' + (u.remaining <= 0 ? 'danger' : '') + '">' + rp(u.remaining) + '</strong>'
        + '<small>Dipakai ' + rp(u.used) + ' dari ' + rp(b.amount) + '</small></span></button>';
    }).join('') : '<div class="allocation-empty-state"><strong>Alokasi tidak ditemukan.</strong><p>Coba ubah kata pencarian atau cek tanggal transaksi agar sesuai dengan bulan alokasi.</p></div>';
  }

  /* ---------- Finance detail modal ---------- */
  function openDetail(type, id) {
    var sheet = $('#detailSheet');
    if (type === 'wallet') {
      var w = walletById(id);
      if (!w) return;
      var txs = TRANSACTIONS.filter(function (t) { return t.accountId === id; });
      var inc = txs.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + t.amount; }, 0);
      var exp = txs.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + t.amount; }, 0);
      sheet.innerHTML = '<div class="detail-head"><div><p class="section-kicker">Detail Dompet</p><h2>' + w.name + '</h2><small>' + w.typeLabel + ' • ' + (w.active ? 'Aktif' : 'Nonaktif') + '</small></div>'
        + '<button class="icon-btn" type="button" data-action="close-detail" aria-label="Tutup">' + icon('x', 18) + '</button></div>'
        + '<div class="detail-hero"><span>Saldo saat ini</span><strong>' + rp(w.balance) + '</strong></div>'
        + '<div class="detail-stats"><div><span>Transaksi</span><strong>' + txs.length + '</strong></div><div><span>Masuk</span><strong>' + rp(inc) + '</strong></div><div><span>Keluar</span><strong>' + rp(exp) + '</strong></div></div>'
        + '<div><p class="detail-list-title">Transaksi terakhir</p>' + (txs.length ? txs.map(function (t) {
          var b = budgetById(t.budgetId);
          return '<div class="reports-basic-transaction-row"><div><strong>' + t.note + '</strong><span>' + fmtDate(t.date) + (b ? ' • ' + b.name : '') + '</span></div>'
            + '<b class="' + (t.type === 'expense' ? 'is-expense' : 'is-income') + '">' + (t.type === 'expense' ? '-' : '+') + rp(t.amount) + '</b></div>';
        }).join('') : '<div class="reports-basic-empty">Belum ada transaksi di dompet ini.</div>') + '</div>';
    } else {
      var b = budgetById(id);
      if (!b) return;
      var u = budgetUsage(b, TRANSACTIONS);
      var w = walletById(b.accountId);
      var txs = TRANSACTIONS.filter(function (t) { return t.budgetId === id; });
      sheet.innerHTML = '<div class="detail-head"><div><p class="section-kicker">Detail Alokasi</p><h2>' + b.name + '</h2><small>' + (w ? w.name : 'Tanpa dompet') + '</small></div>'
        + '<button class="icon-btn" type="button" data-action="close-detail" aria-label="Tutup">' + icon('x', 18) + '</button></div>'
        + '<div class="detail-hero"><span>' + (u.over ? 'Over budget' : 'Sisa alokasi') + '</span><strong class="' + (u.over ? 'amount expense' : '') + '">' + (u.over ? rp(u.overAmount) : rp(u.remaining)) + '</strong>'
        + '<small>' + u.progressRaw + '% terpakai</small><div class="progress ' + u.tone + '" style="margin-top:8px"><div style="width:' + u.progress + '%"></div></div></div>'
        + '<div class="detail-stats"><div><span>Total</span><strong>' + rp(b.amount) + '</strong></div><div><span>Terpakai</span><strong>' + rp(u.used) + '</strong></div><div class="' + (u.over ? 'danger' : '') + '"><span>Sisa</span><strong>' + rp(Math.max(0, u.remaining)) + '</strong></div></div>'
        + '<div><p class="detail-list-title">Transaksi periode ini</p>' + (txs.length ? txs.map(function (t) {
          return '<div class="reports-basic-transaction-row"><div><strong>' + t.note + '</strong><span>' + fmtDate(t.date) + ' • Oleh ' + t.creator + '</span></div>'
            + '<b class="is-expense">-' + rp(t.amount) + '</b></div>';
        }).join('') : '<div class="reports-basic-empty">Belum ada transaksi untuk alokasi ini.</div>') + '</div>';
    }
    $('#detailBackdrop').hidden = false;
  }
  function closeDetail() { $('#detailBackdrop').hidden = true; }

  /* ---------- Selects / init ---------- */
  function initSelects() {
    var months = Array.from({ length: 12 }, function (_, i) { return i + 1; }).map(function (m) {
      return '<option value="' + m + '">' + String(m).padStart(2, '0') + '</option>';
    }).join('');
    $('#cycleMonth').innerHTML = months;
    $('#cycleMonth').value = cycle.month;
    $('#sheetCategory').innerHTML = '<option value="">Pilih</option>' + CATEGORIES.custom.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + '</option>';
    }).join('');
    $('#sheetWallet').innerHTML = '<option value="">Pilih</option>' + WALLETS.filter(function (w) { return w.active; }).map(function (w) {
      return '<option value="' + w.id + '">' + w.name + '</option>';
    }).join('');
    populateTxFilterSelects();
    populateBudgetFormSelects();
    populateReportSelects();
  }

  /* ---------- Event binding ---------- */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (el) {
        var action = el.dataset.action, id = el.dataset.id;
        if (action === 'wallet-detail') openDetail('wallet', id);
        else if (action === 'budget-detail') openDetail('budget', id);
        else if (action === 'close-detail') closeDetail();
        else if (action === 'notif') {
          var n = NOTIFICATIONS.find(function (x) { return x.id === id; });
          if (n) n.read = true;
          renderNotifs();
        } else if (action === 'edit-tx') {
          openSheet();
          toast('Mode edit transaksi: gunakan form bawah.');
        } else if (action === 'del-tx') {
          var tx = TRANSACTIONS.find(function (x) { return x.id === id; });
          if (tx && confirm('Hapus transaksi "' + tx.note + '"?')) {
            TRANSACTIONS.splice(TRANSACTIONS.indexOf(tx), 1);
            renderAll();
            toast('Transaksi dihapus.');
          }
        } else if (action === 'edit-budget') { openBudgetForm(budgetById(id)); }
        else if (action === 'del-budget') {
          var bd = budgetById(id);
          if (bd && confirm('Hapus alokasi "' + bd.name + '"?')) {
            BUDGETS.splice(BUDGETS.indexOf(bd), 1);
            renderAll();
            toast('Alokasi dihapus.');
          }
        } else if (action === 'pick-allocation') {
          sheetBudgetId = id;
          updateAllocationButton();
          closeAllocationPicker();
        } else if (action === 'save-role') {
          var sel = document.querySelector('[data-role-for="' + id + '"]');
          var m = MEMBERS.find(function (x) { return x.id === id; });
          if (m && sel) m.role = sel.value;
          renderMembers();
          toast('Role anggota diperbarui.');
        } else if (action === 'remove-member') {
          var mm = MEMBERS.find(function (x) { return x.id === id; });
          if (mm && confirm('Hapus ' + mm.name + ' dari keluarga?')) {
            MEMBERS.splice(MEMBERS.indexOf(mm), 1);
            renderMembers();
            toast('Anggota dihapus dari keluarga.');
          }
        } else if (action === 'edit-wallet') {
          var w = walletById(id);
          if (w) { editingWalletId = id; toast('Mode edit dompet: ubah melalui form bawah.'); }
        } else if (action === 'del-wallet') {
          var wd = walletById(id);
          if (wd && confirm('Hapus dompet "' + wd.name + '"?')) {
            WALLETS.splice(WALLETS.indexOf(wd), 1);
            renderAll();
            toast('Dompet dihapus.');
          }
        } else if (action === 'toggle-wallet') {
          var wt = walletById(id);
          if (wt) { wt.active = !wt.active; renderAll(); toast(wt.active ? 'Dompet diaktifkan.' : 'Dompet dinonaktifkan.'); }
        } else if (action === 'del-category') {
          var c = CATEGORIES.custom.find(function (x) { return x.id === id; });
          if (c && confirm('Hapus kategori "' + c.name + '"?')) {
            CATEGORIES.custom.splice(CATEGORIES.custom.indexOf(c), 1);
            renderAll();
            toast('Kategori dihapus.');
          }
        }
        return;
      }

      var tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { goTab(tabBtn.dataset.tab); return; }

      var panelBtn = e.target.closest('[data-panel]');
      if (panelBtn) { setPanel(panelBtn.dataset.panel); return; }

      var settingsGo = e.target.closest('[data-goto-settings]');
      if (settingsGo) { goTab('settings'); setPanel(settingsGo.dataset.gotoSettings); return; }

      var backMenu = e.target.closest('[data-back-menu]');
      if (backMenu) { setPanel('menu'); return; }

      var themeBtn = e.target.closest('[data-theme]');
      if (themeBtn) { setTheme(themeBtn.dataset.theme); return; }

      var authBtn = e.target.closest('[data-auth]');
      if (authBtn) { setAuthMode(authBtn.dataset.auth); return; }
    });

    document.addEventListener('change', function (e) {
      if (e.target.id === 'fCreator') { txFilters.creator = e.target.value; renderTxList(); }
      if (e.target.id === 'fWallet') { txFilters.wallet = e.target.value; renderTxList(); }
      if (e.target.id === 'fBudget') { txFilters.budget = e.target.value; renderTxList(); }
      if (e.target.id === 'fCategory') { txFilters.category = e.target.value; renderTxList(); }
      if (e.target.id === 'fStart') { txFilters.start = e.target.value; renderTxList(); }
      if (e.target.id === 'fEnd') { txFilters.end = e.target.value; renderTxList(); }
      if (e.target.id === 'cycleMonth') { cycle.month = Number(e.target.value); renderBudgetPage(); }
      if (e.target.id === 'cycleYear') { cycle.year = Number(e.target.value); renderBudgetPage(); }
      if (e.target.id === 'repMonth') { report.month = Number(e.target.value); renderReports(); }
      if (e.target.id === 'repYear') { report.year = Number(e.target.value); renderReports(); }
      if (e.target.id === 'repWallet') { report.wallet = e.target.value; renderReports(); }
      if (e.target.id === 'repBudget') { report.budget = e.target.value; renderReports(); }
    });

    $('#authForm').addEventListener('submit', function (e) {
      e.preventDefault();
      toast('Login berhasil. Menuju setup keluarga...');
      showScreen('onboarding');
    });
    $('#createForm').addEventListener('submit', function (e) {
      e.preventDefault();
      toast('Keluarga berhasil dibuat!');
      showScreen('app');
    });
    $('#joinForm').addEventListener('submit', function (e) {
      e.preventDefault();
      toast('Berhasil bergabung ke keluarga.');
      showScreen('app');
    });

    $('#balanceToggle').addEventListener('click', function () {
      showBalance = !showBalance;
      renderAll();
    });
    $('#bellBtn').addEventListener('click', function () {
      $('#notifPanel').hidden = !$('#notifPanel').hidden;
    });
    $('#notifAllRead').addEventListener('click', function () {
      NOTIFICATIONS.forEach(function (n) { n.read = true; });
      renderNotifs();
      toast('Semua notifikasi ditandai dibaca.');
    });
    $('#txAddBtn').addEventListener('click', openSheet);
    $('#txAddBtn2').addEventListener('click', openSheet);
    $('#fabBtn').addEventListener('click', openSheet);
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#sheetBackdrop').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
    $('#sheetType').addEventListener('click', function (e) {
      var b = e.target.closest('[data-stype]');
      if (b) setSheetTypeUI(b.dataset.stype);
    });
    $('#transactionSheet').addEventListener('submit', function (e) {
      e.preventDefault();
      toast(sheetType === 'expense' ? 'Pengeluaran disimpan.' : 'Pemasukan disimpan.');
      closeSheet();
    });
    $('#allocationSelectBtn').addEventListener('click', openAllocationPicker);
    $('#allocClose').addEventListener('click', closeAllocationPicker);
    $('#allocationBackdrop').addEventListener('click', function (e) { if (e.target === this) closeAllocationPicker(); });
    $('#allocSearch').addEventListener('input', renderAllocList);
    $('#txSearch').addEventListener('input', function () { txQuery = this.value; renderTxList(); });
    $('#txTypeFilter').addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;
      txType = chip.dataset.type;
      $$('#txTypeFilter .filter-chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
      renderTxList();
    });
    $('#txFilterBtn').addEventListener('click', function () { $('#advancedFilter').hidden = !$('#advancedFilter').hidden; });
    $('#txResetFilters').addEventListener('click', function () {
      txQuery = ''; txType = 'all'; txFilters = { creator: 'all', wallet: 'all', budget: 'all', category: 'all', start: '', end: '' };
      $('#txSearch').value = '';
      $('#fCreator').value = 'all'; $('#fWallet').value = 'all'; $('#fBudget').value = 'all'; $('#fCategory').value = 'all'; $('#fStart').value = ''; $('#fEnd').value = '';
      $$('#txTypeFilter .filter-chip').forEach(function (c) { c.classList.toggle('active', c.dataset.type === 'all'); });
      renderTxList();
      toast('Filter direset.');
    });
    $('#budgetAddBtn').addEventListener('click', function () { openBudgetForm(null); });
    $('#budgetFormClose').addEventListener('click', closeBudgetForm);
    $('#budgetFormCancel').addEventListener('click', closeBudgetForm);
    $('#budgetForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#bfName').value.trim();
      var amount = Number($('#bfAmount').value || 0);
      var accountId = $('#bfWallet').value;
      var month = Number($('#bfMonth').value), year = Number($('#bfYear').value);
      if (!name) return toast('Nama alokasi wajib diisi.');
      if (!accountId) return toast('Sumber dompet wajib dipilih.');
      if (amount <= 0) return toast('Nominal alokasi harus lebih dari 0.');
      if (editingBudgetId) {
        var b = budgetById(editingBudgetId);
        if (b) Object.assign(b, { name: name, amount: amount, accountId: accountId, month: month, year: year, note: $('#bfNote').value.trim() });
        toast('Alokasi diperbarui.');
      } else {
        BUDGETS.push({ id: 'b' + Date.now(), name: name, amount: amount, accountId: accountId, month: month, year: year, note: $('#bfNote').value.trim() });
        toast('Alokasi baru disimpan.');
      }
      cycle = { month: month, year: year };
      closeBudgetForm();
      renderAll();
    });
    $('#repReset').addEventListener('click', function () {
      report = { month: CYCLE_MONTH, year: CYCLE_YEAR, wallet: 'all', budget: 'all' };
      $('#repMonth').value = report.month; $('#repYear').value = report.year; $('#repWallet').value = 'all'; $('#repBudget').value = 'all';
      renderReports();
    });
    $('#logoutBtn').addEventListener('click', function () {
      toast('Berhasil logout.');
      showScreen('auth');
    });
    $('#copyInviteBtn').addEventListener('click', function () { toast('Kode undangan disalin.'); });
    $('#authThemeBtn').addEventListener('click', function () { setTheme(theme === 'dark' ? 'light' : 'dark'); });
    $('#authHelpBack').addEventListener('click', function () { setAuthMode('login'); });
    $('#pwToggle').addEventListener('click', function () {
      var inp = $('#iPassword');
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $('#pwToggle').innerHTML = icon(show ? 'eye-off' : 'eye', 18);
    });
    $('#modeCreateBtn').addEventListener('click', function () {
      $('#modeCreateBtn').classList.add('active'); $('#modeJoinBtn').classList.remove('active');
      $('#createForm').hidden = false; $('#joinForm').hidden = true;
      $('#onboardIcon').innerHTML = icon('home', 28);
    });
    $('#modeJoinBtn').addEventListener('click', function () {
      $('#modeJoinBtn').classList.add('active'); $('#modeCreateBtn').classList.remove('active');
      $('#createForm').hidden = true; $('#joinForm').hidden = false;
      $('#onboardIcon').innerHTML = icon('users', 28);
    });
  }

  function renderAll() {
    renderDashboard();
    renderTxList();
    renderBudgetPage();
    renderReports();
    renderMembers();
    renderWalletManage();
    renderCategories();
    renderGoals();
  }

  /* ---------- Init ---------- */
  function init() {
    hydrateIcons();
    $('#onboardIcon').innerHTML = icon('home', 28);
    initSelects();
    setAuthMode('login');
    applyTheme(theme);
    renderAll();
    showScreen('auth');
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();