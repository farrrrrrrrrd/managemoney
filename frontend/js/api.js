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
