/**
 * ApexAlpha Main Dashboard State & Interaction Controller
 */

import { fetchAssets, runPortfolioAnalysis, savePortfolioRecord, fetchSavedPortfolios } from './api.js';
import { renderMonteCarloChart, renderEfficientFrontierChart, renderAllocationDonut } from './charts.js';

class ApexAlphaApp {
  constructor() {
    this.assets = [];
    this.assetsMap = {};
    this.allocations = [];
    this.initialCapital = 100000.0;
    this.riskFreeRate = 0.04;
    this.horizonYears = 5;
    this.analysisData = null;

    this.dom = {
      capitalInput: document.getElementById('input-capital'),
      horizonInput: document.getElementById('input-horizon'),
      horizonVal: document.getElementById('horizon-val'),
      rfInput: document.getElementById('input-rf'),
      btnAnalyze: document.getElementById('btn-analyze'),
      btnSave: document.getElementById('btn-save'),
      sliderContainer: document.getElementById('sliders-container'),
      donutCanvas: document.getElementById('donut-canvas'),
      mcCanvas: document.getElementById('monte-carlo-canvas'),
      frontierCanvas: document.getElementById('frontier-canvas'),
      metricReturn: document.getElementById('metric-return'),
      metricVol: document.getElementById('metric-vol'),
      metricSharpe: document.getElementById('metric-sharpe'),
      metricVar: document.getElementById('metric-var'),
      metricCvar: document.getElementById('metric-cvar'),
      metricDrawdown: document.getElementById('metric-drawdown'),
      stressContainer: document.getElementById('stress-container'),
      rebalanceTable: document.getElementById('rebalance-table'),
      savedList: document.getElementById('saved-portfolios-list')
    };

    this.init();
  }

  async init() {
    try {
      this.assets = await fetchAssets();
      this.assets.forEach(a => { this.assetsMap[a.id] = a; });

      // Default Standard Balanced Allocation
      this.allocations = [
        { asset_id: "SP500", weight: 0.35 },
        { asset_id: "TECH", weight: 0.20 },
        { asset_id: "BONDS", weight: 0.25 },
        { asset_id: "GOLD", weight: 0.10 },
        { asset_id: "CRYPTO", weight: 0.10 }
      ];

      this.renderSliders();
      this.bindEvents();
      await this.executeAnalysis();
      await this.loadSavedPortfolios();
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  bindEvents() {
    if (this.dom.capitalInput) {
      this.dom.capitalInput.addEventListener('change', (e) => {
        this.initialCapital = Math.max(1000, parseFloat(e.target.value) || 100000);
        this.executeAnalysis();
      });
    }

    if (this.dom.horizonInput) {
      this.dom.horizonInput.addEventListener('input', (e) => {
        this.horizonYears = parseInt(e.target.value, 10);
        if (this.dom.horizonVal) this.dom.horizonVal.textContent = `${this.horizonYears} Yrs`;
      });
      this.dom.horizonInput.addEventListener('change', () => this.executeAnalysis());
    }

    if (this.dom.rfInput) {
      this.dom.rfInput.addEventListener('change', (e) => {
        this.riskFreeRate = Math.max(0.0, Math.min(0.20, (parseFloat(e.target.value) || 4.0) / 100));
        this.executeAnalysis();
      });
    }

    if (this.dom.btnAnalyze) {
      this.dom.btnAnalyze.addEventListener('click', () => this.executeAnalysis());
    }

    if (this.dom.btnSave) {
      this.dom.btnSave.addEventListener('click', () => this.saveCurrentPortfolio());
    }

    window.addEventListener('resize', () => {
      if (this.analysisData) {
        renderMonteCarloChart(this.dom.mcCanvas, this.analysisData.monte_carlo);
        renderEfficientFrontierChart(
          this.dom.frontierCanvas,
          this.analysisData.efficient_frontier,
          {
            volatility: this.analysisData.metrics.annualized_volatility,
            return: this.analysisData.metrics.expected_annual_return
          }
        );
        renderAllocationDonut(this.dom.donutCanvas, this.allocations, this.assetsMap);
      }
    });
  }

  renderSliders() {
    if (!this.dom.sliderContainer) return;
    this.dom.sliderContainer.innerHTML = '';

    this.allocations.forEach((alloc) => {
      const asset = this.assetsMap[alloc.asset_id];
      if (!asset) return;

      const card = document.createElement('div');
      card.className = 'p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full shadow-sm" style="background-color: ${asset.color}"></span>
            <span class="font-bold text-white">${asset.name}</span>
          </div>
          <span id="pct-${asset.id}" class="font-mono font-bold text-cyan-400 text-xs">${Math.round(alloc.weight * 100)}%</span>
        </div>
        <input 
          id="slider-${asset.id}" 
          type="range" 
          min="0" 
          max="100" 
          step="1" 
          value="${Math.round(alloc.weight * 100)}" 
          class="w-full cursor-pointer"
        >
        <div class="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>Exp Ret: ${(asset.expected_return * 100).toFixed(1)}%</span>
          <span>Vol: ${(asset.volatility * 100).toFixed(1)}%</span>
        </div>
      `;

      this.dom.sliderContainer.appendChild(card);

      const slider = card.querySelector(`#slider-${asset.id}`);
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.updateWeight(asset.id, val / 100);
      });
      slider.addEventListener('change', () => this.executeAnalysis());
    });

    renderAllocationDonut(this.dom.donutCanvas, this.allocations, this.assetsMap);
  }

