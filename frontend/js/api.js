/**
 * Ried Dashboard API Client
 */

const API_BASE = '';

export async function fetchFinancialSummary() {
  const res = await fetch(`${API_BASE}/api/summary`);
  if (!res.ok) throw new Error('Gagal memuat ringkasan keuangan');
  return await res.json();
}

export async function fetchTransactionsList(type = null, category = null, search = null) {
  let url = `${API_BASE}/api/transactions?limit=150`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal memuat daftar transaksi');
  return await res.json();
}

export async function createNewTransaction(payload) {
  const res = await fetch(`${API_BASE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal membuat transaksi' }));
    throw new Error(err.detail || 'Gagal membuat transaksi');
  }
  return await res.json();
}

export async function updateExistingTransaction(id, payload) {
  const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal memperbarui transaksi' }));
    throw new Error(err.detail || 'Gagal memperbarui transaksi');
  }
  return await res.json();
}

export async function deleteExistingTransaction(id) {
  const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Gagal menghapus transaksi');
  return await res.json();
}

export async function fetchCategoriesMeta() {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error('Gagal memuat kategori');
  return await res.json();
}

export async function updateCategoryBudgetLimit(category, newBudget) {
  const res = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(category)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ budget: parseFloat(newBudget) })
  });
  if (!res.ok) throw new Error('Gagal memperbarui budget kategori');
  return await res.json();
}

// Portfolio & Investasi
export async function fetchPortfolioAssets() {
  const res = await fetch(`${API_BASE}/api/portfolio/assets`);
  if (!res.ok) throw new Error('Gagal memuat daftar aset portofolio');
  return await res.json();
}

export async function analyzePortfolio(payload) {
  const res = await fetch(`${API_BASE}/api/portfolio/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal menganalisis portofolio' }));
    const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
    throw new Error(msg);
  }
  return await res.json();
}

// Target Tabungan (Celengan Impian)
export async function fetchSavingsGoals() {
  const res = await fetch(`${API_BASE}/api/savings-goals`);
  if (!res.ok) throw new Error('Gagal memuat target tabungan');
  return await res.json();
}

export async function createSavingsGoal(payload) {
  const res = await fetch(`${API_BASE}/api/savings-goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal membuat target tabungan' }));
    throw new Error(err.detail || 'Gagal membuat target tabungan');
  }
  return await res.json();
}

export async function depositSavingsGoal(goalId, amount) {
  const res = await fetch(`${API_BASE}/api/savings-goals/${goalId}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: parseFloat(amount) })
  });
  if (!res.ok) throw new Error('Gagal memperbarui saldo tabungan');
  return await res.json();
}

export async function deleteSavingsGoal(goalId) {
  const res = await fetch(`${API_BASE}/api/savings-goals/${goalId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Gagal menghapus target tabungan');
  return await res.json();
}

// Smart Financial Health Radar
export async function fetchFinancialHealth() {
  const res = await fetch(`${API_BASE}/api/financial-health`);
  if (!res.ok) throw new Error('Gagal memuat analisis kesehatan finansial');
  return await res.json();
}

