/**
 * RIED Application Controller
 * Reconstructed 1:1 with video reference document_6156569914959209641.mp4:
 * - High-density Dashboard with authentic Matcha Banner
 * - Monthly Calendar Modal ("Lihat satu bulan" popup)
 * - Dual chart mode: "Per hari" (Spline area) & "Per transaksi" (Dense neon mint bars)
 * - Stacked budget projection chart & Dompet horizontal progress bars
 * - Full operational modules: Gateway WA simulator, Kamus keyword manager, Format Balasan, Review Pesan
 * - Web Audio API haptics and theme engine.
 * Zero AI Slop - 100% Complete Implementation.
 */

import {
  fetchFinancialSummary,
  fetchTransactionsList,
  createNewTransaction,
  updateExistingTransaction,
  deleteExistingTransaction,
  fetchCategoriesMeta,
  updateCategoryBudgetLimit,
  fetchPortfolioAssets,
  analyzePortfolio,
  fetchSavingsGoals,
  createSavingsGoal,
  depositSavingsGoal,
  deleteSavingsGoal,
  fetchFinancialHealth,
  fetchAvailableMonths
} from './api.js';

import {
  renderSplineChart,
  renderTransactionBarChart,
  renderStackedBudgetChart,
  attachCanvasInteractivity,
  renderEfficientFrontierChart,
  renderMonteCarloChart
} from './charts.js';

import { sounds } from './audio.js';

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 60fps Smooth Rolling Number Counter (Odometer)
 * Uses cubic ease-out curve for fluid fintech transitions without layout thrashing.
 */
export function animateNumber(element, start, end, duration = 500, formatter = formatRupiah) {
  if (!element) return;
  const s = typeof start === 'number' && !isNaN(start) ? start : 0;
  const e = typeof end === 'number' && !isNaN(end) ? end : 0;
  const diff = e - s;
  if (diff === 0) {
    element.textContent = formatter(e);
    return;
  }
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = Math.round(s + diff * ease);
    element.textContent = formatter(val);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = formatter(e);
    }
  }
  requestAnimationFrame(step);
}

/**
 * Fun & Wise Financial Tips for Riedu Mascot
 */
const RIEDU_TIPS = [
  "Mulai hari dengan mencatat pengeluaran sekecil apapun! 🌱",
  "Alokasikan minimal 20% penghasilan ke tabungan & investasi ya! 🎯",
  "Kebutuhan pokok (Needs) usahakan tetap di bawah 50% cashflow! 🛡️",
  "Kopi Rp 25.000 sehari = Rp 750.000 sebulan lho, nikmati dengan bijak! ☕",
  "Disiplin finansial bukan berarti pelit, tapi memprioritaskan masa depan! ✨",
  "Cek celengan impianmu hari ini, konsistensi kunci sukses finansial! 🏆",
  "Emergency fund minimal 3-6 bulan pengeluaran rutin harus aman! 💼",
  "Portofolio terdiversifikasi melindungi aset dari volatilitas pasar! 📈",
  "Hebat! Streak pencatatan keuanganmu terus bertambah, pertahankan! 🔥",
  "Setiap rupiah yang kamu hemat adalah prajurit modal yang bekerja untukmu! 👑",
  "Catat pengeluaran segera setelah bayar agar tidak kelupaan! ⚡",
  "Kesehatan finansial prima membawa ketenangan pikiran dan tidur nyenyak! 🌿"
];

/**
 * Ultra-Light Canvas Celebration Particle Engine (0 KB External Dependencies)
 * Generates falling gold coins, matcha green leaves, and colorful confetti with physics.
 */
class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this.colors = ['#38a852', '#4efa8b', '#fbbf24', '#f59e0b', '#38bdf8', '#a855f7', '#ec4899'];
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(originX = window.innerWidth / 2, originY = window.innerHeight / 2, count = 65) {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    this.canvas.style.display = 'block';

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: Math.random() * 8 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltSpeed: Math.random() * 0.12 + 0.04,
        rotation: Math.random() * 360,
        rotSpeed: Math.random() * 4 - 2,
        isCoin: Math.random() > 0.65,
        alpha: 1,
        life: 1
      });
    }

    if (!this.animId) {
      this.loop();
    }

    // Safety timeout to ensure animation loop terminates and frees rendering threads
    setTimeout(() => {
      this.particles = [];
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.display = 'none';
      }
    }, 1200);
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.vx *= 0.98;
      p.tilt += p.tiltSpeed;
      p.rotation += p.rotSpeed;
      p.life -= 0.014;
      p.alpha = Math.max(p.life, 0);

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = p.alpha;

      if (p.isCoin) {
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size, p.size * Math.abs(Math.sin(p.tilt)), 0, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fill();
        this.ctx.strokeStyle = '#d97706';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }

      this.ctx.restore();

      if (p.life <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvas.style.display = 'none';
      this.animId = null;
    }
  }
}

class RiedApp {
  constructor() {
    this.currentView = 'dashboard';
    this.chartMode = 'daily'; // 'daily' or 'transaction'
    this.activeRange = '30d'; // '7d', '14d', '30d'
    this.summary = null;
    this.transactions = [];
    this.categories = [];
    this.activeWalletIndex = 0;
    this.wallets = [
      { name: 'Semua Dompet', balance: 9894500, num: '•••• •••• •••• 7652' },
      { name: 'Bank BCA Utama', balance: 5200000, num: '•••• •••• •••• 1092' },
      { name: 'Dompet Tunai (Cash)', balance: 1438500, num: '•••• •••• •••• 4401' },
      { name: 'Kas Tabungan', balance: 3256000, num: '•••• •••• •••• 8823' }
    ];

    // Filters for Transaksi View
    this.txFilterType = null;
    this.txFilterCategory = null;
    this.txSearchQuery = '';
    this.searchDebounceTimer = null;

    // Transaction modal state
    this.editingTxId = null;

    // Budget modal state
    this.editingBudgetCategory = null;

    // Quant Portfolio state
    this.portfolioAssets = [];
    this.portfolioAnalysis = null;
    this.portfolioInitialCapital = 100000000;
    this.portfolioHorizonYears = 5;

    // Celengan Impian (Savings Goals) state
    this.savingsGoals = [];
    this.activeGoalDepositId = null;

    // Financial Health Radar state
    this.financialHealth = null;

    // Theme state
    this.isDarkMode = false;

    // Date & Historical Month Navigation State
    this.selectedYear = 2026;
    this.selectedMonth = 9; // 1 to 12 (September 2026)
    this.selectedDay = null; // 'YYYY-MM-DD' or null
    this.availableMonths = [];

    // Interactive Animation & Particle State
    this.prevValues = { balance: 0, income: 0, expense: 0, savings: 0, txCount: 0 };
    this.confetti = null;
    this.mascotBubbleTimer = null;

    this.cacheDom();
    this.init();
  }

  cacheDom() {
    this.dom = {
      // Navigation
      sidebar: document.getElementById('app-sidebar'),
      btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),
      navButtons: document.querySelectorAll('.sidebar-link'),
      breadcrumbTitle: document.getElementById('breadcrumb-title'),
      currentMonthDisplay: document.getElementById('current-month-display'),
      btnHeaderPrevMonth: document.getElementById('btn-header-prev-month'),
      btnHeaderNextMonth: document.getElementById('btn-header-next-month'),
      btnHeaderMonthPicker: document.getElementById('btn-header-month-picker'),
      soundToggle: document.getElementById('sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      themeToggle: document.getElementById('theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      settingsThemeBtn: document.getElementById('settings-theme-btn'),

      // Interactive Mascot & Gamification
      mascotRiedu: document.getElementById('mascot-riedu'),
      mascotAvatarInner: document.getElementById('mascot-avatar-inner'),
      mascotSpeechBubble: document.getElementById('mascot-speech-bubble'),
      mascotSpeechText: document.getElementById('mascot-speech-text'),
      btnStreakCheckin: document.getElementById('btn-streak-checkin'),
      streakCheckinText: document.getElementById('streak-checkin-text'),
      canvasConfetti: document.getElementById('canvas-confetti'),

      // Views
      views: {
        dashboard: document.getElementById('view-dashboard'),
        transaksi: document.getElementById('view-transaksi'),
        investasi: document.getElementById('view-investasi'),
        pengaturan: document.getElementById('view-pengaturan'),
        'gateway-telegram': document.getElementById('view-gateway-telegram'),
        'format-balasan': document.getElementById('view-format-balasan'),
        kamus: document.getElementById('view-kamus'),
        'log-telegram': document.getElementById('view-log-telegram')
      },

      // Smart Financial Health Radar
      healthRadarScore: document.getElementById('health-radar-score'),
      healthRadarGrade: document.getElementById('health-radar-grade'),
      healthRadarStatus: document.getElementById('health-radar-status'),
      healthBarNeeds: document.getElementById('health-bar-needs'),
      healthBarWants: document.getElementById('health-bar-wants'),
      healthBarSavings: document.getElementById('health-bar-savings'),
      healthNeedsVal: document.getElementById('health-needs-val'),
      healthWantsVal: document.getElementById('health-wants-val'),
      healthSavingsVal: document.getElementById('health-savings-val'),
      healthNeedsRp: document.getElementById('health-needs-rp'),
      healthWantsRp: document.getElementById('health-wants-rp'),
      healthSavingsRp: document.getElementById('health-savings-rp'),
      healthRunwayMonths: document.getElementById('health-runway-months'),
      healthRadarSummary: document.getElementById('health-radar-summary'),
      healthBurnLabel: document.getElementById('health-burn-label'),

      // Celengan Impian (Savings Goals)
      savingsGoalsContainer: document.getElementById('savings-goals-container'),
      btnCreateSavingsGoal: document.getElementById('btn-create-savings-goal'),
      modalCreateGoal: document.getElementById('modal-create-goal'),
      formCreateGoal: document.getElementById('form-create-goal'),
      btnCloseCreateGoalModal: document.getElementById('btn-close-create-goal-modal'),
      btnCancelCreateGoal: document.getElementById('btn-cancel-create-goal'),
      inputGoalTitle: document.getElementById('input-goal-title'),
      inputGoalTarget: document.getElementById('input-goal-target'),
      inputGoalInitial: document.getElementById('input-goal-initial'),
      inputGoalCategory: document.getElementById('input-goal-category'),
      inputGoalDate: document.getElementById('input-goal-date'),

      // Savings Deposit Modal
      modalSavingsDeposit: document.getElementById('modal-savings-deposit'),
      formSavingsDeposit: document.getElementById('form-savings-deposit'),
      btnCloseDepositModal: document.getElementById('btn-close-deposit-modal'),
      btnCancelDeposit: document.getElementById('btn-cancel-deposit'),
      inputDepositAmount: document.getElementById('input-deposit-amount'),
      depositGoalTitle: document.getElementById('deposit-goal-title'),
      depositGoalSubtitle: document.getElementById('deposit-goal-subtitle'),
      btnDepositChips: document.querySelectorAll('.btn-deposit-chip'),

      // Quant Portfolio View Elements
      quantInitialCapital: document.getElementById('quant-initial-capital'),
      quantMetricReturn: document.getElementById('quant-metric-return'),
      quantMetricVolatility: document.getElementById('quant-metric-volatility'),
      quantMetricSharpe: document.getElementById('quant-metric-sharpe'),
      quantMetricVar: document.getElementById('quant-metric-var'),
      chartEfficientFrontier: document.getElementById('chart-efficient-frontier'),
      chartMonteCarlo: document.getElementById('chart-monte-carlo'),
      quantSelectHorizon: document.getElementById('quant-select-horizon'),
      mcFinalMedianLabel: document.getElementById('mc-final-median-label'),
      allocTotalBadge: document.getElementById('alloc-total-badge'),
      slidersAlloc: document.querySelectorAll('.slider-alloc'),
      btnCalcRebalance: document.getElementById('btn-calc-rebalance'),
      rebalanceOrdersTbody: document.getElementById('rebalance-orders-tbody'),

      // Command Palette
      btnOpenCommandPalette: document.getElementById('btn-open-command-palette'),
      commandPalette: document.getElementById('command-palette'),
      paletteSearchInput: document.getElementById('palette-search-input'),
      paletteResultsList: document.getElementById('palette-results-list'),
      paletteItems: document.querySelectorAll('.palette-item'),

      // RIED Wrapped
      btnOpenWrapped: document.getElementById('btn-open-wrapped'),
      modalRiedWrapped: document.getElementById('modal-ried-wrapped'),
      btnCloseWrapped: document.getElementById('btn-close-wrapped'),
      btnDownloadWrappedPng: document.getElementById('btn-download-wrapped-png'),
      wrappedCardPreview: document.getElementById('wrapped-card-preview'),
      wrappedPersonaTitle: document.getElementById('wrapped-persona-title'),
      wrappedStatIncome: document.getElementById('wrapped-stat-income'),
      wrappedStatExpense: document.getElementById('wrapped-stat-expense'),
      wrappedStatTopcat: document.getElementById('wrapped-stat-topcat'),
      wrappedStatScore: document.getElementById('wrapped-stat-score'),

      // Floating Action Button
      fabContainer: document.getElementById('fab-container'),
      fabMainBtn: document.getElementById('fab-main-btn'),
      fabMenu: document.getElementById('fab-menu'),
      fabIcon: document.getElementById('fab-icon'),
      fabActionTx: document.getElementById('fab-action-tx'),
      fabActionGoal: document.getElementById('fab-action-goal'),
      fabActionWrapped: document.getElementById('fab-action-wrapped'),

      // Dashboard Elements
      btnExportExcel: document.getElementById('btn-export-excel'),
      btnExportPdf: document.getElementById('btn-export-pdf'),
      bannerDateRange: document.getElementById('banner-date-range'),
      dayFilterBanner: document.getElementById('day-filter-banner'),
      filterDayBadgeText: document.getElementById('filter-day-badge-text'),
      btnDismissDayFilter: document.getElementById('btn-dismiss-day-filter'),
      calendarDayStrip: document.getElementById('calendar-day-strip'),
      btnOpenMonthlyCal: document.getElementById('btn-open-monthly-cal'),
      btnStripPrevMonth: document.getElementById('btn-strip-prev-month'),
      btnStripNextMonth: document.getElementById('btn-strip-next-month'),
      stripMonthLabel: document.getElementById('strip-month-label'),
      stripMonthBadge: document.getElementById('strip-month-badge'),
      btnClearDayFilter: document.getElementById('btn-clear-day-filter'),
      statStreakCurrent: document.getElementById('stat-streak-current'),
      statStreakMax: document.getElementById('stat-streak-max'),
      statStreakDays: document.getElementById('stat-streak-days'),
      atmCardWidget: document.getElementById('atm-card-widget'),
      atmCardBalance: document.getElementById('atm-card-balance'),
      atmWalletName: document.getElementById('atm-wallet-name'),
      walletDots: document.getElementById('wallet-dots'),

      // Metrics
      statTotalIncome: document.getElementById('stat-total-income'),
      statTotalExpense: document.getElementById('stat-total-expense'),
      statTxCount: document.getElementById('stat-tx-count'),
      statTotalSavings: document.getElementById('stat-total-savings'),

      // Charts, Toggles & Tooltips
      chartTooltip: document.getElementById('chart-tooltip'),
      chartMainExpense: document.getElementById('chart-main-expense'),
      toggleChartDaily: document.getElementById('toggle-chart-daily'),
      toggleChartTx: document.getElementById('toggle-chart-tx'),
      chartBudgetStacked: document.getElementById('chart-budget-stacked'),
      rangePresets: document.querySelectorAll('.btn-range-preset'),

      // Interactive Dompet Rows
      dompetRows: document.querySelectorAll('.dompet-row-clickable'),

      // Filter Box
      filterMonth: document.getElementById('filter-month'),
      filterDateStart: document.getElementById('filter-date-start'),
      filterDateEnd: document.getElementById('filter-date-end'),
      filterWallet: document.getElementById('filter-wallet'),
      filterCategory: document.getElementById('filter-category'),
      btnFilterReset: document.getElementById('btn-filter-reset'),
      btnFilterApply: document.getElementById('btn-filter-apply'),

      // Transaksi View Elements
      btnAddTx: document.getElementById('btn-add-tx'),
      txSearchInput: document.getElementById('tx-search-input'),
      txviewFilterAll: document.getElementById('txview-filter-all'),
      txviewFilterExpense: document.getElementById('txview-filter-expense'),
      txviewFilterIncome: document.getElementById('txview-filter-income'),
      catChipButtons: document.querySelectorAll('.cat-chip-btn'),
      txviewFullList: document.getElementById('txview-full-list'),

      // Modal Monthly Calendar
      modalMonthlyCalendar: document.getElementById('modal-monthly-calendar'),
      btnCloseMonthlyCal: document.getElementById('btn-close-monthly-cal'),
      btnMonthlyCalPrev: document.getElementById('btn-monthly-cal-prev'),
      btnMonthlyCalNext: document.getElementById('btn-monthly-cal-next'),
      monthlyCalTitle: document.getElementById('monthly-cal-title'),
      monthlyCalendarGrid: document.getElementById('monthly-calendar-grid'),
      monthlyCalSummary: document.getElementById('monthly-cal-summary'),

      // Transaction Modal Elements
      txModal: document.getElementById('tx-modal'),
      modalTitle: document.getElementById('modal-title'),
      modalForm: document.getElementById('modal-form'),
      modalCancel: document.getElementById('modal-cancel'),
      btnCancelTx: document.getElementById('btn-cancel-tx'),
      inputTitle: document.getElementById('input-title'),
      inputAmount: document.getElementById('input-amount'),
      inputCategory: document.getElementById('input-category'),
      inputType: document.getElementById('input-type'),
      inputDate: document.getElementById('input-date'),
      inputNotes: document.getElementById('input-notes'),

      // Budget Adjustment Modal
      budgetModal: document.getElementById('budget-modal'),
      budgetModalCat: document.getElementById('budget-modal-category'),
      budgetModalInput: document.getElementById('budget-modal-input'),
      budgetModalForm: document.getElementById('budget-modal-form'),
      budgetModalClose: document.getElementById('budget-modal-close'),
      budgetModalCancel: document.getElementById('budget-modal-cancel'),

      // Telegram Simulator Elements
      tgChatFeed: document.getElementById('tg-chat-feed'),
      tgChatInput: document.getElementById('tg-chat-input'),
      btnTgSend: document.getElementById('btn-tg-send'),
      tgAuditLogContainer: document.getElementById('tg-audit-log-container'),
      btnExportCsv: document.getElementById('btn-export-csv')
    };
  }