  updateWeight(modifiedAssetId, newWeight) {
    const remainingWeight = Math.max(0, 1.0 - newWeight);
    const otherAllocations = this.allocations.filter(a => a.asset_id !== modifiedAssetId);
    const otherSum = otherAllocations.reduce((sum, a) => sum + a.weight, 0);

    this.allocations.forEach(a => {
      if (a.asset_id === modifiedAssetId) {
        a.weight = newWeight;
      } else if (otherSum > 0) {
        a.weight = (a.weight / otherSum) * remainingWeight;
      } else {
        a.weight = remainingWeight / otherAllocations.length;
      }
    });

    // Update slider UI labels
    this.allocations.forEach(a => {
      const pctEl = document.getElementById(`pct-${a.asset_id}`);
      const sliderEl = document.getElementById(`slider-${a.asset_id}`);
      if (pctEl) pctEl.textContent = `${Math.round(a.weight * 100)}%`;
      if (sliderEl && a.asset_id !== modifiedAssetId) sliderEl.value = Math.round(a.weight * 100);
    });

    renderAllocationDonut(this.dom.donutCanvas, this.allocations, this.assetsMap);
  }

  async executeAnalysis() {
    try {
      const payload = {
        initial_capital: this.initialCapital,
        risk_free_rate: this.riskFreeRate,
        horizon_years: this.horizonYears,
        allocations: this.allocations.map(a => ({ asset_id: a.asset_id, weight: a.weight }))
      };

      this.analysisData = await runPortfolioAnalysis(payload);
      this.renderMetrics(this.analysisData.metrics, this.analysisData.monte_carlo);
      this.renderStressTests(this.analysisData.stress_tests);
      this.renderRebalanceTable(this.analysisData.rebalance_orders);

      renderMonteCarloChart(this.dom.mcCanvas, this.analysisData.monte_carlo);
      renderEfficientFrontierChart(
        this.dom.frontierCanvas,
        this.analysisData.efficient_frontier,
        {
          volatility: this.analysisData.metrics.annualized_volatility,
          return: this.analysisData.metrics.expected_annual_return
        }
      );
    } catch (err) {
      console.error("Analysis execution error:", err);
    }
  }

  renderMetrics(metrics, mc) {
    if (this.dom.metricReturn) this.dom.metricReturn.textContent = `${(metrics.expected_annual_return * 100).toFixed(2)}%`;
    if (this.dom.metricVol) this.dom.metricVol.textContent = `${(metrics.annualized_volatility * 100).toFixed(2)}%`;
    if (this.dom.metricSharpe) this.dom.metricSharpe.textContent = metrics.sharpe_ratio.toFixed(2);
    if (this.dom.metricVar) this.dom.metricVar.textContent = `-${mc.var_95_percent.toFixed(2)}%`;
    if (this.dom.metricCvar) this.dom.metricCvar.textContent = `-${mc.cvar_95_percent.toFixed(2)}%`;
    if (this.dom.metricDrawdown) this.dom.metricDrawdown.textContent = `-${mc.max_drawdown_percent.toFixed(2)}%`;
  }

