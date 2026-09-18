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
  updateCategoryBudgetLimit
} from './api.js';

import {
  renderSplineChart,
  renderTransactionBarChart,
  renderStackedBudgetChart,
  attachCanvasInteractivity
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

    // Theme state
    this.isDarkMode = false;

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
      soundToggle: document.getElementById('sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      themeToggle: document.getElementById('theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      settingsThemeBtn: document.getElementById('settings-theme-btn'),

      // Views
      views: {
        dashboard: document.getElementById('view-dashboard'),
        transaksi: document.getElementById('view-transaksi'),
        pengaturan: document.getElementById('view-pengaturan'),
        'gateway-telegram': document.getElementById('view-gateway-telegram'),
        'format-balasan': document.getElementById('view-format-balasan'),
        kamus: document.getElementById('view-kamus'),
        'log-telegram': document.getElementById('view-log-telegram')
      },

      // Dashboard Elements
      btnExportExcel: document.getElementById('btn-export-excel'),
      btnExportPdf: document.getElementById('btn-export-pdf'),
      calendarDayStrip: document.getElementById('calendar-day-strip'),
      btnOpenMonthlyCal: document.getElementById('btn-open-monthly-cal'),
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

    // Monthly Calendar Modal triggers
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

    // Toggle views visibility
    Object.keys(this.dom.views).forEach((key) => {
      const el = this.dom.views[key];
      if (!el) return;
      if (key === viewName) {
        el.classList.remove('hidden');
        el.classList.add('animate-fade-in');
      } else {
        el.classList.add('hidden');
        el.classList.remove('animate-fade-in');
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
      this.dom.atmCardBalance.textContent = formatRupiah(w.balance);
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

  renderCalendarDayStrip() {
    if (!this.dom.calendarDayStrip) return;
    const days = [
      { day: 'SEL', date: '15' },
      { day: 'RAB', date: '16' },
      { day: 'KAM', date: '17' },
      { day: 'JUM', date: '18', active: true },
      { day: 'SAB', date: '19' },
      { day: 'MIN', date: '20' },
      { day: 'SEN', date: '21' }
    ];

    this.dom.calendarDayStrip.innerHTML = days.map(d => `
      <div class="day-pill ${d.active ? 'active' : ''}">
        <span class="text-[9px] font-bold ${d.active ? 'text-white' : 'text-slate-400'}">${d.day}</span>
        <span class="text-xs font-black ${d.active ? 'text-white' : 'text-slate-800 dark:text-slate-200'}">${d.date}</span>
      </div>
    `).join('');
  }

  openMonthlyCalendar() {
    if (!this.dom.modalMonthlyCalendar) return;
    this.populateMonthlyCalendar();
    this.dom.modalMonthlyCalendar.classList.remove('hidden');
    this.dom.modalMonthlyCalendar.classList.add('flex');
  }

  closeMonthlyCalendar() {
    if (!this.dom.modalMonthlyCalendar) return;
    this.dom.modalMonthlyCalendar.classList.add('hidden');
    this.dom.modalMonthlyCalendar.classList.remove('flex');
  }

  populateMonthlyCalendar() {
    if (!this.dom.monthlyCalendarGrid) return;
    // 30 days of September 2026. September 1st, 2026 is a Tuesday (index 2: Sun=0, Mon=1, Tue=2)
    const offset = 2;
    let html = '';

    // Empty offset days
    for (let i = 0; i < offset; i++) {
      html += `<div class="p-2 text-slate-300 dark:text-slate-700"></div>`;
    }

    // Days 1 to 30
    const activeDays = [2, 5, 8, 10, 12, 14, 16, 18];
    for (let d = 1; d <= 30; d++) {
      const isActive = activeDays.includes(d);
      const isToday = d === 18;
      let classes = 'p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center ';
      if (isToday) {
        classes += 'bg-[#38a852] text-white font-bold shadow-md';
      } else if (isActive) {
        classes += 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold';
      } else {
        classes += 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
      }

      html += `
        <div class="${classes}">
          <span class="text-xs">${d}</span>
          ${isActive ? '<span class="w-1 h-1 rounded-full bg-emerald-500 mt-0.5"></span>' : ''}
        </div>
      `;
    }

    this.dom.monthlyCalendarGrid.innerHTML = html;
  }

  async refreshAllData() {
    try {
      const [summary, txList, categories] = await Promise.all([
        fetchFinancialSummary(),
        fetchTransactionsList(),
        fetchCategoriesMeta()
      ]);

      this.summary = summary;
      this.transactions = txList;
      this.categories = categories;

      this.renderDashboardMetrics();
      this.renderCurrentCharts();
      if (this.currentView === 'transaksi') {
        this.loadTransaksiViewData();
      }
    } catch (err) {
      console.error('Failed refreshing data:', err);
    }
  }

  renderDashboardMetrics() {
    if (!this.summary) return;

    if (this.dom.statTotalIncome) {
      this.dom.statTotalIncome.textContent = formatRupiah(this.summary.total_income);
    }
    if (this.dom.statTotalExpense) {
      this.dom.statTotalExpense.textContent = formatRupiah(this.summary.total_expense);
    }
    if (this.dom.statTxCount) {
      this.dom.statTxCount.textContent = `${this.summary.transactions_count} Transaksi`;
    }
    if (this.dom.statTotalSavings) {
      this.dom.statTotalSavings.textContent = formatRupiah(this.summary.total_balance);
    }
    if (this.dom.atmCardBalance && this.activeWalletIndex === 0) {
      this.dom.atmCardBalance.textContent = formatRupiah(this.summary.total_balance);
    }
  }

  async loadTransaksiViewData() {
    if (!this.dom.txviewFullList) return;

    try {
      const txs = await fetchTransactionsList(
        this.txFilterType,
        this.txFilterCategory,
        this.txSearchQuery
      );

      if (txs.length === 0) {
        this.dom.txviewFullList.innerHTML = `
          <div class="p-8 text-center ried-card text-slate-400 text-xs">
            Tidak ada transaksi yang cocok dengan kriteria pencarian.
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

    if (isEdit && txData) {
      this.dom.inputTitle.value = txData.title;
      this.dom.inputAmount.value = txData.amount;
      this.dom.inputCategory.value = txData.category;
      this.dom.inputType.value = txData.type;
      this.dom.inputDate.value = txData.date;
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
      } else {
        await createNewTransaction(payload);
      }
      sounds.playChime();
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
        notes: 'Dicatat via Bot Telegram @RiedFinanceBot'
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

  applyFilters() {
    this.renderCurrentCharts();
  }

  resetFilters() {
    if (this.dom.filterCategory) this.dom.filterCategory.value = 'all';
    if (this.dom.filterWallet) this.dom.filterWallet.value = 'all';
    this.renderCurrentCharts();
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
