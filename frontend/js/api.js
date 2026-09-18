/**
 * ApexAlpha API Client
 * Clean Async Fetch Service for REST Endpoints.
 */

const API_BASE = '';

export async function fetchAssets() {
  const res = await fetch(`${API_BASE}/api/assets`);
  if (!res.ok) throw new Error(`Failed to load assets: ${res.statusText}`);
  return await res.json();
}

export async function runPortfolioAnalysis(payload) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Analysis request failed');
  }
  return await res.json();
}

export async function savePortfolioRecord(payload) {
  const res = await fetch(`${API_BASE}/api/portfolios/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to save portfolio');
  return await res.json();
}

export async function fetchSavedPortfolios() {
  const res = await fetch(`${API_BASE}/api/portfolios/saved`);
  if (!res.ok) throw new Error('Failed to fetch saved portfolios');
  return await res.json();
}