  renderStressTests(tests) {
    if (!this.dom.stressContainer) return;
    this.dom.stressContainer.innerHTML = '';

    tests.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between';
      const isLoss = t.impact_percent < 0;
      card.innerHTML = `
        <div class="space-y-0.5">
          <span class="text-xs font-bold text-white block">${t.scenario_name}</span>
          <span class="text-[10px] text-slate-400 block">${t.description}</span>
        </div>
        <div class="text-right font-mono">
          <span class="text-xs font-bold ${isLoss ? 'text-rose-400' : 'text-emerald-400'} block">
            ${isLoss ? '' : '+'}${t.impact_percent.toFixed(1)}%
          </span>
          <span class="text-[10px] text-slate-500 block">
            ${isLoss ? `-$${Math.round(t.capital_lost).toLocaleString()}` : 'No Capital Lost'}
          </span>
        </div>
      `;
      this.dom.stressContainer.appendChild(card);
    });
  }

  renderRebalanceTable(orders) {
    if (!this.dom.rebalanceTable) return;
    this.dom.rebalanceTable.innerHTML = '';

    orders.forEach((o) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-slate-800/60 text-xs font-mono';
      
      let badgeClass = 'bg-slate-800 text-slate-400';
      if (o.action === 'BUY') badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      else if (o.action === 'SELL') badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

      row.innerHTML = `
        <td class="py-2.5 px-3 font-sans font-medium text-white">${o.asset_name}</td>
        <td class="py-2.5 px-3 text-slate-400">${o.current_weight.toFixed(1)}%</td>
        <td class="py-2.5 px-3 text-cyan-300 font-bold">${o.target_weight.toFixed(1)}%</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badgeClass}">
            ${o.action}
          </span>
        </td>
        <td class="py-2.5 px-3 text-right font-bold ${o.action === 'BUY' ? 'text-emerald-400' : o.action === 'SELL' ? 'text-rose-400' : 'text-slate-500'}">
          ${o.action !== 'HOLD' ? `$${Math.round(o.amount_usd).toLocaleString()}` : '$0'}
        </td>
      `;
      this.dom.rebalanceTable.appendChild(row);
    });
  }

  async saveCurrentPortfolio() {
    const name = prompt("Enter a name for this portfolio configuration:", `Portfolio ${new Date().toLocaleDateString()}`);
    if (!name) return;

    try {
      const payload = {
        name,
        initial_capital: this.initialCapital,
        risk_free_rate: this.riskFreeRate,
        horizon_years: this.horizonYears,
        allocations: this.allocations
      };
      await savePortfolioRecord(payload);
      alert(`Portfolio "${name}" successfully saved to SQLite database!`);
      await this.loadSavedPortfolios();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  }

  async loadSavedPortfolios() {
    if (!this.dom.savedList) return;
    try {
      const saved = await fetchSavedPortfolios();
      this.dom.savedList.innerHTML = '';
      if (saved.length === 0) {
        this.dom.savedList.innerHTML = '<span class="text-[11px] text-slate-500 italic">No saved configurations yet.</span>';
        return;
      }

      saved.forEach((item) => {
        const pill = document.createElement('button');
        pill.className = 'px-3 py-1 rounded-xl text-xs bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all';
        pill.textContent = `${item.name} ($${Math.round(item.initial_capital).toLocaleString()})`;
        pill.addEventListener('click', () => {
          this.initialCapital = item.initial_capital;
          this.riskFreeRate = item.risk_free_rate;
          this.horizonYears = item.horizon_years;
          this.allocations = item.allocations;
          if (this.dom.capitalInput) this.dom.capitalInput.value = this.initialCapital;
          if (this.dom.horizonInput) this.dom.horizonInput.value = this.horizonYears;
          if (this.dom.horizonVal) this.dom.horizonVal.textContent = `${this.horizonYears} Yrs`;
          if (this.dom.rfInput) this.dom.rfInput.value = (this.riskFreeRate * 100).toFixed(1);
          this.renderSliders();
          this.executeAnalysis();
        });
        this.dom.savedList.appendChild(pill);
      });
    } catch (err) {
      console.error("Load saved error:", err);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ApexAlphaApp();
  if (window.lucide) window.lucide.createIcons();
});
