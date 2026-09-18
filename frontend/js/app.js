/**
 * Fino Dashboard Main Application Controller
 * Handles Bento UI state, calendar strip, transactions CRUD modal, and theme toggling.
 */

import {
  fetchFinancialSummary,
  fetchTransactionsList,
  createNewTransaction,
  updateExistingTransaction,
  deleteExistingTransaction,
  fetchCategoriesMeta
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
    this.summary = null;
    this.transactions = [];
    this.categories = [];
    this.currentFilter = 'all';
    this.isDarkMode = false;
    this.editingTxId = null;

    this.dom = {
      themeToggle: document.getElementById('theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      dateStrip: document.getElementById('date-strip'),
      btnAddTx: document.getElementById('btn-add-tx'),
      modal: document.getElementById('tx-modal'),
      modalTitle: document.getElementById('modal-title'),
      modalForm: document.getElementById('modal-form'),
      modalCancel: document.getElementById('modal-cancel'),
      inputTitle: document.getElementById('input-title'),
      inputAmount: document.getElementById('input-amount'),
      inputCategory: document.getElementById('input-category'),
      inputType: document.getElementById('input-type'),
      inputDate: document.getElementById('input-date'),
      inputNotes: document.getElementById('input-notes'),
      totalBalance: document.getElementById('stat-total-balance'),
      totalExpense: document.getElementById('stat-total-expense'),
      totalIncome: document.getElementById('stat-total-income'),
      txCount: document.getElementById('stat-tx-count'),
      targetDays: document.getElementById('stat-target-days'),
      chartSpline: document.getElementById('chart-spline'),
      chartDonut: document.getElementById('chart-donut'),
      categoryList: document.getElementById('category-list'),
      txContainer: document.getElementById('tx-container'),
      btnFilterAll: document.getElementById('filter-all'),
      btnFilterExpense: document.getElementById('filter-expense'),
      btnFilterIncome: document.getElementById('filter-income')
    };

    this.init();
  }

  async init() {
    // 1. Setup Theme Preference
    const savedTheme = localStorage.getItem('fino-theme');
    if (savedTheme === 'dark') {
      this.setTheme(true);
    } else {
      this.setTheme(false);
    }

    // 2. Bind UI Events
    this.bindEvents();
    this.renderCalendarStrip();

    // 3. Load Initial Backend Data
    await this.refreshDashboard();

    // Responsive Canvas Resize
    window.addEventListener('resize', () => {
      if (this.summary) {
        renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
        renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);
      }
    });
  }

  bindEvents() {
    // Theme Toggle
    if (this.dom.themeToggle) {
      this.dom.themeToggle.addEventListener('click', () => {
        this.setTheme(!this.isDarkMode);
      });
    }

    // Add Transaction Modal Button
    if (this.dom.btnAddTx) {
      this.dom.btnAddTx.addEventListener('click', () => this.openModal(false));
    }

    // Modal Cancel
    if (this.dom.modalCancel) {
      this.dom.modalCancel.addEventListener('click', () => this.closeModal());
    }

    // Modal Form Submit
    if (this.dom.modalForm) {
      this.dom.modalForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Filters
    const setFilter = (type, btn) => {
      this.currentFilter = type;
      [this.dom.btnFilterAll, this.dom.btnFilterExpense, this.dom.btnFilterIncome].forEach(b => {
        if (b) {
          b.classList.remove('bg-emerald-500', 'text-white');
          b.classList.add('bg-transparent', 'text-slate-500');
        }
      });
      if (btn) {
        btn.classList.remove('bg-transparent', 'text-slate-500');
        btn.classList.add('bg-emerald-500', 'text-white');
      }
      this.loadTransactions();
    };

    if (this.dom.btnFilterAll) this.dom.btnFilterAll.addEventListener('click', () => setFilter('all', this.dom.btnFilterAll));
    if (this.dom.btnFilterExpense) this.dom.btnFilterExpense.addEventListener('click', () => setFilter('expense', this.dom.btnFilterExpense));
    if (this.dom.btnFilterIncome) this.dom.btnFilterIncome.addEventListener('click', () => setFilter('income', this.dom.btnFilterIncome));
  }

  setTheme(isDark) {
    this.isDarkMode = isDark;
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('fino-theme', 'dark');
      if (this.dom.themeIcon) {
        this.dom.themeIcon.setAttribute('data-lucide', 'sun');
      }
    } else {
      html.classList.remove('dark');
      localStorage.setItem('fino-theme', 'light');
      if (this.dom.themeIcon) {
        this.dom.themeIcon.setAttribute('data-lucide', 'moon');
      }
    }
    if (window.lucide) window.lucide.createIcons();

    if (this.summary) {
      renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
      renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);
    }
  }

  renderCalendarStrip() {
    if (!this.dom.dateStrip) return;
    this.dom.dateStrip.innerHTML = '';

    const today = new Date();
    const days = [];

    // Generate 7 days around today
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push(d);
    }

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    days.forEach((d) => {
      const isToday = d.toDateString() === today.toDateString();
      const pill = document.createElement('button');
      pill.className = `flex flex-col items-center justify-center w-12 py-2.5 rounded-2xl text-xs transition-all font-medium fino-card ${isToday ? 'day-pill-active font-bold' : 'text-slate-600 dark:text-slate-400 hover:border-emerald-400'}`;
      pill.innerHTML = `
        <span class="text-[10px] uppercase">${dayNames[d.getDay()]}</span>
        <span class="text-sm font-bold mt-0.5">${d.getDate()}</span>
      `;
      pill.addEventListener('click', () => {
        document.querySelectorAll('#date-strip button').forEach(b => b.classList.remove('day-pill-active'));
        pill.classList.add('day-pill-active');
      });
      this.dom.dateStrip.appendChild(pill);
    });
  }

  async refreshDashboard() {
    try {
      this.summary = await fetchFinancialSummary();
      this.categories = await fetchCategoriesMeta();

      this.renderKPIs(this.summary);
      this.renderCategoryBreakdown(this.summary.category_breakdown);
      await this.loadTransactions();

      renderSplineChart(this.dom.chartSpline, this.summary.daily_expenses, this.isDarkMode);
      renderCategoryDonut(this.dom.chartDonut, this.summary.category_breakdown, this.isDarkMode);

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Gagal refresh dashboard:", err);
    }
  }

  renderKPIs(summary) {
    if (this.dom.totalBalance) this.dom.totalBalance.textContent = formatRupiah(summary.total_balance);
    if (this.dom.totalExpense) this.dom.totalExpense.textContent = formatRupiah(summary.total_expense);
    if (this.dom.totalIncome) this.dom.totalIncome.textContent = formatRupiah(summary.total_income);
    if (this.dom.txCount) this.dom.txCount.textContent = `${summary.transactions_count} Transaksi`;
    if (this.dom.targetDays) this.dom.targetDays.textContent = `${summary.target_days_current} / ${summary.target_days_total} Hari`;
  }

  renderCategoryBreakdown(categories) {
    if (!this.dom.categoryList) return;
    this.dom.categoryList.innerHTML = '';

    categories.forEach((cat) => {
      const card = document.createElement('div');
      card.className = 'p-3.5 rounded-2xl fino-card space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-xl flex items-center justify-center text-white" style="background-color: ${cat.color}">
              <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
            </div>
            <div>
              <span class="font-bold text-slate-800 dark:text-white block">${cat.category}</span>
              <span class="text-[10px] text-slate-400">Budget ${formatRupiah(cat.budget)}</span>
            </div>
          </div>
          <span class="font-bold text-slate-700 dark:text-emerald-400 text-xs">${formatRupiah(cat.spent)}</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, cat.percentage)}%; background-color: ${cat.color}"></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400">
          <span>Terpakai ${cat.percentage}%</span>
          <span>Sisa ${formatRupiah(Math.max(0, cat.budget - cat.spent))}</span>
        </div>
      `;
      this.dom.categoryList.appendChild(card);
    });
  }

  async loadTransactions() {
    try {
      const typeParam = this.currentFilter === 'all' ? null : this.currentFilter;
      this.transactions = await fetchTransactionsList(typeParam);
      this.renderTransactionsList(this.transactions);
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Gagal load transaksi:", err);
    }
  }

  renderTransactionsList(transactions) {
    if (!this.dom.txContainer) return;
    this.dom.txContainer.innerHTML = '';

    if (transactions.length === 0) {
      this.dom.txContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          Belum ada transaksi tercatat untuk kategori ini.
        </div>
      `;
      return;
    }

    transactions.forEach((tx) => {
      const isExpense = tx.type === 'expense';
      const catMeta = this.categories.find(c => c.category === tx.category) || { icon: 'tag', color: '#22c55e' };

      const row = document.createElement('div');
      row.className = 'p-3 rounded-2xl fino-card flex items-center justify-between hover:scale-[1.005] transition-all';
      row.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm" style="background-color: ${catMeta.color}">
            <i data-lucide="${catMeta.icon}" class="w-5 h-5"></i>
          </div>
          <div>
            <span class="font-bold text-slate-900 dark:text-white text-xs block">${tx.title}</span>
            <span class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>${tx.date}</span>
              <span>•</span>
              <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">${tx.category}</span>
              ${tx.notes ? `<span>• ${tx.notes}</span>` : ''}
            </span>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="font-bold text-xs ${isExpense ? 'text-rose-500' : 'text-emerald-500'}">
            ${isExpense ? '-' : '+'} ${formatRupiah(tx.amount)}
          </span>
          <button class="btn-edit p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit Transaksi">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button class="btn-delete p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Hapus Transaksi">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      // Event Listeners for Edit & Delete
      row.querySelector('.btn-edit').addEventListener('click', () => {
        this.openModal(true, tx);
      });

      row.querySelector('.btn-delete').addEventListener('click', async () => {
        if (confirm(`Yakin ingin menghapus transaksi "${tx.title}"?`)) {
          await deleteExistingTransaction(tx.id);
          await this.refreshDashboard();
        }
      });

      this.dom.txContainer.appendChild(row);
    });
  }

  openModal(isEdit = false, txData = null) {
    if (!this.dom.modal) return;
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

    this.dom.modal.classList.remove('hidden');
    this.dom.modal.classList.add('flex');
    this.dom.inputTitle.focus();
  }

  closeModal() {
    if (!this.dom.modal) return;
    this.dom.modal.classList.add('hidden');
    this.dom.modal.classList.remove('flex');
    this.editingTxId = null;
  }

  async handleFormSubmit(e) {
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
      this.closeModal();
      await this.refreshDashboard();
    } catch (err) {
      alert(`Gagal menyimpan transaksi: ${err.message}`);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FinoApp();
});
