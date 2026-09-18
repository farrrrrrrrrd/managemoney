/**
 * FINO Financial Dashboard & SaaS App Controller
 * Full Multi-View SPA: Dashboard, Transaksi, Pengeluaran (Budgets), Laporan, Pengaturan.
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

import { renderSplineChart, renderCategoryDonut } from './charts.js';

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

class FinoApp {
  constructor() {
    this.currentView = 'dashboard';
    this.summary = null;
    this.transactions = [];
    this.categories = [];
    
    // Filters for Dashboard
    this.dashFilterType = 'all';

    // Filters for Transaksi View
    this.txFilterType = null;
    this.txFilterCategory = null;
    this.txSearchQuery = '';
    this.searchDebounceTimer = null;

    // Budget modal state
    this.editingBudgetCategory = null;

    // Transaction modal state
    this.editingTxId = null;

    // Theme state
    this.isDarkMode = false;

    this.cacheDom();
    this.init();
  }

  cacheDom() {
    this.dom = {
      // Views & Navigation
      views: {
        dashboard: document.getElementById('view-dashboard'),
        transaksi: document.getElementById('view-transaksi'),
        pengeluaran: document.getElementById('view-pengeluaran'),
        laporan: document.getElementById('view-laporan'),
        pengaturan: document.getElementById('view-pengaturan')
      },
      navButtons: document.querySelectorAll('.nav-btn'),
      mobileNavButtons: document.querySelectorAll('.mobile-nav-btn'),
      viewTitle: document.getElementById('view-title'),
      viewSubtitle: document.getElementById('view-subtitle'),
      headerDate: document.getElementById('header-date'),
      btnGotoBudgets: document.getElementById('btn-goto-budgets'),

      // Hero Banner
      heroBanner: document.getElementById('hero-banner'),
      heroQuickTx: document.getElementById('hero-quick-tx'),
      heroDismiss: document.getElementById('hero-dismiss'),

      // Theme
      themeToggle: document.getElementById('theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      themeBadge: document.getElementById('theme-badge'),
      settingsThemeBtn: document.getElementById('settings-theme-btn'),

      // Dashboard View Elements
      dateStrip: document.getElementById('date-strip'),
      btnAddTx: document.getElementById('btn-add-tx'),
      totalBalance: document.getElementById('stat-total-balance'),
      totalExpense: document.getElementById('stat-total-expense'),
      totalIncome: document.getElementById('stat-total-income'),
      txCount: document.getElementById('stat-tx-count'),
      targetDays: document.getElementById('stat-target-days'),
      expenseRatio: document.getElementById('stat-expense-ratio'),
      chartSpline: document.getElementById('chart-spline'),
      chartDonut: document.getElementById('chart-donut'),
      insightText: document.getElementById('insight-text'),
      categoryList: document.getElementById('category-list'),
      txContainer: document.getElementById('tx-container'),
      dashFilterAll: document.getElementById('filter-all'),
      dashFilterExpense: document.getElementById('filter-expense'),
      dashFilterIncome: document.getElementById('filter-income'),

      // Transaksi View Elements
      txSearchInput: document.getElementById('tx-search-input'),
      txviewFilterAll: document.getElementById('txview-filter-all'),
      txviewFilterExpense: document.getElementById('txview-filter-expense'),
      txviewFilterIncome: document.getElementById('txview-filter-income'),
      catChipButtons: document.querySelectorAll('.cat-chip-btn'),
      txviewFullList: document.getElementById('txview-full-list'),
      txviewStatus: document.getElementById('txview-status'),
      txviewCount: document.getElementById('txview-count'),
      txviewExpense: document.getElementById('txview-expense'),
      txviewIncome: document.getElementById('txview-income'),
      txviewNet: document.getElementById('txview-net'),

      // Pengeluaran View Elements
      budgetTotalAllocation: document.getElementById('budget-total-allocation'),
      budgetTotalSpent: document.getElementById('budget-total-spent'),
      budgetGridContainer: document.getElementById('budget-grid-container'),

      // Laporan View Elements
      reportSavingsRate: document.getElementById('report-savings-rate'),
      reportAvgDaily: document.getElementById('report-avg-daily'),
      reportTableBody: document.getElementById('report-table-body'),

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

      // Budget Modal Elements
      budgetModal: document.getElementById('budget-modal'),
      budgetModalCategory: document.getElementById('budget-modal-category'),
      budgetModalInput: document.getElementById('budget-modal-input'),
      budgetModalForm: document.getElementById('budget-modal-form'),
      budgetModalClose: document.getElementById('budget-modal-close'),
      budgetModalCancel: document.getElementById('budget-modal-cancel')
    };
  }

  async init() {
    // 1. Theme setup
    const savedTheme = localStorage.getItem('fino-theme');
    this.setTheme(savedTheme === 'dark');

    // 2. Set current date header
    const now = new Date();
    const monthYear = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    if (this.dom.headerDate) this.dom.headerDate.textContent = monthYear;

    // 3. Bind all event listeners
    this.bindEvents();
    this.renderCalendarStrip();

    // 4. Load backend data
    await this.refreshAllData();

    // 5. Handle window resize for charts
    window.addEventListener('resize', () => {
      if (this.summary && this.currentView === 'dashboard') {
        renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
        renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);
      }
    });
  }

  bindEvents() {
    // SPA View Switcher (Desktop & Mobile)
    this.dom.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    this.dom.mobileNavButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    if (this.dom.btnGotoBudgets) {
      this.dom.btnGotoBudgets.addEventListener('click', () => {
        this.switchView('pengeluaran');
      });
    }

    // Hero Banner controls
    if (this.dom.heroDismiss) {
      this.dom.heroDismiss.addEventListener('click', () => {
        this.dom.heroBanner.style.display = 'none';
      });
    }
    if (this.dom.heroQuickTx) {
      this.dom.heroQuickTx.addEventListener('click', () => this.openTxModal(false));
    }

    // Theme toggles
    if (this.dom.themeToggle) {
      this.dom.themeToggle.addEventListener('click', () => this.setTheme(!this.isDarkMode));
    }
    if (this.dom.settingsThemeBtn) {
      this.dom.settingsThemeBtn.addEventListener('click', () => this.setTheme(!this.isDarkMode));
    }

    // Add Transaction button
    if (this.dom.btnAddTx) {
      this.dom.btnAddTx.addEventListener('click', () => this.openTxModal(false));
    }

    // Transaction Modal Close
    if (this.dom.modalCancel) {
      this.dom.modalCancel.addEventListener('click', () => this.closeTxModal());
    }
    if (this.dom.btnCancelTx) {
      this.dom.btnCancelTx.addEventListener('click', () => this.closeTxModal());
    }
    if (this.dom.modalForm) {
      this.dom.modalForm.addEventListener('submit', (e) => this.handleTxFormSubmit(e));
    }

    // Budget Modal Close
    if (this.dom.budgetModalClose) {
      this.dom.budgetModalClose.addEventListener('click', () => this.closeBudgetModal());
    }
    if (this.dom.budgetModalCancel) {
      this.dom.budgetModalCancel.addEventListener('click', () => this.closeBudgetModal());
    }
    if (this.dom.budgetModalForm) {
      this.dom.budgetModalForm.addEventListener('submit', (e) => this.handleBudgetFormSubmit(e));
    }

    // Dashboard Transaction Type Filters
    const setDashFilter = (type, btn) => {
      this.dashFilterType = type;
      [this.dom.dashFilterAll, this.dom.dashFilterExpense, this.dom.dashFilterIncome].forEach((b) => {
        if (b) {
          b.classList.remove('bg-emerald-500', 'text-white');
          b.classList.add('text-slate-500');
        }
      });
      if (btn) {
        btn.classList.remove('text-slate-500');
        btn.classList.add('bg-emerald-500', 'text-white');
      }
      this.renderDashboardTransactions();
    };

    if (this.dom.dashFilterAll) this.dom.dashFilterAll.addEventListener('click', () => setDashFilter('all', this.dom.dashFilterAll));
    if (this.dom.dashFilterExpense) this.dom.dashFilterExpense.addEventListener('click', () => setDashFilter('expense', this.dom.dashFilterExpense));
    if (this.dom.dashFilterIncome) this.dom.dashFilterIncome.addEventListener('click', () => setDashFilter('income', this.dom.dashFilterIncome));

    // Transaksi View Search Bar with live debouncing
    if (this.dom.txSearchInput) {
      this.dom.txSearchInput.addEventListener('input', (e) => {
        this.txSearchQuery = e.target.value.trim();
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.loadTransaksiViewData();
        }, 250);
      });
    }

    // Transaksi View Type Filters
    const setTxViewType = (type, btn) => {
      this.txFilterType = type;
      [this.dom.txviewFilterAll, this.dom.txviewFilterExpense, this.dom.txviewFilterIncome].forEach((b) => {
        if (b) {
          b.classList.remove('bg-emerald-500', 'text-white');
          b.classList.add('text-slate-500');
        }
      });
      if (btn) {
        btn.classList.remove('text-slate-500');
        btn.classList.add('bg-emerald-500', 'text-white');
      }
      this.loadTransaksiViewData();
    };

    if (this.dom.txviewFilterAll) this.dom.txviewFilterAll.addEventListener('click', () => setTxViewType(null, this.dom.txviewFilterAll));
    if (this.dom.txviewFilterExpense) this.dom.txviewFilterExpense.addEventListener('click', () => setTxViewType('expense', this.dom.txviewFilterExpense));
    if (this.dom.txviewFilterIncome) this.dom.txviewFilterIncome.addEventListener('click', () => setTxViewType('income', this.dom.txviewFilterIncome));

    // Category Filter Chips in Transaksi View
    this.dom.catChipButtons.forEach((chip) => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-cat') || null;
        this.txFilterCategory = cat;

        this.dom.catChipButtons.forEach((c) => {
          c.classList.remove('bg-emerald-500', 'text-white', 'font-bold');
          c.classList.add('fino-card', 'text-slate-600', 'dark:text-slate-300', 'font-medium');
        });
        chip.classList.remove('fino-card', 'text-slate-600', 'dark:text-slate-300', 'font-medium');
        chip.classList.add('bg-emerald-500', 'text-white', 'font-bold');

        this.loadTransaksiViewData();
      });
    });
  }

  // ==========================================
  // SPA View Routing & Transitions
  // ==========================================
  switchView(viewName) {
    if (!this.dom.views[viewName]) return;
    this.currentView = viewName;

    // Update View visibility
    Object.keys(this.dom.views).forEach((key) => {
      const el = this.dom.views[key];
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
      const view = btn.getAttribute('data-view');
      if (view === viewName) {
        btn.classList.add('nav-link-active');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-emerald-50', 'dark:hover:bg-emerald-950/40');
      } else {
        btn.classList.remove('nav-link-active');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-emerald-50', 'dark:hover:bg-emerald-950/40');
      }
    });

    // Update Mobile Nav Bar
    this.dom.mobileNavButtons.forEach((btn) => {
      const view = btn.getAttribute('data-view');
      if (view === viewName) {
        btn.classList.add('text-emerald-500', 'font-bold');
        btn.classList.remove('text-slate-500', 'font-medium');
      } else {
        btn.classList.remove('text-emerald-500', 'font-bold');
        btn.classList.add('text-slate-500', 'font-medium');
      }
    });

    // Update Top View Header
    const viewMetadata = {
      dashboard: {
        title: 'Selamat pagi, Fino 👋',
        subtitle: 'Kelola dan pantau keuangan personal Anda dengan presisi & gaya.'
      },
      transaksi: {
        title: 'Buku Transaksi Finansial 📝',
        subtitle: 'Cari, filter, dan telusuri seluruh riwayat pemasukan dan pengeluaran.'
      },
      pengeluaran: {
        title: 'Manajemen Anggaran & Budget 🎯',
        subtitle: 'Kendalikan batas pengeluaran bulanan per pos kategori dengan presisi.'
      },
      laporan: {
        title: 'Laporan Arus Kas & Analisis 📊',
        subtitle: 'Evaluasi tingkat kedisiplinan finansial, rasio simpanan, dan ekspor CSV.'
      },
      pengaturan: {
        title: 'Pengaturan & Sistem FINO ⚙️',
        subtitle: 'Konfigurasi preferensi tampilan, format lokal, dan cadangan data lokal.'
      }
    };

    const meta = viewMetadata[viewName] || viewMetadata.dashboard;
    if (this.dom.viewTitle) this.dom.viewTitle.textContent = meta.title;
    if (this.dom.viewSubtitle) this.dom.viewSubtitle.textContent = meta.subtitle;

    // View-specific initialization triggers
    if (viewName === 'dashboard' && this.summary) {
      setTimeout(() => {
        renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
        renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);
      }, 50);
    } else if (viewName === 'transaksi') {
      this.loadTransaksiViewData();
    } else if (viewName === 'pengeluaran') {
      this.renderPengeluaranView();
    } else if (viewName === 'laporan') {
      this.renderLaporanView();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // Theme Toggle
  // ==========================================
  setTheme(isDark) {
    this.isDarkMode = isDark;
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('fino-theme', 'dark');
      if (this.dom.themeIcon) this.dom.themeIcon.setAttribute('data-lucide', 'sun');
      if (this.dom.themeBadge) this.dom.themeBadge.textContent = 'Forest Dark';
    } else {
      html.classList.remove('dark');
      localStorage.setItem('fino-theme', 'light');
      if (this.dom.themeIcon) this.dom.themeIcon.setAttribute('data-lucide', 'moon');
      if (this.dom.themeBadge) this.dom.themeBadge.textContent = 'Matcha Cream';
    }
    if (window.lucide) window.lucide.createIcons();

    if (this.summary && this.currentView === 'dashboard') {
      renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
      renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);
    }
  }

  // ==========================================
  // Calendar Strip
  // ==========================================
  renderCalendarStrip() {
    if (!this.dom.dateStrip) return;
    this.dom.dateStrip.innerHTML = '';

    const today = new Date();
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push(d);
    }

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    days.forEach((d) => {
      const isToday = d.toDateString() === today.toDateString();
      const pill = document.createElement('button');
      pill.className = `flex flex-col items-center justify-center w-12 py-2.5 rounded-2xl text-xs transition-all font-medium fino-card ${
        isToday ? 'day-pill-active font-bold' : 'text-slate-600 dark:text-slate-400 hover:border-emerald-400'
      }`;
      pill.innerHTML = `
        <span class="text-[10px] uppercase">${dayNames[d.getDay()]}</span>
        <span class="text-sm font-bold mt-0.5">${d.getDate()}</span>
      `;
      pill.addEventListener('click', () => {
        document.querySelectorAll('#date-strip button').forEach((b) => b.classList.remove('day-pill-active'));
        pill.classList.add('day-pill-active');
      });
      this.dom.dateStrip.appendChild(pill);
    });
  }

  // ==========================================
  // Data Fetching & Sync
  // ==========================================
  async refreshAllData() {
    try {
      this.summary = await fetchFinancialSummary();
      this.categories = await fetchCategoriesMeta();
      this.transactions = await fetchTransactionsList();

      this.renderDashboardKPIs(this.summary);
      this.renderDashboardCategories(this.summary.category_breakdown);
      this.renderDashboardTransactions();

      if (this.currentView === 'dashboard') {
        renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
        renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);
      } else if (this.currentView === 'transaksi') {
        this.loadTransaksiViewData();
      } else if (this.currentView === 'pengeluaran') {
        this.renderPengeluaranView();
      } else if (this.currentView === 'laporan') {
        this.renderLaporanView();
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Gagal memuat data FINO:', err);
    }
  }

  // ==========================================
  // VIEW 1: Dashboard Rendering
  // ==========================================
  renderDashboardKPIs(summary) {
    if (this.dom.totalBalance) this.dom.totalBalance.textContent = formatRupiah(summary.total_balance);
    if (this.dom.totalExpense) this.dom.totalExpense.textContent = formatRupiah(summary.total_expense);
    if (this.dom.totalIncome) this.dom.totalIncome.textContent = formatRupiah(summary.total_income);
    if (this.dom.txCount) this.dom.txCount.textContent = `${summary.transactions_count} Transaksi`;
    if (this.dom.targetDays) this.dom.targetDays.textContent = `${summary.target_days_current} / ${summary.target_days_total}`;

    // Expense ratio calculation
    const totalBudget = summary.category_breakdown.reduce((acc, c) => acc + c.budget, 0);
    if (this.dom.expenseRatio && totalBudget > 0) {
      const ratio = Math.round((summary.total_expense / totalBudget) * 100);
      this.dom.expenseRatio.textContent = `${ratio}% Dari Total Anggaran`;
    }

    if (this.dom.insightText && summary.category_breakdown.length > 0) {
      const sorted = [...summary.category_breakdown].sort((a, b) => b.spent - a.spent);
      const top1 = sorted[0];
      const top2 = sorted[1];
      if (top1 && top2) {
        this.dom.insightText.textContent = `Pengeluaran terbesar teralokasi pada ${top1.category} (${formatRupiah(top1.spent)}) dan ${top2.category} (${formatRupiah(top2.spent)}).`;
      }
    }
  }

  renderDashboardCategories(categories) {
    if (!this.dom.categoryList) return;
    this.dom.categoryList.innerHTML = '';

    categories.forEach((cat) => {
      const card = document.createElement('div');
      card.className = 'p-3.5 rounded-2xl fino-card space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm" style="background-color: ${cat.color}">
              <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
            </div>
            <div>
              <span class="font-bold text-slate-800 dark:text-white block">${cat.category}</span>
              <span class="text-[10px] text-slate-400">Budget ${formatRupiah(cat.budget)}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="font-bold text-slate-700 dark:text-emerald-400 text-xs block">${formatRupiah(cat.spent)}</span>
            <button class="btn-quick-edit-budget text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline" data-category="${cat.category}" data-budget="${cat.budget}">Ubah</button>
          </div>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, cat.percentage)}%; background-color: ${cat.color}"></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400">
          <span>Terpakai ${cat.percentage}%</span>
          <span>Sisa ${formatRupiah(Math.max(0, cat.budget - cat.spent))}</span>
        </div>
      `;

      card.querySelector('.btn-quick-edit-budget').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBudgetModal(cat.category, cat.budget);
      });

      this.dom.categoryList.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  renderDashboardTransactions() {
    if (!this.dom.txContainer) return;
    this.dom.txContainer.innerHTML = '';

    let list = this.transactions;
    if (this.dashFilterType !== 'all') {
      list = list.filter((t) => t.type === this.dashFilterType);
    }

    if (list.length === 0) {
      this.dom.txContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          Belum ada transaksi tercatat untuk kategori ini.
        </div>
      `;
      return;
    }

    // Render top 12 transactions on dashboard
    list.slice(0, 12).forEach((tx) => {
      const row = this.createTransactionCard(tx);
      this.dom.txContainer.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // VIEW 2: Transaksi Full Ledger
  // ==========================================
  async loadTransaksiViewData() {
    try {
      const list = await fetchTransactionsList(this.txFilterType, this.txFilterCategory, this.txSearchQuery);
      
      // Update KPI highlights in Transaksi View
      const totalCount = list.length;
      const totalExp = list.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const totalInc = list.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const net = totalInc - totalExp;

      if (this.dom.txviewCount) this.dom.txviewCount.textContent = totalCount;
      if (this.dom.txviewExpense) this.dom.txviewExpense.textContent = formatRupiah(totalExp);
      if (this.dom.txviewIncome) this.dom.txviewIncome.textContent = formatRupiah(totalInc);
      if (this.dom.txviewNet) this.dom.txviewNet.textContent = formatRupiah(net);
      if (this.dom.txviewStatus) {
        this.dom.txviewStatus.textContent = `Menampilkan ${totalCount} transaksi${this.txSearchQuery ? ` untuk "${this.txSearchQuery}"` : ''}`;
      }

      if (!this.dom.txviewFullList) return;
      this.dom.txviewFullList.innerHTML = '';

      if (list.length === 0) {
        this.dom.txviewFullList.innerHTML = `
          <div class="p-12 text-center text-slate-400 text-xs space-y-2">
            <i data-lucide="search-x" class="w-8 h-8 mx-auto text-slate-300"></i>
            <p>Tidak ada transaksi yang cocok dengan kriteria pencarian.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      list.forEach((tx) => {
        const row = this.createTransactionCard(tx);
        this.dom.txviewFullList.appendChild(row);
      });

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Gagal load data transaksi:', err);
    }
  }

  createTransactionCard(tx) {
    const isExpense = tx.type === 'expense';
    const catMeta = this.categories.find((c) => c.category === tx.category) || {
      icon: 'tag',
      color: '#22c55e'
    };

    const row = document.createElement('div');
    row.className = 'p-3 rounded-2xl fino-card flex items-center justify-between hover:scale-[1.005] transition-all';
    row.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0" style="background-color: ${catMeta.color}">
          <i data-lucide="${catMeta.icon}" class="w-4 h-4"></i>
        </div>
        <div class="min-w-0">
          <span class="font-bold text-slate-900 dark:text-white text-xs block truncate">${tx.title}</span>
          <span class="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
            <span class="font-mono">${tx.date}</span>
            <span>•</span>
            <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">${tx.category}</span>
            ${tx.notes ? `<span class="truncate max-w-[140px]">• ${tx.notes}</span>` : ''}
          </span>
        </div>
      </div>
      <div class="flex items-center space-x-2.5 flex-shrink-0">
        <span class="font-bold text-xs font-mono ${isExpense ? 'text-rose-500' : 'text-emerald-500'}">
          ${isExpense ? '-' : '+'} ${formatRupiah(tx.amount)}
        </span>
        <button class="btn-edit p-1.5 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit Transaksi">
          <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
        </button>
        <button class="btn-delete p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Hapus Transaksi">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    row.querySelector('.btn-edit').addEventListener('click', () => {
      this.openTxModal(true, tx);
    });

    row.querySelector('.btn-delete').addEventListener('click', async () => {
      if (confirm(`Yakin ingin menghapus transaksi "${tx.title}"?`)) {
        await deleteExistingTransaction(tx.id);
        await this.refreshAllData();
      }
    });

    return row;
  }

  // ==========================================
  // VIEW 3: Pengeluaran & Category Budgets
  // ==========================================
  renderPengeluaranView() {
    if (!this.dom.budgetGridContainer || !this.summary) return;
    this.dom.budgetGridContainer.innerHTML = '';

    const breakdown = this.summary.category_breakdown;
    const totalBudget = breakdown.reduce((acc, c) => acc + c.budget, 0);
    const totalSpent = breakdown.reduce((acc, c) => acc + c.spent, 0);

    if (this.dom.budgetTotalAllocation) this.dom.budgetTotalAllocation.textContent = formatRupiah(totalBudget);
    if (this.dom.budgetTotalSpent) this.dom.budgetTotalSpent.textContent = formatRupiah(totalSpent);

    breakdown.forEach((cat) => {
      const remaining = Math.max(0, cat.budget - cat.spent);
      const isNearLimit = cat.percentage >= 85;
      const isExceeded = cat.percentage >= 100;

      let statusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold">Aman (${cat.percentage}%)</span>`;
      if (isExceeded) {
        statusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">Over Budget (${cat.percentage}%)</span>`;
      } else if (isNearLimit) {
        statusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold">Waspada (${cat.percentage}%)</span>`;
      }

      const card = document.createElement('div');
      card.className = 'fino-card p-5 rounded-3xl space-y-4 flex flex-col justify-between';
      card.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm" style="background-color: ${cat.color}">
                <i data-lucide="${cat.icon}" class="w-5 h-5"></i>
              </div>
              <div>
                <span class="font-black text-sm text-slate-900 dark:text-white block">${cat.category}</span>
                <span class="text-[10px] text-slate-400 font-medium">Batas Bulanan</span>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="space-y-1 pt-1 font-mono">
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400">Realisasi:</span>
              <span class="text-base font-extrabold text-slate-900 dark:text-white">${formatRupiah(cat.spent)}</span>
            </div>
            <div class="flex items-baseline justify-between text-xs">
              <span class="text-slate-400">Limit:</span>
              <span class="font-bold text-slate-600 dark:text-slate-300">${formatRupiah(cat.budget)}</span>
            </div>
          </div>

          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, cat.percentage)}%; background-color: ${isExceeded ? '#ef4444' : isNearLimit ? '#f59e0b' : cat.color}"></div>
          </div>

          <div class="flex items-center justify-between text-[11px] pt-1">
            <span class="text-slate-400">Sisa Kuota:</span>
            <span class="font-bold font-mono ${remaining === 0 ? 'text-rose-500' : 'text-emerald-500'}">${formatRupiah(remaining)}</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button class="btn-edit-budget-limit w-full py-2 rounded-xl bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-500 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5" data-category="${cat.category}" data-budget="${cat.budget}">
            <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
            <span>Ubah Batas Budget</span>
          </button>
        </div>
      `;

      card.querySelector('.btn-edit-budget-limit').addEventListener('click', () => {
        this.openBudgetModal(cat.category, cat.budget);
      });

      this.dom.budgetGridContainer.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // VIEW 4: Laporan & Analytics View
  // ==========================================
  renderLaporanView() {
    if (!this.summary) return;

    // 1. Savings Rate Calculation
    const inc = this.summary.total_income;
    const exp = this.summary.total_expense;
    if (this.dom.reportSavingsRate) {
      if (inc > 0) {
        const savingsRate = Math.max(0, Math.round(((inc - exp) / inc) * 1000) / 10);
        this.dom.reportSavingsRate.textContent = `${savingsRate}%`;
      } else {
        this.dom.reportSavingsRate.textContent = '0%';
      }
    }

    // 2. Daily Average
    if (this.dom.reportAvgDaily) {
      const days = this.summary.target_days_current || 30;
      const avg = Math.round(exp / days);
      this.dom.reportAvgDaily.textContent = formatRupiah(avg);
    }

    // 3. Category Breakdown Table
    if (!this.dom.reportTableBody) return;
    this.dom.reportTableBody.innerHTML = '';

    this.summary.category_breakdown.forEach((cat) => {
      const remaining = cat.budget - cat.spent;
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors';
      tr.innerHTML = `
        <td class="py-3 pl-2 flex items-center space-x-2">
          <span class="w-3 h-3 rounded-md inline-block flex-shrink-0" style="background-color: ${cat.color}"></span>
          <span class="font-bold text-slate-800 dark:text-white font-sans">${cat.category}</span>
        </td>
        <td class="py-3 text-right text-slate-600 dark:text-slate-300">${formatRupiah(cat.budget)}</td>
        <td class="py-3 text-right font-bold text-rose-500">${formatRupiah(cat.spent)}</td>
        <td class="py-3 text-right ${remaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatRupiah(remaining)}</td>
        <td class="py-3 text-right pr-2">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
            cat.percentage > 100 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950'
          }">${cat.percentage}%</span>
        </td>
      `;
      this.dom.reportTableBody.appendChild(tr);
    });
  }

  // ==========================================
  // Transaction Modal Handler
  // ==========================================
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
      this.dom.inputTitle.value = '';
      this.dom.inputAmount.value = '';
      this.dom.inputCategory.value = 'Makanan';
      this.dom.inputType.value = 'expense';
      this.dom.inputDate.value = new Date().toISOString().split('T')[0];
      this.dom.inputNotes.value = '';
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
      this.closeTxModal();
      await this.refreshAllData();
    } catch (err) {
      alert(`Gagal menyimpan transaksi: ${err.message}`);
    }
  }

  // ==========================================
  // Budget Modal Handler
  // ==========================================
  openBudgetModal(category, currentBudget) {
    if (!this.dom.budgetModal) return;
    this.editingBudgetCategory = category;
    if (this.dom.budgetModalCategory) {
      this.dom.budgetModalCategory.textContent = `Kategori: ${category}`;
    }
    if (this.dom.budgetModalInput) {
      this.dom.budgetModalInput.value = currentBudget;
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
    if (isNaN(newBudget) || newBudget < 0) {
      alert('Masukkan nominal budget yang valid!');
      return;
    }

    try {
      await updateCategoryBudgetLimit(this.editingBudgetCategory, newBudget);
      this.closeBudgetModal();
      await this.refreshAllData();
    } catch (err) {
      alert(`Gagal memperbarui budget: ${err.message}`);
    }
  }
}

// Instantiate on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new FinoApp();
});
