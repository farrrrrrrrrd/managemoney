"""
ApexAlpha Repository & Persistence Layer
Provides canonical asset universe, historical correlation matrix, and SQLite portfolio storage.
"""

import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np

from backend.app.domain.models import Asset

DB_PATH = Path(__file__).resolve().parent.parent.parent / "apexalpha.db"

# Canonical Investable Asset Universe with realistic historical market baselines
DEFAULT_ASSETS: Dict[str, Asset] = {
    "SP500": Asset(
        id="SP500",
        name="S&P 500 US Large Cap Index",
        category="Equities",
        expected_return=0.105,
        volatility=0.155,
        color="#38bdf8"
    ),
    "TECH": Asset(
        id="TECH",
        name="Nasdaq-100 High-Growth Tech",
        category="Equities",
        expected_return=0.148,
        volatility=0.220,
        color="#a855f7"
    ),
    "BONDS": Asset(
        id="BONDS",
        name="US 10-Year Treasury Bonds",
        category="Fixed Income",
        expected_return=0.042,
        volatility=0.065,
        color="#10b981"
    ),
    "GOLD": Asset(
        id="GOLD",
        name="Gold Physical Bullion ETF",
        category="Commodities",
        expected_return=0.075,
        volatility=0.140,
        color="#f59e0b"
    ),
    "CRYPTO": Asset(
        id="CRYPTO",
        name="Bitcoin / Digital Assets Index",
        category="Crypto",
        expected_return=0.280,
        volatility=0.550,
        color="#ec4899"
    ),
}

# Empirical Multi-Asset Correlation Matrix
CORRELATION_MATRIX: Dict[str, Dict[str, float]] = {
    "SP500":  {"SP500": 1.00, "TECH": 0.88, "BONDS": 0.10, "GOLD": 0.05, "CRYPTO": 0.35},
    "TECH":   {"SP500": 0.88, "TECH": 1.00, "BONDS": 0.05, "GOLD": 0.08, "CRYPTO": 0.42},
    "BONDS":  {"SP500": 0.10, "TECH": 0.05, "BONDS": 1.00, "GOLD": 0.25, "CRYPTO": -0.05},
    "GOLD":   {"SP500": 0.05, "TECH": 0.08, "BONDS": 0.25, "GOLD": 1.00, "CRYPTO": 0.12},
    "CRYPTO": {"SP500": 0.35, "TECH": 0.42, "BONDS": -0.05, "GOLD": 0.12, "CRYPTO": 1.00},
}


def init_db():
    """Initializes the SQLite database with required tables and indexes."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            initial_capital REAL NOT NULL,
            risk_free_rate REAL NOT NULL,
            horizon_years INTEGER NOT NULL,
            allocations_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON saved_portfolios(created_at)")
    conn.commit()
    conn.close()


def save_portfolio(name: str, capital: float, rf_rate: float, horizon: int, allocations: list) -> int:
    """Saves a portfolio configuration to SQLite and returns the record ID."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO saved_portfolios (name, initial_capital, risk_free_rate, horizon_years, allocations_json)
        VALUES (?, ?, ?, ?, ?)
    """, (name, capital, rf_rate, horizon, json.dumps(allocations)))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id


def list_saved_portfolios() -> List[Dict]:
    """Retrieves all saved portfolio configurations."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, initial_capital, risk_free_rate, horizon_years, allocations_json, created_at FROM saved_portfolios ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r[0],
            "name": r[1],
            "initial_capital": r[2],
            "risk_free_rate": r[3],
            "horizon_years": r[4],
            "allocations": json.loads(r[5]),
            "created_at": r[6]
        })
    return results


def get_covariance_matrix(asset_ids: List[str]) -> np.ndarray:
    """
    Computes covariance matrix Sigma = D * R * D
    where D = diag(volatilities) and R = correlation matrix.
    """
    n = len(asset_ids)
    vols = np.array([DEFAULT_ASSETS[aid].volatility for aid in asset_ids])
    corr = np.zeros((n, n))

    for i, a1 in enumerate(asset_ids):
        for j, a2 in enumerate(asset_ids):
            corr[i, j] = CORRELATION_MATRIX.get(a1, {}).get(a2, 0.0)

    cov = np.outer(vols, vols) * corr
    return cov


# Auto-initialize database schema upon import
init_db()