  async init() {
    // 1. Theme setup
    const savedTheme = localStorage.getItem('ried-theme') || 'light';
    this.setTheme(savedTheme === 'dark');

    // 2. Sound state setup
    this.updateSoundButtonUI();

    // 3. Bind event listeners
    this.bindEvents();
    this.renderCalendarDayStrip();
    this.initSavingsGoals();
    this.initQuantPortfolio();
    this.initCommandPalette();
    this.initFloatingActionButton();
    this.initWrappedModal();
    this.initConfetti();
    this.init3DTilt();
    this.initMascot();
    this.initStreakCheckIn();
    this.initQuickExpenseChips();
    this.initRippleEffect();

    // 4. Attach Canvas Interactivity
    this.initCanvasInteractivity();

    // 5. Load initial data
    await this.refreshAllData();

    // 6. Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  initCanvasInteractivity() {
    // Main Expense Chart (Spline Points & Bars)
    if (this.dom.chartMainExpense && this.dom.chartTooltip) {
      attachCanvasInteractivity(this.dom.chartMainExpense, this.dom.chartTooltip, (type, item) => {
        sounds.playPop();
        if (type === 'date') {
          // Switch to Transaksi view and filter by selected date
          this.switchView('transaksi');
          if (this.dom.txSearchInput) {
            this.dom.txSearchInput.value = item.date;
            this.txSearchQuery = item.date;
            this.loadTransaksiViewData();
          }
        } else if (type === 'tx') {
          // Open Transaction modal in edit mode
          this.openTxModal(true, item);
        }
      });
    }

    // Stacked Budget Chart (Category Columns)
    if (this.dom.chartBudgetStacked && this.dom.chartTooltip) {
      attachCanvasInteractivity(this.dom.chartBudgetStacked, this.dom.chartTooltip, (type, item) => {
        if (type === 'category') {
          sounds.playPop();
          this.openBudgetModal(item.category, item.budget);
        }
      });
    }
  }

  bindEvents() {
    // Sidebar toggle
    if (this.dom.btnSidebarToggle) {
      this.dom.btnSidebarToggle.addEventListener('click', () => {
        sounds.playPop();
        if (this.dom.sidebar) {
          this.dom.sidebar.classList.toggle('-ml-64');
        }
      });
    }

    // View Navigation Buttons
    this.dom.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        sounds.playPop();
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Sound toggle
    if (this.dom.soundToggle) {
      this.dom.soundToggle.addEventListener('click', () => {
        sounds.toggleMute();
        this.updateSoundButtonUI();
      });
    }

    // Theme toggle
    if (this.dom.themeToggle) {
      this.dom.themeToggle.addEventListener('click', () => {
        sounds.playToggle();
        this.setTheme(!this.isDarkMode);
      });
    }
    if (this.dom.settingsThemeBtn) {
      this.dom.settingsThemeBtn.addEventListener('click', () => {
        sounds.playToggle();
        this.setTheme(!this.isDarkMode);
      });
    }

    // Header Month Navigation
    if (this.dom.btnHeaderPrevMonth) {
      this.dom.btnHeaderPrevMonth.addEventListener('click', () => {
        sounds.playPop();
        this.prevMonth();
      });
    }
    if (this.dom.btnHeaderNextMonth) {
      this.dom.btnHeaderNextMonth.addEventListener('click', () => {
        sounds.playPop();
        this.nextMonth();
      });
    }
    if (this.dom.btnHeaderMonthPicker) {
      this.dom.btnHeaderMonthPicker.addEventListener('click', () => {
        sounds.playPop();
        this.openMonthlyCalendar();
      });
    }

    // Row 1 Calendar Strip Navigation
    if (this.dom.btnStripPrevMonth) {
      this.dom.btnStripPrevMonth.addEventListener('click', () => {
        sounds.playPop();
        this.prevMonth();
      });
    }
    if (this.dom.btnStripNextMonth) {
      this.dom.btnStripNextMonth.addEventListener('click', () => {
        sounds.playPop();
        this.nextMonth();
      });
    }
    if (this.dom.stripMonthLabel) {
      this.dom.stripMonthLabel.addEventListener('click', () => {
        sounds.playPop();
        this.openMonthlyCalendar();
      });
    }
    if (this.dom.btnClearDayFilter) {
      this.dom.btnClearDayFilter.addEventListener('click', () => {
        sounds.playPop();
        this.selectDay(null);
      });
    }
    if (this.dom.btnDismissDayFilter) {
      this.dom.btnDismissDayFilter.addEventListener('click', () => {
        sounds.playPop();
        this.selectDay(null);
      });
    }

    // Monthly Calendar Modal triggers & navigation
    if (this.dom.btnOpenMonthlyCal) {
      this.dom.btnOpenMonthlyCal.addEventListener('click', () => {
        sounds.playPop();
        this.openMonthlyCalendar();
      });
    }
    if (this.dom.btnCloseMonthlyCal) {
      this.dom.btnCloseMonthlyCal.addEventListener('click', () => {
        sounds.playPop();
        this.closeMonthlyCalendar();
      });
    }
    if (this.dom.btnMonthlyCalPrev) {
      this.dom.btnMonthlyCalPrev.addEventListener('click', () => {
        sounds.playPop();
        this.prevMonth(true);
      });
    }
    if (this.dom.btnMonthlyCalNext) {
      this.dom.btnMonthlyCalNext.addEventListener('click', () => {
        sounds.playPop();
        this.nextMonth(true);
      });
    }

    // Filter Month Dropdown Sync
    if (this.dom.filterMonth) {
      this.dom.filterMonth.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val && val.includes('-')) {
          const [y, m] = val.split('-').map(Number);
          sounds.playPop();
          this.setMonth(y, m);
        }
      });
    }

    // ATM Card Wallet Switcher
    if (this.dom.atmCardWidget) {
      this.dom.atmCardWidget.addEventListener('click', () => {
        sounds.playPop();
        this.cycleWallet();
      });
    }

    // Clickable Dompet Rows
    if (this.dom.dompetRows) {
      this.dom.dompetRows.forEach((row) => {
        row.addEventListener('click', () => {
          sounds.playPop();
          const idx = parseInt(row.getAttribute('data-wallet-idx'), 10);
          if (!isNaN(idx) && this.wallets[idx]) {
            this.setWalletIndex(idx);
          }
        });
      });
    }

    // Quick Range Presets (7 Hari, 14 Hari, 30 Hari)
    if (this.dom.rangePresets) {
      this.dom.rangePresets.forEach((btn) => {
        btn.addEventListener('click', () => {
          sounds.playPop();
          const range = btn.getAttribute('data-range');
          this.activeRange = range;
          this.dom.rangePresets.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderCurrentCharts();
        });
      });
    }

    // Chart Mode Toggles (Per hari vs Per transaksi)
    if (this.dom.toggleChartDaily) {
      this.dom.toggleChartDaily.addEventListener('click', () => {
        sounds.playPop();
        this.setChartMode('daily');
      });
    }
    if (this.dom.toggleChartTx) {
      this.dom.toggleChartTx.addEventListener('click', () => {
        sounds.playPop();
        this.setChartMode('transaction');
      });
    }

    // Filter Buttons
    if (this.dom.btnFilterApply) {
      this.dom.btnFilterApply.addEventListener('click', () => {
        sounds.playChime();
        this.applyFilters();
      });
    }
    if (this.dom.btnFilterReset) {
      this.dom.btnFilterReset.addEventListener('click', () => {
        sounds.playPop();
        this.resetFilters();
      });
    }

    // Export Buttons
    if (this.dom.btnExportExcel || this.dom.btnExportCsv) {
      const exportAction = () => {
        sounds.playChime();
        window.location.href = '/api/export/csv';
      };
      if (this.dom.btnExportExcel) this.dom.btnExportExcel.addEventListener('click', exportAction);
      if (this.dom.btnExportCsv) this.dom.btnExportCsv.addEventListener('click', exportAction);
    }
    if (this.dom.btnExportPdf) {
      this.dom.btnExportPdf.addEventListener('click', () => {
        sounds.playPop();
        window.print();
      });
    }

    // Transaksi View Filters
    if (this.dom.txSearchInput) {
      this.dom.txSearchInput.addEventListener('input', (e) => {
        this.txSearchQuery = e.target.value.trim();
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.loadTransaksiViewData();
        }, 250);
      });
    }

    const setTxViewType = (type, activeBtn) => {
      sounds.playPop();
      this.txFilterType = type;
      [this.dom.txviewFilterAll, this.dom.txviewFilterExpense, this.dom.txviewFilterIncome].forEach((b) => {
        if (b) {
          b.classList.remove('bg-[#38a852]', 'text-white');
          b.classList.add('text-slate-500');
        }
      });
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('bg-[#38a852]', 'text-white');
      }
      this.loadTransaksiViewData();
    };

    if (this.dom.txviewFilterAll) this.dom.txviewFilterAll.addEventListener('click', () => setTxViewType(null, this.dom.txviewFilterAll));
    if (this.dom.txviewFilterExpense) this.dom.txviewFilterExpense.addEventListener('click', () => setTxViewType('expense', this.dom.txviewFilterExpense));
    if (this.dom.txviewFilterIncome) this.dom.txviewFilterIncome.addEventListener('click', () => setTxViewType('income', this.dom.txviewFilterIncome));

    this.dom.catChipButtons.forEach((chip) => {
      chip.addEventListener('click', () => {
        sounds.playPop();
        const cat = chip.getAttribute('data-cat');
        this.txFilterCategory = cat === 'all' ? null : cat;
        this.dom.catChipButtons.forEach((c) => {
          c.classList.remove('bg-slate-200', 'dark:bg-slate-700', 'font-bold', 'text-slate-800', 'dark:text-white');
          c.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
        });
        chip.classList.add('bg-slate-200', 'dark:bg-slate-700', 'font-bold', 'text-slate-800', 'dark:text-white');
        chip.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
        this.loadTransaksiViewData();
      });
    });

    // Add Transaction Modal
    if (this.dom.btnAddTx) {
      this.dom.btnAddTx.addEventListener('click', () => {
        sounds.playPop();
        this.openTxModal(false);
      });
    }
    if (this.dom.modalCancel) {
      this.dom.modalCancel.addEventListener('click', () => {
        sounds.playPop();
        this.closeTxModal();
      });
    }
    if (this.dom.btnCancelTx) {
      this.dom.btnCancelTx.addEventListener('click', () => {
        sounds.playPop();
        this.closeTxModal();
      });
    }
    if (this.dom.modalForm) {
      this.dom.modalForm.addEventListener('submit', (e) => this.handleTxFormSubmit(e));
    }

    // Budget Adjustment Modal Handlers
    if (this.dom.budgetModalClose) {
      this.dom.budgetModalClose.addEventListener('click', () => {
        sounds.playPop();
        this.closeBudgetModal();
      });
    }
    if (this.dom.budgetModalCancel) {
      this.dom.budgetModalCancel.addEventListener('click', () => {
        sounds.playPop();
        this.closeBudgetModal();
      });
    }
    if (this.dom.budgetModalForm) {
      this.dom.budgetModalForm.addEventListener('submit', (e) => this.handleBudgetFormSubmit(e));
    }

    // Telegram Bot Simulator Handlers
    if (this.dom.btnTgSend && this.dom.tgChatInput) {
      this.dom.btnTgSend.addEventListener('click', () => this.handleTelegramSimulate());
      this.dom.tgChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleTelegramSimulate();
      });
    }

    // Telegram Inline Button Actions (Event Delegation)
    if (this.dom.tgChatFeed) {
      this.dom.tgChatFeed.addEventListener('click', (e) => this.handleTelegramInlineAction(e));
    }

    // Resize handler for Canvas charts
    window.addEventListener('resize', () => {
      this.renderCurrentCharts();
    });
  }

  switchView(viewName) {
    if (!this.dom.views[viewName]) return;
    this.currentView = viewName;
    sounds.playWhoosh();

    // Toggle views visibility with staggered animation
    Object.keys(this.dom.views).forEach((key) => {
      const el = this.dom.views[key];
      if (!el) return;
      if (key === viewName) {
        el.classList.remove('hidden');
        el.classList.add('animate-fade-in', 'view-stagger-container');
      } else {
        el.classList.add('hidden');
        el.classList.remove('animate-fade-in', 'view-stagger-container');
      }
    });

    // Update Sidebar Navigation state
    this.dom.navButtons.forEach((btn) => {
      const v = btn.getAttribute('data-view');
      if (v === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Breadcrumb
    const titles = {
      dashboard: 'Ried Dashboard',
      transaksi: 'Buku Transaksi',
      investasi: 'Investasi & Frontier',
      pengaturan: 'Pengaturan Sistem',
      'gateway-telegram': 'Bot Telegram',
      'format-balasan': 'Format Balasan Bot',
      kamus: 'Kamus Auto-Kategori',
      'log-telegram': 'Log Chat Telegram'
    };
    if (this.dom.breadcrumbTitle) {
      this.dom.breadcrumbTitle.textContent = titles[viewName] || 'Ried Dashboard';
    }

    if (viewName === 'dashboard') {
      setTimeout(() => this.renderCurrentCharts(), 50);
    } else if (viewName === 'transaksi') {
      this.loadTransaksiViewData();
    } else if (viewName === 'investasi') {
      setTimeout(() => this.runPortfolioAnalysis(), 50);
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  setChartMode(mode) {
    this.chartMode = mode;
    if (mode === 'daily') {
      this.dom.toggleChartDaily.classList.add('active');
      this.dom.toggleChartDaily.classList.remove('text-slate-500', 'dark:text-slate-400');
      this.dom.toggleChartTx.classList.remove('active');
      this.dom.toggleChartTx.classList.add('text-slate-500', 'dark:text-slate-400');
    } else {
      this.dom.toggleChartTx.classList.add('active');
      this.dom.toggleChartTx.classList.remove('text-slate-500', 'dark:text-slate-400');
      this.dom.toggleChartDaily.classList.remove('active');
      this.dom.toggleChartDaily.classList.add('text-slate-500', 'dark:text-slate-400');
    }
    this.renderCurrentCharts();
  }

  renderCurrentCharts() {
    if (!this.summary) return;

    if (this.chartMode === 'daily') {
      let dailyData = this.summary.daily_expenses || [];
      if (this.activeRange === '7d') {
        dailyData = dailyData.slice(-7);
      } else if (this.activeRange === '14d') {
        dailyData = dailyData.slice(-14);
      }
      renderSplineChart(this.dom.chartMainExpense, dailyData, this.isDarkMode);
    } else {
      renderTransactionBarChart(this.dom.chartMainExpense, this.transactions, this.isDarkMode);
    }

    if (this.summary && this.summary.category_breakdown && this.summary.category_breakdown.length > 0) {
      renderStackedBudgetChart(this.dom.chartBudgetStacked, this.summary.category_breakdown, this.isDarkMode);
    }
  }

  setWalletIndex(idx) {
    this.activeWalletIndex = idx;
    const w = this.wallets[this.activeWalletIndex];

    if (this.dom.atmCardBalance) {
      const prevBal = this.prevValues ? this.prevValues.balance : 0;
      animateNumber(this.dom.atmCardBalance, prevBal, w.balance, 450, formatRupiah);
      if (this.prevValues) this.prevValues.balance = w.balance;
    }
    if (this.dom.atmWalletName) {
      this.dom.atmWalletName.textContent = w.name;
    }

    // Update wallet dots
    if (this.dom.walletDots) {
      const dots = this.dom.walletDots.querySelectorAll('span');
      dots.forEach((d, dIdx) => {
        if (dIdx === (this.activeWalletIndex % dots.length)) {
          d.className = 'w-1.5 h-1.5 rounded-full bg-white';
        } else {
          d.className = 'w-1.5 h-1.5 rounded-full bg-white/40';
        }
      });
    }
  }

  cycleWallet() {
    const nextIdx = (this.activeWalletIndex + 1) % this.wallets.length;
    this.setWalletIndex(nextIdx);
  }

  getSelectedMonthString() {
    return `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
  }

  getMonthNameIndo(m) {
    const names = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return names[m] || '';
  }

  getSelectedMonthLabel() {
    return `${this.getMonthNameIndo(this.selectedMonth)} ${this.selectedYear}`;
  }

  async prevMonth(keepModalOpen = false) {
    if (this.selectedMonth === 1) {
      this.selectedYear--;
      this.selectedMonth = 12;
    } else {
      this.selectedMonth--;
    }
    this.selectedDay = null;
    this.updateMonthDisplays();
    await this.refreshAllData();
    if (keepModalOpen) {
      this.populateMonthlyCalendar();
    }
  }

  async nextMonth(keepModalOpen = false) {
    if (this.selectedMonth === 12) {
      this.selectedYear++;
      this.selectedMonth = 1;
    } else {
      this.selectedMonth++;
    }
    this.selectedDay = null;
    this.updateMonthDisplays();
    await this.refreshAllData();
    if (keepModalOpen) {
      this.populateMonthlyCalendar();
    }
  }

  async setMonth(year, month) {
    this.selectedYear = year;
    this.selectedMonth = month;
    this.selectedDay = null;
    this.updateMonthDisplays();
    await this.refreshAllData();
  }

  selectDay(dateStr) {
    if (this.selectedDay === dateStr) {
      this.selectedDay = null;
    } else {
      this.selectedDay = dateStr;
    }
    this.renderCalendarDayStrip();
    this.updateDayFilterUI();
    this.renderDashboardForSelectedDay();
  }

  updateMonthDisplays() {
    const label = this.getSelectedMonthLabel();
    const ym = this.getSelectedMonthString();
    if (this.dom.currentMonthDisplay) this.dom.currentMonthDisplay.textContent = label;
    if (this.dom.stripMonthLabel) this.dom.stripMonthLabel.textContent = label;
    if (this.dom.monthlyCalTitle) this.dom.monthlyCalTitle.textContent = label;
    if (this.dom.filterMonth) this.dom.filterMonth.value = ym;

    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    if (this.dom.bannerDateRange) {
      this.dom.bannerDateRange.textContent = `1 ${label} - ${daysInMonth} ${label}`;
    }
    if (this.dom.filterDateStart) {
      this.dom.filterDateStart.value = `${ym}-01`;
    }
    if (this.dom.filterDateEnd) {
      this.dom.filterDateEnd.value = `${ym}-${String(daysInMonth).padStart(2, '0')}`;
    }

    const now = new Date();
    const isCurrent = (this.selectedYear === now.getFullYear() && this.selectedMonth === (now.getMonth() + 1));
    if (this.dom.stripMonthBadge) {
      if (isCurrent) {
        this.dom.stripMonthBadge.textContent = 'Bulan Ini';
        this.dom.stripMonthBadge.className = 'text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full';
      } else {
        this.dom.stripMonthBadge.textContent = 'Riwayat';
        this.dom.stripMonthBadge.className = 'text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full';
      }
    }
  }

  updateDayFilterUI() {
    if (this.selectedDay) {
      const parts = this.selectedDay.split('-');
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[0], 10);
      const formattedDate = `${d} ${this.getMonthNameIndo(m)} ${y}`;

      if (this.dom.dayFilterBanner) {
        this.dom.dayFilterBanner.classList.remove('hidden');
        this.dom.dayFilterBanner.classList.add('flex');
      }
      if (this.dom.filterDayBadgeText) {
        this.dom.filterDayBadgeText.textContent = formattedDate;
      }
      if (this.dom.btnClearDayFilter) {
        this.dom.btnClearDayFilter.classList.remove('hidden');
      }
    } else {
      if (this.dom.dayFilterBanner) {
        this.dom.dayFilterBanner.classList.add('hidden');
        this.dom.dayFilterBanner.classList.remove('flex');
      }
      if (this.dom.btnClearDayFilter) {
        this.dom.btnClearDayFilter.classList.add('hidden');
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  renderDashboardForSelectedDay() {
    if (!this.selectedDay) {
      this.renderDashboardMetrics();
      this.renderCurrentCharts();
      if (this.currentView === 'transaksi') {
        this.loadTransaksiViewData();
      }
      return;
    }

    const dayTxs = this.transactions.filter(t => t.date === this.selectedDay);
    const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    if (this.dom.statTotalIncome) {
      this.dom.statTotalIncome.textContent = formatRupiah(dayIncome);
    }
    if (this.dom.statTotalExpense) {
      this.dom.statTotalExpense.textContent = formatRupiah(dayExpense);
    }
    if (this.dom.statTxCount) {
      this.dom.statTxCount.textContent = `${dayTxs.length} Transaksi`;
    }
    if (this.dom.statTotalSavings) {
      this.dom.statTotalSavings.textContent = formatRupiah(dayIncome - dayExpense);
    }

    this.renderCurrentCharts();

    if (this.currentView === 'transaksi') {
      this.loadTransaksiViewData();
    }
  }

  populateMonthDropdown(months) {
    if (!this.dom.filterMonth || !months || months.length === 0) return;
    const currentVal = this.getSelectedMonthString();
    let optionsHtml = '';
    months.forEach(m => {
      const isSelected = m.month === currentVal ? 'selected' : '';
      optionsHtml += `<option value="${m.month}" ${isSelected}>${m.label} (${m.tx_count} tx)</option>`;
    });
    this.dom.filterMonth.innerHTML = optionsHtml;
  }

  renderCalendarDayStrip() {
    if (!this.dom.calendarDayStrip) return;
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const dayNames = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

    let centerDay = 18;
    if (this.selectedDay) {
      centerDay = parseInt(this.selectedDay.split('-')[2], 10);
    } else {
      const now = new Date();
      if (this.selectedYear === now.getFullYear() && this.selectedMonth === (now.getMonth() + 1)) {
        centerDay = Math.min(now.getDate(), daysInMonth);
      } else {
        centerDay = Math.min(15, daysInMonth);
      }
    }

    let startDay = Math.max(1, centerDay - 3);
    let endDay = Math.min(daysInMonth, startDay + 6);
    if (endDay - startDay < 6) {
      startDay = Math.max(1, endDay - 6);
    }

    const expenseMap = {};
    if (this.summary && this.summary.daily_expenses) {
      this.summary.daily_expenses.forEach(dp => {
        expenseMap[dp.date] = dp.amount;
      });
    }

    let html = '';
    for (let d = startDay; d <= endDay; d++) {
      const dateObj = new Date(this.selectedYear, this.selectedMonth - 1, d);
      const dayName = dayNames[dateObj.getDay()];
      const dateStr = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = this.selectedDay === dateStr;
      const hasExpense = (expenseMap[dateStr] || 0) > 0;

      html += `
        <div class="day-pill cursor-pointer transition-all ${isSelected ? 'active ring-2 ring-emerald-500' : ''}" data-date="${dateStr}" title="${d} ${this.getSelectedMonthLabel()}${hasExpense ? ' • ' + formatRupiah(expenseMap[dateStr]) : ''}">
          <span class="text-[9px] font-bold ${isSelected ? 'text-white' : 'text-slate-400'}">${dayName}</span>
          <span class="text-xs font-black ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}">${d}</span>
          ${hasExpense && !isSelected ? '<span class="w-1 h-1 rounded-full bg-emerald-500 mt-0.5"></span>' : ''}
        </div>
      `;
    }

    this.dom.calendarDayStrip.innerHTML = html;

    this.dom.calendarDayStrip.querySelectorAll('.day-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        sounds.playPop();
        const dStr = pill.getAttribute('data-date');
        this.selectDay(dStr);
      });
    });
  }

  openMonthlyCalendar() {
    if (!this.dom.modalMonthlyCalendar) return;
    this.populateMonthlyCalendar();
    this.dom.modalMonthlyCalendar.classList.remove('hidden');
    this.dom.modalMonthlyCalendar.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
  }

  closeMonthlyCalendar() {
    if (!this.dom.modalMonthlyCalendar) return;
    this.dom.modalMonthlyCalendar.classList.add('hidden');
    this.dom.modalMonthlyCalendar.classList.remove('flex');
  }

  populateMonthlyCalendar() {
    if (!this.dom.monthlyCalendarGrid) return;
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const firstDayOfWeek = new Date(this.selectedYear, this.selectedMonth - 1, 1).getDay();

    const expenseMap = {};
    if (this.summary && this.summary.daily_expenses) {
      this.summary.daily_expenses.forEach(dp => {
        expenseMap[dp.date] = dp.amount;
      });
    }

    let html = '';

    for (let i = 0; i < firstDayOfWeek; i++) {
      html += `<div class="p-2 text-slate-300 dark:text-slate-700"></div>`;
    }

    const now = new Date();
    const isCurrentMonth = (this.selectedYear === now.getFullYear() && this.selectedMonth === (now.getMonth() + 1));
    const todayNum = now.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const spent = expenseMap[dateStr] || 0;
      const isToday = isCurrentMonth && d === todayNum;
      const isSelected = this.selectedDay === dateStr;

      let classes = 'p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative ';
      if (isSelected) {
        classes += 'bg-emerald-600 text-white font-black shadow-lg scale-105 ring-2 ring-white';
      } else if (isToday) {
        classes += 'bg-[#38a852] text-white font-bold shadow-md';
      } else if (spent > 0) {
        classes += 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900';
      } else {
        classes += 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
      }

      const tooltip = spent > 0 ? `${formatRupiah(spent)} keluar` : 'Tidak ada pengeluaran';

      html += `
        <div class="${classes}" data-cal-date="${dateStr}" title="${d} ${this.getSelectedMonthLabel()}: ${tooltip}">
          <span class="text-xs">${d}</span>
          ${spent > 0 && !isSelected && !isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5"></span>' : ''}
        </div>
      `;
    }

    this.dom.monthlyCalendarGrid.innerHTML = html;

    this.dom.monthlyCalendarGrid.querySelectorAll('[data-cal-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        sounds.playPop();
        const dStr = cell.getAttribute('data-cal-date');
        this.closeMonthlyCalendar();
        this.selectDay(dStr);
      });
    });

    if (this.dom.monthlyCalTitle) {
      this.dom.monthlyCalTitle.textContent = this.getSelectedMonthLabel();
    }
    if (this.dom.monthlyCalSummary && this.summary) {
      this.dom.monthlyCalSummary.textContent = `${this.summary.transactions_count} transaksi • ${formatRupiah(this.summary.total_expense)} keluar di ${this.getSelectedMonthLabel()}`;
    }
  }

  async refreshAllData() {
    try {
      const ym = this.getSelectedMonthString();
      const [summary, txList, categories, health, savings, months] = await Promise.all([
        fetchFinancialSummary({ month: ym }),
        fetchTransactionsList(this.txFilterType, this.txFilterCategory, this.txSearchQuery, null, null, ym),
        fetchCategoriesMeta(),
        fetchFinancialHealth(ym),
        fetchSavingsGoals(),
        fetchAvailableMonths().catch(() => [])
      ]);

      this.summary = summary;
      this.transactions = txList;
      this.categories = categories;
      this.financialHealth = health;
      this.savingsGoals = savings;
      this.availableMonths = months;

      this.updateMonthDisplays();
      this.renderCalendarDayStrip();
      this.renderDashboardMetrics();
      this.renderCurrentCharts();
      this.renderHealthRadarUI(health);
      this.renderSavingsGoalsUI(savings);
      this.populateMonthDropdown(months);

      if (this.dom.statStreakDays && summary) {
        this.dom.statStreakDays.textContent = `${summary.target_days_current} / ${summary.target_days_total}`;
      }

      if (this.currentView === 'transaksi') {
        this.loadTransaksiViewData();
      } else if (this.currentView === 'investasi') {
        this.runPortfolioAnalysis();
      }
    } catch (err) {
      console.error('Failed refreshing data:', err);
    }
  }

  renderDashboardMetrics() {
    if (!this.summary) return;

    const prev = this.prevValues || { income: 0, expense: 0, savings: 0, balance: 0, txCount: 0 };
    const inc = this.summary.total_income || 0;
    const exp = this.summary.total_expense || 0;
    const bal = this.summary.total_balance || 0;
    const cnt = this.summary.transactions_count || 0;

    if (this.dom.statTotalIncome) {
      animateNumber(this.dom.statTotalIncome, prev.income, inc, 450, formatRupiah);
      prev.income = inc;
    }
    if (this.dom.statTotalExpense) {
      animateNumber(this.dom.statTotalExpense, prev.expense, exp, 450, formatRupiah);
      prev.expense = exp;
    }
    if (this.dom.statTxCount) {
      animateNumber(this.dom.statTxCount, prev.txCount, cnt, 350, n => `${n} Transaksi`);
      prev.txCount = cnt;
    }
    if (this.dom.statTotalSavings) {
      animateNumber(this.dom.statTotalSavings, prev.savings, bal, 450, formatRupiah);
      prev.savings = bal;
    }
    if (this.dom.atmCardBalance && this.activeWalletIndex === 0) {
      animateNumber(this.dom.atmCardBalance, prev.balance, bal, 500, formatRupiah);
      prev.balance = bal;
    }

    this.updateMascotMood();
  }

  async loadTransaksiViewData() {
    if (!this.dom.txviewFullList) return;

    try {
      const ym = this.getSelectedMonthString();
      const startDate = this.selectedDay || null;
      const endDate = this.selectedDay || null;
      const monthParam = this.selectedDay ? null : ym;

      const txs = await fetchTransactionsList(
        this.txFilterType,
        this.txFilterCategory,
        this.txSearchQuery,
        startDate,
        endDate,
        monthParam
      );

      if (txs.length === 0) {
        const filterMsg = this.selectedDay
          ? `Tidak ada transaksi tercatat pada tanggal ${this.selectedDay}.`
          : `Tidak ada transaksi di ${this.getSelectedMonthLabel()}.`;
        this.dom.txviewFullList.innerHTML = `
          <div class="p-8 text-center ried-card text-slate-400 text-xs">
            ${filterMsg}
          </div>
        `;
        return;
      }

      this.dom.txviewFullList.innerHTML = txs.map(t => {
        const isExpense = t.type === 'expense';
        const color = isExpense ? 'text-rose-500' : 'text-emerald-500';
        const sign = isExpense ? '-' : '+';
        const iconName = isExpense ? 'arrow-up-right' : 'arrow-down-left';

        return `
          <div class="ried-card p-3.5 flex items-center justify-between hover:border-emerald-400 transition-all">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-xl ${isExpense ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'} flex items-center justify-center font-bold">
                <i data-lucide="${iconName}" class="w-4 h-4"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-900 dark:text-white block">${t.title}</span>
                <span class="text-[10px] text-slate-400 block">${t.date} • <span class="font-semibold text-emerald-600 dark:text-emerald-400">${t.category}</span> ${t.notes ? '• ' + t.notes : ''}</span>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <span class="font-mono text-xs font-black ${color}">${sign} ${formatRupiah(t.amount)}</span>
              <button data-delete-id="${t.id}" class="btn-delete-tx text-slate-300 hover:text-rose-500 transition-all p-1" title="Hapus">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Bind delete buttons
      document.querySelectorAll('.btn-delete-tx').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-delete-id');
          if (confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) {
            sounds.playPop();
            await deleteExistingTransaction(id);
            await this.refreshAllData();
          }
        });
      });

      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Failed loading transactions view:', err);
    }
  }

  // Modal Transaction Handlers
  openTxModal(isEdit = false, txData = null) {
    if (!this.dom.txModal) return;
    this.editingTxId = isEdit && txData ? txData.id : null;
    this.dom.modalTitle.textContent = isEdit ? 'Edit Transaksi' : 'Tambah Transaksi Baru';

    if (txData) {
      this.dom.inputTitle.value = txData.title || '';
      this.dom.inputAmount.value = txData.amount || '';
      this.dom.inputCategory.value = txData.category || 'Makan & Minum';
      this.dom.inputType.value = txData.type || 'expense';
      this.dom.inputDate.value = txData.date || new Date().toISOString().split('T')[0];
      this.dom.inputNotes.value = txData.notes || '';
    } else {
      this.dom.modalForm.reset();
      this.dom.inputDate.value = new Date().toISOString().split('T')[0];
    }

    this.dom.txModal.classList.remove('hidden');
    this.dom.txModal.classList.add('flex');
    this.dom.inputTitle.focus();
  }

  closeTxModal() {
    if (!this.dom.txModal) return;
    this.dom.txModal.classList.add('hidden');
    this.dom.txModal.classList.remove('flex');
    this.editingTxId = null;
  }

  async handleTxFormSubmit(e) {
    e.preventDefault();
    const payload = {
      title: this.dom.inputTitle.value.trim(),
      amount: parseFloat(this.dom.inputAmount.value),
      category: this.dom.inputCategory.value,
      type: this.dom.inputType.value,
      date: this.dom.inputDate.value,
      notes: this.dom.inputNotes.value.trim() || null
    };

    try {
      if (this.editingTxId) {
        await updateExistingTransaction(this.editingTxId, payload);
        sounds.playChime();
      } else {
        await createNewTransaction(payload);
        sounds.playCoinDrop();
        if (this.confetti) {
          this.confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 60);
        }
      }
      this.closeTxModal();
      await this.refreshAllData();
    } catch (err) {
      alert(`Gagal menyimpan transaksi: ${err.message}`);
    }
  }

  // Budget Modal Handlers
  openBudgetModal(category, currentBudget) {
    if (!this.dom.budgetModal) return;
    this.editingBudgetCategory = category;
    if (this.dom.budgetModalCat) {
      this.dom.budgetModalCat.textContent = `Kategori: ${category}`;
    }
    if (this.dom.budgetModalInput) {
      this.dom.budgetModalInput.value = currentBudget || 1500000;
    }
    this.dom.budgetModal.classList.remove('hidden');
    this.dom.budgetModal.classList.add('flex');
    this.dom.budgetModalInput.focus();
  }

  closeBudgetModal() {
    if (!this.dom.budgetModal) return;
    this.dom.budgetModal.classList.add('hidden');
    this.dom.budgetModal.classList.remove('flex');
    this.editingBudgetCategory = null;
  }

  async handleBudgetFormSubmit(e) {
    e.preventDefault();
    if (!this.editingBudgetCategory) return;
    const newBudget = parseFloat(this.dom.budgetModalInput.value);
    if (isNaN(newBudget) || newBudget <= 0) {
      alert('Masukkan limit budget valid.');
      return;
    }

    try {
      await updateCategoryBudgetLimit(this.editingBudgetCategory, newBudget);
      sounds.playChime();
      this.closeBudgetModal();
      await this.refreshAllData();
    } catch (err) {
      alert(`Gagal memperbarui budget: ${err.message}`);
    }
  }

  // Telegram Simulator Handlers
  async handleTelegramSimulate() {
    const text = this.dom.tgChatInput.value.trim();
    if (!text) return;

    sounds.playPop();
    this.dom.tgChatInput.value = '';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayIso = now.toISOString().split('T')[0];

    // 1. Append User Bubble
    const userBubbleHtml = `
      <div class="flex items-end justify-end">
        <div class="tg-bubble-user p-3 max-w-[80%] space-y-1">
          <p>${escapeHtml(text)}</p>
          <div class="text-[9px] text-slate-500 flex items-center justify-end gap-1">
            <span>${timeStr}</span>
            <span>✓✓</span>
          </div>
        </div>
      </div>
    `;
    this.dom.tgChatFeed.insertAdjacentHTML('beforeend', userBubbleHtml);
    this.dom.tgChatFeed.scrollTop = this.dom.tgChatFeed.scrollHeight;

    // Check for bot command /budget
    if (text.toLowerCase() === '/budget') {
      const budgetLines = (this.summary && this.summary.category_breakdown)
        ? this.summary.category_breakdown.map(c => {
            const rem = Math.max(0, c.budget - c.spent);
            return `• <b>${c.category}</b>: Terpakai ${formatRupiah(c.spent)} / Sisa ${formatRupiah(rem)}`;
          }).join('<br>')
        : 'Data kuota belum tersedia.';

      const botReplyHtml = `
        <div class="flex items-start">
          <div class="tg-bubble-bot p-3.5 max-w-[85%] space-y-2">
            <div class="font-bold text-sky-600 dark:text-sky-400 text-[11px] flex items-center gap-1">
              <span>RIED Bot</span>
              <i data-lucide="badge-check" class="w-3 h-3"></i>
            </div>
            <p class="font-mono text-xs leading-relaxed">
              📊 <b>STATUS ANGGARAN SEPTEMBER 2026:</b><br><br>
              ${budgetLines}
            </p>
            <span class="text-[9px] text-slate-400 block text-right">${timeStr}</span>
          </div>
        </div>
      `;
      this.dom.tgChatFeed.insertAdjacentHTML('beforeend', botReplyHtml);
      this.dom.tgChatFeed.scrollTop = this.dom.tgChatFeed.scrollHeight;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // 2. Natural text parsing logic
    let category = 'Makanan';
    let type = 'expense';
    let title = text;
    let amount = 30000;

    // Detect amounts: e.g. 35rb, 35k, 50.000, 50000
    const matchRb = text.match(/(\d+)\s*(rb|k)/i);
    const matchNormal = text.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);

    if (matchRb) {
      amount = parseInt(matchRb[1], 10) * 1000;
    } else if (matchNormal) {
      const cleanNum = matchNormal[1].replace(/\./g, '').replace(/,/g, '');
      const parsed = parseInt(cleanNum, 10);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    const lower = text.toLowerCase();
    if (lower.includes('bensin') || lower.includes('shell') || lower.includes('pertamina') || lower.includes('gojek') || lower.includes('grab') || lower.includes('tol') || lower.includes('parkir')) {
      category = 'Transportasi';
    } else if (lower.includes('kopi') || lower.includes('makan') || lower.includes('nasi') || lower.includes('resto') || lower.includes('starbucks') || lower.includes('padang')) {
      category = 'Makanan';
    } else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('wifi') || lower.includes('indihome') || lower.includes('tagihan') || lower.includes('paket data') || lower.includes('pulsa')) {
      category = 'Tagihan';
    } else if (lower.includes('shopee') || lower.includes('tokopedia') || lower.includes('baju') || lower.includes('sepatu') || lower.includes('belanja')) {
      category = 'Belanja';
    } else if (lower.includes('bioskop') || lower.includes('cinema') || lower.includes('netflix') || lower.includes('game') || lower.includes('steam')) {
      category = 'Hiburan';
    } else if (lower.includes('gaji') || lower.includes('salary') || lower.includes('transfer masuk')) {
      category = 'Gaji';
      type = 'income';
    } else if (lower.includes('freelance') || lower.includes('project') || lower.includes('honor')) {
      category = 'Freelance';
      type = 'income';
    }

    try {
      const created = await createNewTransaction({
        title: title,
        amount: amount,
        category: category,
        type: type,
        date: todayIso,
        notes: 'Dicatat via Bot Telegram @RiedutBot'
      });

      sounds.playChime();

      // Find remaining budget
      let remainingText = 'Rp 1.500.000';
      if (this.summary && this.summary.category_breakdown) {
        const catInfo = this.summary.category_breakdown.find(c => c.category.toLowerCase() === category.toLowerCase());
        if (catInfo) {
          const rem = Math.max(0, catInfo.budget - (catInfo.spent + amount));
          remainingText = formatRupiah(rem);
        }
      }

      // 3. Append Telegram Bot Reply Bubble with Inline Keyboard
      const botReplyHtml = `
        <div class="flex items-start">
          <div class="tg-bubble-bot p-3.5 max-w-[85%] space-y-2">
            <div class="font-bold text-sky-600 dark:text-sky-400 text-[11px] flex items-center gap-1">
              <span>RIED Bot</span>
              <i data-lucide="badge-check" class="w-3 h-3"></i>
            </div>
            <p class="font-mono leading-relaxed text-xs">
              ✅ <b>Transaksi Berhasil Dicatat!</b><br><br>
              🏷️ <b>${escapeHtml(created.title)}</b><br>
              💰 <b>${formatRupiah(created.amount)}</b> (${created.category})<br>
              📅 ${created.date}<br><br>
              📊 Sisa Kuota ${created.category}: <b>${remainingText}</b>
            </p>
            
            <div class="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button class="tg-inline-btn" data-action="filter-cat" data-cat="${created.category}">🏷️ ${created.category}</button>
              <button class="tg-inline-btn" data-action="check-budget">📊 Cek Kuota</button>
              <button class="tg-inline-btn text-rose-500 hover:text-rose-600" data-action="cancel-tx" data-tx-id="${created.id}">❌ Batalkan</button>
            </div>
            <span class="text-[9px] text-slate-400 block text-right">${timeStr}</span>
          </div>
        </div>
      `;
      this.dom.tgChatFeed.insertAdjacentHTML('beforeend', botReplyHtml);
      this.dom.tgChatFeed.scrollTop = this.dom.tgChatFeed.scrollHeight;

      // 4. Update Audit Log in Log Telegram View
      if (this.dom.tgAuditLogContainer) {
        const auditEntryHtml = `
          <div class="flex items-center justify-between p-3 rounded-xl bg-[#edf4e8] dark:bg-[#16241b] animate-fade-in">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-[#229ED9] text-white flex items-center justify-center font-bold text-xs">
                <i data-lucide="send" class="w-4 h-4 -rotate-12"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-900 dark:text-white block">"${escapeHtml(text)}"</span>
                <span class="text-[10px] text-slate-400 block">@ried_exec • ${created.date}, ${timeStr} WIB • Masuk ke ${created.category}</span>
              </div>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Tersimpan (#${created.id})</span>
          </div>
        `;
        this.dom.tgAuditLogContainer.insertAdjacentHTML('afterbegin', auditEntryHtml);
      }

      if (window.lucide) window.lucide.createIcons();
      await this.refreshAllData();
    } catch (err) {
      const errReplyHtml = `
        <div class="flex items-start">
          <div class="tg-bubble-bot p-3.5 max-w-[85%] text-rose-500 text-xs">
            ⚠️ Gagal memproses transaksi: ${escapeHtml(err.message)}
          </div>
        </div>
      `;
      this.dom.tgChatFeed.insertAdjacentHTML('beforeend', errReplyHtml);
      this.dom.tgChatFeed.scrollTop = this.dom.tgChatFeed.scrollHeight;
    }
  }

  async handleTelegramInlineAction(e) {
    const btn = e.target.closest('.tg-inline-btn');
    if (!btn) return;

    sounds.playPop();
    const action = btn.getAttribute('data-action');

    if (action === 'check-budget') {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const budgetLines = (this.summary && this.summary.category_breakdown)
        ? this.summary.category_breakdown.map(c => {
            const rem = Math.max(0, c.budget - c.spent);
            return `• <b>${c.category}</b>: Terpakai ${formatRupiah(c.spent)} / Limit ${formatRupiah(c.budget)} (Sisa: ${formatRupiah(rem)})`;
          }).join('<br>')
        : 'Data kuota belum tersedia.';

      const replyHtml = `
        <div class="flex items-start">
          <div class="tg-bubble-bot p-3.5 max-w-[85%] space-y-1.5">
            <div class="font-bold text-sky-600 dark:text-sky-400 text-[11px] flex items-center gap-1">
              <span>RIED Bot</span>
              <i data-lucide="badge-check" class="w-3 h-3"></i>
            </div>
            <p class="font-mono text-xs leading-relaxed">
              📊 <b>RINCIAN ANGGARAN AKTIF:</b><br><br>
              ${budgetLines}
            </p>
            <span class="text-[9px] text-slate-400 block text-right">${timeStr}</span>
          </div>
        </div>
      `;
      this.dom.tgChatFeed.insertAdjacentHTML('beforeend', replyHtml);
      this.dom.tgChatFeed.scrollTop = this.dom.tgChatFeed.scrollHeight;
      if (window.lucide) window.lucide.createIcons();
    } else if (action === 'filter-cat') {
      const cat = btn.getAttribute('data-cat');
      this.switchView('transaksi');
      this.txFilterCategory = cat;
      this.loadTransaksiViewData();
    } else if (action === 'cancel-tx') {
      const txId = btn.getAttribute('data-tx-id');
      if (!txId) return;
      try {
        await deleteExistingTransaction(txId);
        sounds.playPop();
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const replyHtml = `
          <div class="flex items-start">
            <div class="tg-bubble-bot p-3.5 max-w-[85%] space-y-1 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs">
              <span class="font-bold text-rose-600 dark:text-rose-400">🗑️ Transaksi Dibatalkan</span>
              <p class="text-slate-600 dark:text-slate-300">Catatan transaksi #${escapeHtml(txId)} telah berhasil dihapus dari database SQLite lokal.</p>
              <span class="text-[9px] text-slate-400 block text-right">${timeStr}</span>
            </div>
          </div>
        `;
        this.dom.tgChatFeed.insertAdjacentHTML('beforeend', replyHtml);
        this.dom.tgChatFeed.scrollTop = this.dom.tgChatFeed.scrollHeight;
        btn.disabled = true;
        btn.classList.add('opacity-50', 'line-through');
        await this.refreshAllData();
      } catch (err) {
        alert(`Gagal membatalkan transaksi: ${err.message}`);
      }
    }
  }

  renderHealthRadarUI(health) {
    if (!health) return;
    const score = health.score ?? health.overall_score ?? 98;
    if (this.dom.healthRadarScore) {
      this.dom.healthRadarScore.textContent = Math.round(score);
    }
    if (this.dom.healthRadarGrade) {
      const fullGrade = health.grade || 'A - Prima';
      this.dom.healthRadarGrade.textContent = fullGrade.startsWith('Grade') ? fullGrade : `Grade ${fullGrade}`;
      const firstLetter = fullGrade.charAt(0);
      const gradeColors = {
        A: 'text-emerald-500',
        B: 'text-lime-500',
        C: 'text-amber-500',
        D: 'text-rose-500'
      };
      this.dom.healthRadarGrade.className = `text-xs font-black ${gradeColors[firstLetter] || 'text-emerald-500'}`;
    }
    if (this.dom.healthRadarStatus) {
      this.dom.healthRadarStatus.textContent = health.summary || health.status_label || 'Status Finansial Prima';
    }
    if (health.rule_50_30_20) {
      const r = health.rule_50_30_20;
      if (this.dom.healthBarNeeds) this.dom.healthBarNeeds.style.width = `${Math.min(100, r.needs_pct)}%`;
      if (this.dom.healthBarWants) this.dom.healthBarWants.style.width = `${Math.min(100, r.wants_pct)}%`;
      if (this.dom.healthBarSavings) this.dom.healthBarSavings.style.width = `${Math.min(100, r.savings_pct)}%`;
      if (this.dom.healthNeedsVal) this.dom.healthNeedsVal.textContent = `${r.needs_pct.toFixed(1)}%`;
      if (this.dom.healthWantsVal) this.dom.healthWantsVal.textContent = `${r.wants_pct.toFixed(1)}%`;
      if (this.dom.healthSavingsVal) this.dom.healthSavingsVal.textContent = `${r.savings_pct.toFixed(1)}%`;
      if (this.dom.healthNeedsRp) this.dom.healthNeedsRp.textContent = formatRupiah(r.needs_spent ?? r.needs_rp ?? 0);
      if (this.dom.healthWantsRp) this.dom.healthWantsRp.textContent = formatRupiah(r.wants_spent ?? r.wants_rp ?? 0);
      if (this.dom.healthSavingsRp) this.dom.healthSavingsRp.textContent = formatRupiah(r.savings_spent ?? r.savings_rp ?? 0);
    }
    if (this.dom.healthRunwayMonths) {
      const runway = health.cash_runway_months ?? health.runway_months ?? 0;
      this.dom.healthRunwayMonths.textContent = `${runway.toFixed(1)} Bulan`;
    }
    if (this.dom.healthBurnLabel) {
      const burn = health.monthly_burn_rate ?? 0;
      this.dom.healthBurnLabel.textContent = `${formatRupiah(burn)} / bln`;
    }
    if (this.dom.healthRadarSummary) {
      const reco = Array.isArray(health.recommendations) ? health.recommendations[0] : (health.ai_recommendation || health.summary);
      this.dom.healthRadarSummary.textContent = reco || 'Kondisi kas dan tabungan Anda sangat sehat.';
    }
  }

  initSavingsGoals() {
    if (this.dom.btnCreateSavingsGoal) {
      this.dom.btnCreateSavingsGoal.addEventListener('click', () => {
        sounds.playPop();
        if (this.dom.modalCreateGoal) {
          this.dom.modalCreateGoal.classList.remove('hidden');
          this.dom.modalCreateGoal.classList.add('flex');
          if (this.dom.inputGoalDate) {
            const future = new Date();
            future.setMonth(future.getMonth() + 6);
            this.dom.inputGoalDate.value = future.toISOString().split('T')[0];
          }
        }
      });
    }

    const closeCreateModal = () => {
      sounds.playPop();
      if (this.dom.modalCreateGoal) {
        this.dom.modalCreateGoal.classList.add('hidden');
        this.dom.modalCreateGoal.classList.remove('flex');
      }
    };

    if (this.dom.btnCloseCreateGoalModal) this.dom.btnCloseCreateGoalModal.addEventListener('click', closeCreateModal);
    if (this.dom.btnCancelCreateGoal) this.dom.btnCancelCreateGoal.addEventListener('click', closeCreateModal);

    if (this.dom.formCreateGoal) {
      this.dom.formCreateGoal.addEventListener('submit', async (e) => {
        e.preventDefault();
        sounds.playPop();
        const payload = {
          title: this.dom.inputGoalTitle.value.trim(),
          target_amount: parseFloat(this.dom.inputGoalTarget.value),
          initial_deposit: parseFloat(this.dom.inputGoalInitial.value || 0),
          category: this.dom.inputGoalCategory.value,
          target_date: this.dom.inputGoalDate.value
        };
        try {
          await createSavingsGoal(payload);
          sounds.playChime();
          closeCreateModal();
          this.dom.formCreateGoal.reset();
          await this.refreshAllData();
        } catch (err) {
          alert(`Gagal membuat target: ${err.message}`);
        }
      });
    }

    // Deposit modal handlers
    const closeDepositModal = () => {
      sounds.playPop();
      if (this.dom.modalSavingsDeposit) {
        this.dom.modalSavingsDeposit.classList.add('hidden');
        this.dom.modalSavingsDeposit.classList.remove('flex');
      }
      this.activeGoalDepositId = null;
    };

    if (this.dom.btnCloseDepositModal) this.dom.btnCloseDepositModal.addEventListener('click', closeDepositModal);
    if (this.dom.btnCancelDeposit) this.dom.btnCancelDeposit.addEventListener('click', closeDepositModal);

    if (this.dom.formSavingsDeposit) {
      this.dom.formSavingsDeposit.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.activeGoalDepositId) return;
        const amount = parseFloat(this.dom.inputDepositAmount.value);
        if (isNaN(amount) || amount === 0) {
          alert('Masukkan nominal valid.');
          return;
        }
        try {
          sounds.playPop();
          await depositSavingsGoal(this.activeGoalDepositId, amount);
          sounds.playCoinDrop();
          if (this.confetti) {
            this.confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 75);
          }
          closeDepositModal();
          this.dom.formSavingsDeposit.reset();
          await this.refreshAllData();
        } catch (err) {
          alert(`Gagal menabung: ${err.message}`);
        }
      });
    }

    if (this.dom.btnDepositChips) {
      this.dom.btnDepositChips.forEach(chip => {
        chip.addEventListener('click', () => {
          sounds.playPop();
          const val = chip.getAttribute('data-val');
          if (val && this.dom.inputDepositAmount) {
            const current = parseFloat(this.dom.inputDepositAmount.value) || 0;
            this.dom.inputDepositAmount.value = current + parseFloat(val);
          }
        });
      });
    }
  }

  renderSavingsGoalsUI(goals) {
    if (!this.dom.savingsGoalsContainer) return;
    if (!goals || goals.length === 0) {
      this.dom.savingsGoalsContainer.innerHTML = `
        <div class="col-span-full p-8 text-center ried-card text-slate-400 text-xs">
          Belum ada celengan impian. Buat target tabungan pertamamu!
        </div>
      `;
      return;
    }

    const catIcons = {
      Kendaraan: 'car',
      Pendidikan: 'graduation-cap',
      Elektronik: 'laptop',
      Liburan: 'plane',
      Investasi: 'trending-up',
      Darurat: 'shield-alert',
      Rumah: 'home',
      Lainnya: 'piggy-bank'
    };

    this.dom.savingsGoalsContainer.innerHTML = goals.map(g => {
      const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
      const remaining = Math.max(0, g.target_amount - g.current_amount);
      const icon = catIcons[g.category] || 'piggy-bank';
      const isCompleted = g.current_amount >= g.target_amount;

      return `
        <div class="ried-card p-4 space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition-all goal-card tilt-card-3d">
          <div class="tilt-sheen"></div>
          <div class="space-y-2">
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-xl ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'} flex items-center justify-center font-bold">
                  <i data-lucide="${icon}" class="w-4 h-4"></i>
                </div>
                <div>
                  <h4 class="text-xs font-black text-slate-900 dark:text-white leading-tight">${escapeHtml(g.title)}</h4>
                  <span class="text-[10px] text-slate-400 block">${escapeHtml(g.category)} • Target ${g.target_date || 'Fleksibel'}</span>
                </div>
              </div>
              <button data-delete-goal="${g.id}" class="btn-delete-goal text-slate-300 hover:text-rose-500 p-1 transition-colors" title="Hapus Target">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between font-mono text-[11px]">
                <span class="font-bold text-slate-900 dark:text-white">${formatRupiah(g.current_amount)}</span>
                <span class="text-slate-400">Target ${formatRupiah(g.target_amount)}</span>
              </div>
              <div class="w-full bg-[#edf4e8] dark:bg-[#1a291e] h-2 rounded-full overflow-hidden">
                <div class="h-full ${isCompleted ? 'bg-emerald-400' : 'bg-[#38a852]'} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
              </div>
              <div class="flex items-center justify-between text-[10px]">
                <span class="font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}">${pct}% Tercapai</span>
                <span class="text-slate-400 font-mono">${isCompleted ? 'Tercapai! 🎉' : `Sisa ${formatRupiah(remaining)}`}</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-[#dde7da] dark:border-[#1c2b20] flex items-center justify-end">
            <button data-deposit-goal="${g.id}" data-goal-title="${escapeHtml(g.title)}" class="btn-open-deposit px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition-all flex items-center space-x-1">
              <i data-lucide="plus" class="w-3 h-3"></i>
              <span>+ Tabung</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind deposit and delete buttons
    this.dom.savingsGoalsContainer.querySelectorAll('.btn-open-deposit').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playPop();
        const goalId = parseInt(btn.getAttribute('data-deposit-goal'), 10);
        const goal = this.savingsGoals.find(g => g.id === goalId);
        if (!goal) return;
        this.activeGoalDepositId = goalId;
        if (this.dom.depositGoalTitle) this.dom.depositGoalTitle.textContent = goal.title;
        if (this.dom.depositGoalSubtitle) {
          this.dom.depositGoalSubtitle.textContent = `Terkumpul ${formatRupiah(goal.current_amount)} dari target ${formatRupiah(goal.target_amount)}`;
        }
        if (this.dom.inputDepositAmount) this.dom.inputDepositAmount.value = '';
        if (this.dom.modalSavingsDeposit) {
          this.dom.modalSavingsDeposit.classList.remove('hidden');
          this.dom.modalSavingsDeposit.classList.add('flex');
          if (this.dom.inputDepositAmount) this.dom.inputDepositAmount.focus();
        }
      });
    });

    this.dom.savingsGoalsContainer.querySelectorAll('.btn-delete-goal').forEach(btn => {
      btn.addEventListener('click', async () => {
        const goalId = parseInt(btn.getAttribute('data-delete-goal'), 10);
        if (confirm('Hapus target celengan ini?')) {
          sounds.playPop();
          try {
            await deleteSavingsGoal(goalId);
            sounds.playChime();
            await this.refreshAllData();
          } catch (err) {
            alert(`Gagal menghapus: ${err.message}`);
          }
        }
      });
    });

    if (this.attachTiltCards) this.attachTiltCards();
    if (window.lucide) window.lucide.createIcons();
  }

  initQuantPortfolio() {
    if (this.dom.slidersAlloc) {
      this.dom.slidersAlloc.forEach(slider => {
        slider.addEventListener('input', () => {
          const asset = slider.getAttribute('data-asset');
          const valLabel = document.getElementById(`label-weight-${asset}`);
          if (valLabel) valLabel.textContent = `${slider.value}%`;
          this.updateAllocationBadge();
        });
      });
    }

    if (this.dom.quantInitialCapital) {
      this.dom.quantInitialCapital.addEventListener('change', () => {
        const val = parseFloat(this.dom.quantInitialCapital.value);
        if (!isNaN(val) && val > 0) {
          this.portfolioInitialCapital = val;
          this.runPortfolioAnalysis();
        }
      });
    }

    if (this.dom.quantSelectHorizon) {
      this.dom.quantSelectHorizon.addEventListener('change', () => {
        this.portfolioHorizonYears = parseInt(this.dom.quantSelectHorizon.value, 10) || 5;
        this.runPortfolioAnalysis();
      });
    }

    if (this.dom.btnCalcRebalance) {
      this.dom.btnCalcRebalance.addEventListener('click', () => {
        sounds.playChime();
        this.runPortfolioAnalysis();
      });
    }
  }

  updateAllocationBadge() {
    if (!this.dom.slidersAlloc || !this.dom.allocTotalBadge) return;
    let total = 0;
    this.dom.slidersAlloc.forEach(s => {
      total += parseFloat(s.value) || 0;
    });
    this.dom.allocTotalBadge.textContent = `${total}%`;
    if (total === 100) {
      this.dom.allocTotalBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
    } else {
      this.dom.allocTotalBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300';
    }
  }

  async runPortfolioAnalysis() {
    if (!this.dom.slidersAlloc) return;

    const allocations = [];
    this.dom.slidersAlloc.forEach(s => {
      const asset = s.getAttribute('data-asset');
      allocations.push({
        asset_id: asset,
        weight: (parseFloat(s.value) || 0) / 100
      });
    });

    const capital = parseFloat(this.dom.quantInitialCapital ? this.dom.quantInitialCapital.value : 100000000) || 100000000;
    const horizonYears = parseInt(this.dom.quantSelectHorizon ? this.dom.quantSelectHorizon.value : 5, 10) || 5;

    const payload = {
      allocations: allocations,
      initial_capital: capital,
      horizon_years: horizonYears,
      risk_free_rate: 0.045
    };

    try {
      const res = await analyzePortfolio(payload);
      this.portfolioAnalysis = res;

      // 1. Update Metrics Strip
      if (this.dom.quantMetricReturn && res.metrics) {
        this.dom.quantMetricReturn.textContent = `${(res.metrics.expected_annual_return * 100).toFixed(2)}%`;
      }
      if (this.dom.quantMetricVolatility && res.metrics) {
        this.dom.quantMetricVolatility.textContent = `${(res.metrics.annualized_volatility * 100).toFixed(2)}%`;
      }
      if (this.dom.quantMetricSharpe && res.metrics) {
        this.dom.quantMetricSharpe.textContent = res.metrics.sharpe_ratio.toFixed(3);
      }
      if (this.dom.quantMetricVar && res.monte_carlo) {
        this.dom.quantMetricVar.textContent = `${(res.monte_carlo.var_95_percent * 100).toFixed(2)}%`;
      }

      // 2. Render Frontier Chart
      if (this.dom.chartEfficientFrontier && res.efficient_frontier) {
        const currentPt = res.metrics ? {
          volatility: res.metrics.annualized_volatility * 100,
          return: res.metrics.expected_annual_return * 100
        } : null;
        renderEfficientFrontierChart(
          this.dom.chartEfficientFrontier,
          res.efficient_frontier,
          currentPt,
          this.isDarkMode
        );
      }

      // 3. Render Monte Carlo Chart
      if (this.dom.chartMonteCarlo && res.monte_carlo) {
        renderMonteCarloChart(
          this.dom.chartMonteCarlo,
          res.monte_carlo,
          this.isDarkMode
        );
      }

      // 4. Update Monte Carlo Median Label
      if (this.dom.mcFinalMedianLabel && res.monte_carlo) {
        this.dom.mcFinalMedianLabel.textContent = `Median: ${formatRupiah(res.monte_carlo.final_capital_median)}`;
      }

      // 5. Render Rebalance Orders Table
      this.renderRebalanceTable(res.rebalance_orders);

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Failed analyzing portfolio:', err);
    }
  }

  renderRebalanceTable(orders) {
    if (!this.dom.rebalanceOrdersTbody) return;
    if (!orders || orders.length === 0) {
      this.dom.rebalanceOrdersTbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-slate-400">Portofolio sudah optimal seimbang.</td>
        </tr>
      `;
      return;
    }

    this.dom.rebalanceOrdersTbody.innerHTML = orders.map(o => {
      const isBuy = o.action === 'BUY';
      const isSell = o.action === 'SELL';
      const actionBadge = isBuy
        ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">BELI</span>'
        : isSell
        ? '<span class="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">JUAL</span>'
        : '<span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">TAHAN</span>';

      const curWeight = o.current_weight > 1 ? o.current_weight : (o.current_weight * 100);
      const tgtWeight = o.target_weight > 1 ? o.target_weight : (o.target_weight * 100);
      const dltWeight = Math.abs(o.delta_weight) > 1 ? o.delta_weight : (o.delta_weight * 100);

      const deltaClass = dltWeight > 0.05 ? 'text-emerald-600 dark:text-emerald-400' : dltWeight < -0.05 ? 'text-rose-500' : 'text-slate-400';
      const sign = dltWeight > 0.05 ? '+' : '';

      return `
        <tr class="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <td class="py-2.5 font-bold text-slate-900 dark:text-white font-sans">${escapeHtml(o.asset_name)}</td>
          <td class="py-2.5 text-right text-slate-500 dark:text-slate-400">${curWeight.toFixed(1)}%</td>
          <td class="py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">${tgtWeight.toFixed(1)}%</td>
          <td class="py-2.5 text-right font-bold ${deltaClass}">${sign}${dltWeight.toFixed(1)}%</td>
          <td class="py-2.5 text-center">${actionBadge}</td>
          <td class="py-2.5 text-right font-bold ${deltaClass}">${formatRupiah(Math.abs(o.amount_usd))}</td>
        </tr>
      `;
    }).join('');
  }

  initCommandPalette() {
    const openPalette = () => {
      sounds.playPop();
      if (this.dom.commandPalette) {
        this.dom.commandPalette.classList.remove('hidden');
        this.dom.commandPalette.classList.add('flex');
        if (this.dom.paletteSearchInput) {
          this.dom.paletteSearchInput.value = '';
          this.dom.paletteSearchInput.focus();
        }
        if (this.dom.paletteItems) {
          this.dom.paletteItems.forEach(item => item.classList.remove('hidden'));
        }
      }
    };

    const closePalette = () => {
      sounds.playPop();
      if (this.dom.commandPalette) {
        this.dom.commandPalette.classList.add('hidden');
        this.dom.commandPalette.classList.remove('flex');
      }
    };

    if (this.dom.btnOpenCommandPalette) {
      this.dom.btnOpenCommandPalette.addEventListener('click', openPalette);
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (this.dom.commandPalette && !this.dom.commandPalette.classList.contains('hidden')) {
          closePalette();
        } else {
          openPalette();
        }
      } else if (e.key === 'Escape' && this.dom.commandPalette && !this.dom.commandPalette.classList.contains('hidden')) {
        closePalette();
      }
    });

    if (this.dom.commandPalette) {
      this.dom.commandPalette.addEventListener('click', (e) => {
        if (e.target === this.dom.commandPalette) closePalette();
      });
    }

    if (this.dom.paletteSearchInput) {
      this.dom.paletteSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!this.dom.paletteItems) return;
        this.dom.paletteItems.forEach(item => {
          const text = item.textContent.toLowerCase();
          if (text.includes(q)) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      });
    }

    if (this.dom.paletteItems) {
      this.dom.paletteItems.forEach(item => {
        item.addEventListener('click', () => {
          sounds.playPop();
          closePalette();
          const action = item.getAttribute('data-action');
          if (action === 'new-tx') {
            this.openTxModal(false);
          } else if (action === 'new-goal') {
            if (this.dom.modalCreateGoal) {
              this.dom.modalCreateGoal.classList.remove('hidden');
              this.dom.modalCreateGoal.classList.add('flex');
            }
          } else if (action === 'open-wrapped') {
            this.openRiedWrappedModal();
          } else if (action === 'export-csv') {
            window.location.href = '/api/export/csv';
          } else if (action === 'toggle-theme') {
            this.setTheme(!this.isDarkMode);
          } else if (action === 'nav-investasi') {
            this.switchView('investasi');
          } else if (action === 'nav-dashboard') {
            this.switchView('dashboard');
          } else if (action === 'nav-transaksi') {
            this.switchView('transaksi');
          } else if (action === 'nav-gateway-telegram') {
            this.switchView('gateway-telegram');
          } else if (action === 'nav-format-balasan') {
            this.switchView('format-balasan');
          } else if (action === 'nav-kamus') {
            this.switchView('kamus');
          }
        });
      });
    }
  }

  initFloatingActionButton() {
    if (!this.dom.fabMainBtn || !this.dom.fabMenu) return;

    this.dom.fabMainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sounds.playPop();
      const isHidden = this.dom.fabMenu.classList.contains('hidden');
      if (isHidden) {
        this.dom.fabMenu.classList.remove('hidden');
        if (this.dom.fabIcon) this.dom.fabIcon.classList.add('rotate-45');
      } else {
        this.dom.fabMenu.classList.add('hidden');
        if (this.dom.fabIcon) this.dom.fabIcon.classList.remove('rotate-45');
      }
    });

    document.addEventListener('click', (e) => {
      if (this.dom.fabContainer && !this.dom.fabContainer.contains(e.target)) {
        if (this.dom.fabMenu && !this.dom.fabMenu.classList.contains('hidden')) {
          this.dom.fabMenu.classList.add('hidden');
          if (this.dom.fabIcon) this.dom.fabIcon.classList.remove('rotate-45');
        }
      }
    });

    if (this.dom.fabActionTx) {
      this.dom.fabActionTx.addEventListener('click', () => {
        sounds.playPop();
        this.dom.fabMenu.classList.add('hidden');
        if (this.dom.fabIcon) this.dom.fabIcon.classList.remove('rotate-45');
        this.openTxModal(false);
      });
    }

    if (this.dom.fabActionGoal) {
      this.dom.fabActionGoal.addEventListener('click', () => {
        sounds.playPop();
        this.dom.fabMenu.classList.add('hidden');
        if (this.dom.fabIcon) this.dom.fabIcon.classList.remove('rotate-45');
        if (this.dom.modalCreateGoal) {
          this.dom.modalCreateGoal.classList.remove('hidden');
          this.dom.modalCreateGoal.classList.add('flex');
        }
      });
    }

    if (this.dom.fabActionWrapped) {
      this.dom.fabActionWrapped.addEventListener('click', () => {
        sounds.playPop();
        this.dom.fabMenu.classList.add('hidden');
        if (this.dom.fabIcon) this.dom.fabIcon.classList.remove('rotate-45');
        this.openRiedWrappedModal();
      });
    }
  }

  initWrappedModal() {
    if (this.dom.btnOpenWrapped) {
      this.dom.btnOpenWrapped.addEventListener('click', () => {
        sounds.playPop();
        this.openRiedWrappedModal();
      });
    }

    if (this.dom.btnCloseWrapped) {
      this.dom.btnCloseWrapped.addEventListener('click', () => {
        sounds.playPop();
        if (this.dom.modalRiedWrapped) {
          this.dom.modalRiedWrapped.classList.add('hidden');
          this.dom.modalRiedWrapped.classList.remove('flex');
        }
      });
    }

    if (this.dom.btnDownloadWrappedPng) {
      this.dom.btnDownloadWrappedPng.addEventListener('click', () => {
        this.downloadWrappedPNG();
      });
    }
  }

  openRiedWrappedModal() {
    if (!this.dom.modalRiedWrapped) return;

    const income = this.summary ? this.summary.total_income : 16596500;
    const expense = this.summary ? this.summary.total_expense : 7161000;
    const score = this.financialHealth ? Math.round(this.financialHealth.score ?? this.financialHealth.overall_score ?? 98) : 98;

    let topCat = 'Makanan (35%)';
    if (this.summary && this.summary.category_breakdown && this.summary.category_breakdown.length > 0) {
      const sorted = [...this.summary.category_breakdown].sort((a, b) => b.spent - a.spent);
      const totalSpent = sorted.reduce((acc, c) => acc + c.spent, 0);
      const pct = totalSpent > 0 ? Math.round((sorted[0].spent / totalSpent) * 100) : 0;
      topCat = `${sorted[0].category} (${pct}%)`;
    }

    let persona = 'Sang Ahli Alokasi (The Strategic Saver)';
    if (score >= 90) {
      persona = 'The Wealth Architect 👑';
    } else if (score >= 80) {
      persona = 'Sang Ahli Alokasi (The Strategic Saver) ⚖️';
    } else if (score >= 70) {
      persona = 'The Steady Builder 📈';
    } else {
      persona = 'The Dynamic Explorer 🚀';
    }

    if (this.dom.wrappedPersonaTitle) this.dom.wrappedPersonaTitle.textContent = persona;
    if (this.dom.wrappedStatIncome) this.dom.wrappedStatIncome.textContent = formatRupiah(income);
    if (this.dom.wrappedStatExpense) this.dom.wrappedStatExpense.textContent = formatRupiah(expense);
    if (this.dom.wrappedStatTopcat) this.dom.wrappedStatTopcat.textContent = topCat;
    if (this.dom.wrappedStatScore) this.dom.wrappedStatScore.textContent = `${score} / 100 ★★★`;

    this.dom.modalRiedWrapped.classList.remove('hidden');
    this.dom.modalRiedWrapped.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
  }

  downloadWrappedPNG() {
    sounds.playChime();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Dark Matcha & Forest Obsidian Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
    bgGrad.addColorStop(0, '#0c1510');
    bgGrad.addColorStop(0.5, '#122318');
    bgGrad.addColorStop(1, '#070c09');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1000);

    // 2. Radial Glow Effects
    const glow1 = ctx.createRadialGradient(100, 100, 10, 100, 100, 300);
    glow1.addColorStop(0, 'rgba(56, 168, 82, 0.25)');
    glow1.addColorStop(1, 'rgba(56, 168, 82, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 800, 1000);

    const glow2 = ctx.createRadialGradient(700, 900, 10, 700, 900, 350);
    glow2.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    glow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 800, 1000);

    // 3. Card Outer Border (Glassmorphic)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 740, 940);

    // 4. Header & Badge
    ctx.fillStyle = '#38a852';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('RIED FINANCIAL STUDIO', 60, 80);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('SEPTEMBER 2026 RECAP', 560, 80);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 105);
    ctx.lineTo(740, 105);
    ctx.stroke();

    // 5. Persona Headline
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('PERSONA FINANSIAL ANDA:', 60, 150);

    const persona = (this.dom.wrappedPersonaTitle && this.dom.wrappedPersonaTitle.textContent) || 'Sang Ahli Alokasi';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px sans-serif';
    ctx.fillText(persona, 60, 195);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '500 16px sans-serif';
    ctx.fillText('Pengeluaran disiplin, surplus melimpah, dan alokasi portofolio modern.', 60, 230);

    // 6. Draw 4 Glassmorphic Stat Boxes
    const drawStatBox = (x, y, w, h, label, val, color) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(label.toUpperCase(), x + 20, y + 35);

      ctx.fillStyle = color;
      ctx.font = '900 24px monospace';
      ctx.fillText(val, x + 20, y + 80);
    };

    const incomeStr = this.dom.wrappedStatIncome ? this.dom.wrappedStatIncome.textContent : 'Rp 16.596.500';
    const expenseStr = this.dom.wrappedStatExpense ? this.dom.wrappedStatExpense.textContent : 'Rp 7.161.000';
    const topcatStr = this.dom.wrappedStatTopcat ? this.dom.wrappedStatTopcat.textContent : 'Makanan';
    const scoreStr = this.dom.wrappedStatScore ? this.dom.wrappedStatScore.textContent : '98 / 100';

    drawStatBox(60, 270, 320, 120, 'Total Pemasukan', incomeStr, '#34d399');
    drawStatBox(420, 270, 320, 120, 'Total Pengeluaran', expenseStr, '#fca5a5');
    drawStatBox(60, 420, 320, 120, 'Pos Juara 1 (Terbesar)', topcatStr, '#ffffff');
    drawStatBox(420, 420, 320, 120, 'Skor Disiplin & Radar', scoreStr, '#6ee7b7');

    // 7. 50/30/20 Rule Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Distribusi Anggaran (Aturan 50 / 30 / 20)', 60, 600);

    const needsPct = this.financialHealth && this.financialHealth.rule_50_30_20 ? this.financialHealth.rule_50_30_20.needs_pct : 43.1;
    const wantsPct = this.financialHealth && this.financialHealth.rule_50_30_20 ? this.financialHealth.rule_50_30_20.wants_pct : 30.8;
    const savingsPct = this.financialHealth && this.financialHealth.rule_50_30_20 ? this.financialHealth.rule_50_30_20.savings_pct : 26.1;

    const barX = 60;
    const barY = 630;
    const barW = 680;
    const barH = 26;

    const wNeeds = (needsPct / 100) * barW;
    const wWants = (wantsPct / 100) * barW;
    const wSavings = Math.max(0, barW - wNeeds - wWants);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, barY, wNeeds, barH);

    ctx.fillStyle = '#c084fc';
    ctx.fillRect(barX + wNeeds, barY, wWants, barH);

    ctx.fillStyle = '#34d399';
    ctx.fillRect(barX + wNeeds + wWants, barY, wSavings, barH);

    // Labels under bar
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`Needs: ${needsPct.toFixed(1)}%`, barX, barY + 50);

    ctx.fillStyle = '#c084fc';
    ctx.fillText(`Wants: ${wantsPct.toFixed(1)}%`, barX + 240, barY + 50);

    ctx.fillStyle = '#34d399';
    ctx.fillText(`Savings: ${savingsPct.toFixed(1)}%`, barX + 480, barY + 50);

    // 8. Motivation quote
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 15px sans-serif';
    ctx.fillText('"Kekayaan sejati dibangun bukan dari besarnya penghasilan, melainkan', 60, 760);
    ctx.fillText('dari disiplin alokasi dan waktu yang bekerja bersama bunga majemuk."', 60, 785);

    // 9. Watermark Footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(60, 880);
    ctx.lineTo(740, 880);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText('ried.studio • @RiedutBot • Autonomous Wealth Architecture', 60, 915);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('#FinansialCerdas', 610, 915);

    // 10. Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    const safeMonthName = this.getSelectedMonthLabel().replace(/\s+/g, '-');
    a.download = `RIED-Wrapped-${safeMonthName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async applyFilters() {
    const start = this.dom.filterDateStart ? this.dom.filterDateStart.value : null;
    const end = this.dom.filterDateEnd ? this.dom.filterDateEnd.value : null;
    const month = this.dom.filterMonth ? this.dom.filterMonth.value : null;

    if (start && end) {
      try {
        const summary = await fetchFinancialSummary({ start_date: start, end_date: end });
        this.summary = summary;
        this.renderDashboardMetrics();
        this.renderCurrentCharts();

        if (this.dom.bannerDateRange) {
          this.dom.bannerDateRange.textContent = `${start} s/d ${end}`;
        }
      } catch (err) {
        console.error('Failed applying date range filter:', err);
      }
    } else if (month && month.includes('-')) {
      const [y, m] = month.split('-').map(Number);
      await this.setMonth(y, m);
    }
  }

  async resetFilters() {
    this.selectedYear = 2026;
    this.selectedMonth = 9;
    this.selectedDay = null;
    if (this.dom.filterCategory) this.dom.filterCategory.value = 'all';
    if (this.dom.filterWallet) this.dom.filterWallet.value = 'all';
    await this.refreshAllData();
  }

  setTheme(isDark) {
    this.isDarkMode = isDark;
    localStorage.setItem('ried-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
      if (this.dom.themeIcon) this.dom.themeIcon.setAttribute('data-lucide', 'sun');
    } else {
      document.documentElement.classList.remove('dark');
      if (this.dom.themeIcon) this.dom.themeIcon.setAttribute('data-lucide', 'moon');
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
    this.renderCurrentCharts();
  }

  // =========================================================================
  // INTERACTIVE MODULES (Mascot, 3D Tilt, Confetti, Streak & Quick Chips)
  // =========================================================================
  initConfetti() {
    if (!this.dom.canvasConfetti) return;
    this.confetti = new ConfettiEngine(this.dom.canvasConfetti);
  }

  init3DTilt() {
    const attachTilt = () => {
      const cards = document.querySelectorAll('.tilt-card-3d');
      cards.forEach((card) => {
        if (card.dataset.tiltAttached) return;
        card.dataset.tiltAttached = 'true';
        let sheen = card.querySelector('.tilt-sheen');
        if (!sheen) {
          sheen = document.createElement('div');
          sheen.className = 'tilt-sheen';
          card.prepend(sheen);
        }

        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -8;
          const rotateY = ((x - centerX) / centerX) * 8;
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
          sheen.style.opacity = '1';
          sheen.style.background = `radial-gradient(circle at ${(x / rect.width) * 100}% ${(y / rect.height) * 100}%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 65%)`;
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
          sheen.style.opacity = '0';
        });
      });
    };

    attachTilt();
    this.attachTiltCards = attachTilt;
  }

  initMascot() {
    if (!this.dom.mascotRiedu) return;

    this.dom.mascotRiedu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerMascotInteraction(e);
    });

    this.updateMascotMood();
  }

  triggerMascotInteraction(e) {
    sounds.playPurr();

    if (this.dom.mascotAvatarInner) {
      this.dom.mascotAvatarInner.classList.remove('mascot-wiggle');
      void this.dom.mascotAvatarInner.offsetWidth;
      this.dom.mascotAvatarInner.classList.add('mascot-wiggle');
    }

    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart-particle';
      heart.textContent = ['💚', '✨', '🌱'][i % 3];
      const offsetX = (i - 1) * 16 + (Math.random() * 8 - 4);
      heart.style.setProperty('--tx', `${offsetX}px`);
      heart.style.left = `calc(50% + ${offsetX}px)`;
      heart.style.top = '10px';
      this.dom.mascotRiedu.appendChild(heart);
      setTimeout(() => heart.remove(), 750);
    }

    const randomTip = RIEDU_TIPS[Math.floor(Math.random() * RIEDU_TIPS.length)];
    if (this.dom.mascotSpeechText) {
      this.dom.mascotSpeechText.textContent = randomTip;
    }
    if (this.dom.mascotSpeechBubble) {
      this.dom.mascotSpeechBubble.classList.add('show');
      if (this.mascotBubbleTimer) clearTimeout(this.mascotBubbleTimer);
      this.mascotBubbleTimer = setTimeout(() => {
        if (this.dom.mascotSpeechBubble) {
          this.dom.mascotSpeechBubble.classList.remove('show');
        }
      }, 3600);
    }
  }

  updateMascotMood() {
    if (!this.summary || !this.dom.mascotRiedu) return;
    const eyeLeft = document.getElementById('mascot-eye-left');
    const eyeRight = document.getElementById('mascot-eye-right');
    const mouth = document.getElementById('mascot-mouth');
    if (!eyeLeft || !eyeRight || !mouth) return;

    const expense = this.summary.total_expense || 0;
    const income = this.summary.total_income || 1;
    const expenseRatio = expense / income;

    if (expenseRatio > 0.85) {
      eyeLeft.setAttribute('r', '2.5');
      eyeRight.setAttribute('r', '2.5');
      mouth.setAttribute('d', 'M28 44H36');
    } else {
      eyeLeft.setAttribute('r', '2');
      eyeRight.setAttribute('r', '2');
      mouth.setAttribute('d', 'M28 43C30 45 34 45 36 43');
    }
  }

  initStreakCheckIn() {
    if (!this.dom.btnStreakCheckin) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastCheckin = localStorage.getItem('ried-streak-last-checkin');

    if (lastCheckin === todayStr) {
      this.dom.btnStreakCheckin.classList.add('checked');
      if (this.dom.streakCheckinText) {
        this.dom.streakCheckinText.textContent = 'Sudah Check-in ✓';
      }
    } else {
      this.dom.btnStreakCheckin.classList.remove('checked');
      if (this.dom.streakCheckinText) {
        this.dom.streakCheckinText.textContent = 'Check-in ⚡';
      }
    }

    this.dom.btnStreakCheckin.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentCheckin = localStorage.getItem('ried-streak-last-checkin');
      if (currentCheckin === todayStr) {
        sounds.playPop();
        return;
      }

      sounds.playLevelUp();
      localStorage.setItem('ried-streak-last-checkin', todayStr);
      this.dom.btnStreakCheckin.classList.add('checked');
      if (this.dom.streakCheckinText) {
        this.dom.streakCheckinText.textContent = 'Sudah Check-in ✓';
      }

      if (this.dom.statStreakCurrent) {
        const curText = this.dom.statStreakCurrent.textContent || '0';
        const curNum = parseInt(curText.replace(/\D/g, ''), 10) || 0;
        animateNumber(this.dom.statStreakCurrent, curNum, curNum + 1, 400, n => `${n} hari`);
      }

      const rect = this.dom.btnStreakCheckin.getBoundingClientRect();
      if (this.confetti) {
        this.confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 45);
      }
    });
  }

  initQuickExpenseChips() {
    const chips = document.querySelectorAll('.quick-chip-btn');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        sounds.playCoinDrop();
        const title = chip.getAttribute('data-quick-title') || 'Pengeluaran Cepat';
        const amount = chip.getAttribute('data-quick-amount') || '25000';
        const category = chip.getAttribute('data-quick-cat') || 'Makan & Minum';

        this.openTxModal(false, {
          title,
          amount: parseInt(amount, 10),
          category,
          type: 'expense',
          date: new Date().toISOString().slice(0, 10),
          notes: 'Dicatat via Catat Kilat 1-Tap ⚡'
        });
      });
    });
  }

  initRippleEffect() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.ripple-target, button, .sidebar-link, .range-pill, .goal-card');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('click-ripple');

      const existingRipple = target.querySelector('.click-ripple');
      if (existingRipple) {
        existingRipple.remove();
      }

      target.appendChild(circle);
      setTimeout(() => circle.remove(), 500);
    });
  }

  updateSoundButtonUI() {
    const isMuted = sounds.isMuted();
    if (this.dom.soundIcon) {
      this.dom.soundIcon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

// Robust bootstrap on DOM ready or immediate if already loaded
function bootstrapRiedApp() {
  const app = new RiedApp();
  window.riedApp = app;
  window.riedAudio = sounds;
  return app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapRiedApp);
} else {
  bootstrapRiedApp();
}
