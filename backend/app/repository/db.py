"""
Ried Financial Repository & Persistence Layer
Dual-mode PostgreSQL (Supabase Cloud) with resilient SQLite local fallback.
Zero AI Slop - 100% Complete Production Implementation.
"""

import os
import sqlite3
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional, Any
import csv
import io
import calendar
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
import httpx
from dotenv import load_dotenv

from backend.app.domain.models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    FinancialSummary,
    CategoryBudget,
    DailyExpenseDataPoint,
    Asset,
    SavingsGoal,
    SavingsGoalCreate,
    Rule503020,
    FinancialHealthResult
)

logger = logging.getLogger("ried.repository")

# Load environment configuration
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
if not ENV_PATH.exists():
    ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)

DB_PATH = Path(__file__).resolve().parent.parent.parent / "ried_finance.db"

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
DB_BACKEND = os.getenv("DB_BACKEND", "sqlite").lower()

_supabase_client: Optional[httpx.Client] = None


def is_supabase_enabled() -> bool:
    """Returns True if Supabase backend is configured and enabled."""
    return bool(DB_BACKEND == "supabase" and SUPABASE_URL and SUPABASE_ANON_KEY)


def get_supabase_client() -> httpx.Client:
    """Provides a singleton synchronous HTTP client for Supabase PostgREST API."""
    global _supabase_client
    if _supabase_client is None or _supabase_client.is_closed:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
        }
        _supabase_client = httpx.Client(
            base_url=f"{SUPABASE_URL}/rest/v1",
            headers=headers,
            timeout=10.0
        )
    return _supabase_client


# ============================================================================
# CANONICAL ASSET UNIVERSE & COVARIANCE (PORTFOLIO ENGINE)
# ============================================================================

DEFAULT_ASSETS: Dict[str, Asset] = {
    "SP500": Asset(
        id="SP500",
        name="S&P 500 / Saham Bluechip",
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
        name="Obligasi Negara SBN / 10Y Bonds",
        category="Fixed Income",
        expected_return=0.042,
        volatility=0.065,
        color="#10b981"
    ),
    "GOLD": Asset(
        id="GOLD",
        name="Emas Logam Mulia Antam",
        category="Commodities",
        expected_return=0.075,
        volatility=0.140,
        color="#f59e0b"
    ),
    "CRYPTO": Asset(
        id="CRYPTO",
        name="Bitcoin / Crypto Digital Asset",
        category="Crypto",
        expected_return=0.250,
        volatility=0.550,
        color="#ec4899"
    )
}

CORRELATION_MATRIX = {
    "SP500":  {"SP500": 1.00, "TECH": 0.85, "BONDS": -0.15, "GOLD": 0.05, "CRYPTO": 0.35},
    "TECH":   {"SP500": 0.85, "TECH": 1.00, "BONDS": -0.20, "GOLD": 0.00, "CRYPTO": 0.45},
    "BONDS":  {"SP500": -0.15, "TECH": -0.20, "BONDS": 1.00, "GOLD": 0.20, "CRYPTO": -0.05},
    "GOLD":   {"SP500": 0.05, "TECH": 0.00, "BONDS": 0.20, "GOLD": 1.00, "CRYPTO": 0.10},
    "CRYPTO": {"SP500": 0.35, "TECH": 0.45, "BONDS": -0.05, "GOLD": 0.10, "CRYPTO": 1.00}
}


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


CATEGORY_DEFAULTS = {
    "Makanan": {"budget": 2500000.0, "color": "#22c55e", "icon": "utensils"},
    "Tagihan": {"budget": 1500000.0, "color": "#3b82f6", "icon": "receipt"},
    "Transportasi": {"budget": 800000.0, "color": "#f59e0b", "icon": "car"},
    "Belanja": {"budget": 1200000.0, "color": "#ec4899", "icon": "shopping-bag"},
    "Rumah": {"budget": 1000000.0, "color": "#a855f7", "icon": "home"},
    "Pendidikan": {"budget": 600000.0, "color": "#06b6d4", "icon": "book-open"},
    "Hiburan": {"budget": 500000.0, "color": "#eab308", "icon": "gamepad-2"},
}


# ============================================================================
# SQLITE LOCAL STORAGE ENGINE & INITIALIZATION
# ============================================================================

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions(type)")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS category_budgets (
            category TEXT PRIMARY KEY,
            budget REAL NOT NULL,
            color TEXT NOT NULL,
            icon TEXT NOT NULL
        )
    """)

    for cat, meta in CATEGORY_DEFAULTS.items():
        cursor.execute("""
            INSERT OR IGNORE INTO category_budgets (category, budget, color, icon)
            VALUES (?, ?, ?, ?)
        """, (cat, meta["budget"], meta["color"], meta["icon"]))

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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS savings_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0.0,
            category TEXT NOT NULL,
            color TEXT NOT NULL,
            icon TEXT NOT NULL,
            target_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM savings_goals")
    goals_count = cursor.fetchone()[0]
    if goals_count == 0:
        default_goals = [
            ("Dana Darurat (6 Bulan)", 30000000.0, 18500000.0, "Darurat", "#10b981", "shield-check", "2026-12-31"),
            ("Beli iPhone 17 Pro", 22000000.0, 8800000.0, "Gadget", "#3b82f6", "smartphone", "2027-02-28"),
            ("Liburan ke Jepang Musim Semi", 25000000.0, 16250000.0, "Liburan", "#ec4899", "plane", "2027-04-15")
        ]
        for g in default_goals:
            cursor.execute("""
                INSERT INTO savings_goals (title, target_amount, current_amount, category, color, icon, target_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, g)

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM transactions")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_sample_data(cursor)
        conn.commit()

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE substr(date, 1, 7) = '2026-08'")
    aug_count = cursor.fetchone()[0]
    if aug_count == 0:
        seed_historical_months(cursor)
        conn.commit()

    conn.close()


def seed_sample_data(cursor):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(15)]

    sample_txs = [
        ("Gaji Bulanan", 12500000.0, "Gaji", "income", dates[14], "Transfer payroll perusahaan"),
        ("Project Freelance UI/UX", 4096500.0, "Freelance", "income", dates[7], "Pembayaran klien aplikasi"),
        ("Sewa Apartemen & Maintenance", 2200000.0, "Rumah", "expense", dates[12], "Sewa bulanan studio"),
        ("Belanja Bulanan Supermarket", 1120000.0, "Belanja", "expense", dates[10], "Sayur, buah, kebutuhan dapur"),
        ("Tagihan Listrik & Air PLN", 823500.0, "Tagihan", "expense", dates[9], "Token listrik & PDAM"),
        ("Wifi Internet Fiber Optic", 450000.0, "Tagihan", "expense", dates[8], "IndiHome 50 Mbps"),
        ("Bensin Mobil Pertamax", 350000.0, "Transportasi", "expense", dates[6], "Full tank SPBU"),
        ("Makan Malam Bersama Keluarga", 420000.0, "Makanan", "expense", dates[5], "Restoran Seafood"),
        ("Kopi & Pastry Artisan", 78500.0, "Makanan", "expense", dates[4], "Fore Coffee"),
        ("Langganan Spotify & Netflix", 186000.0, "Hiburan", "expense", dates[3], "Family plan streaming"),
        ("Kursus Python & Next.js", 350000.0, "Pendidikan", "expense", dates[2], "Udemy lifetime access"),
        ("GrabCar ke Kantor Meeting", 65000.0, "Transportasi", "expense", dates[1], "Perjalanan bisnis"),
        ("Makan Siang Nasi Padang", 45000.0, "Makanan", "expense", dates[0], "Rendang komplit"),
        ("Beli E-Toll & Parkir", 50000.0, "Transportasi", "expense", dates[0], "Top-up Flazz"),
        ("Snack & Minuman Minimarket", 64000.0, "Makanan", "expense", dates[0], "Camilan malam")
    ]

    for title, amount, category, tx_type, date_str, notes in sample_txs:
        cursor.execute("""
            INSERT INTO transactions (title, amount, category, type, date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (title, amount, category, tx_type, date_str, notes))


def seed_historical_months(cursor):
    historical_txs = [
        ("Gaji Bulanan Agustus", 12500000.0, "Gaji", "income", "2026-08-25", "Transfer payroll Agustus"),
        ("Project Freelance Web Dashboard", 3800000.0, "Freelance", "income", "2026-08-10", "Klien Tech Bandung"),
        ("Sewa Apartemen Studio", 2200000.0, "Rumah", "expense", "2026-08-01", "Sewa bulanan Agustus"),
        ("Belanja Bulanan Supermarket", 1280000.0, "Belanja", "expense", "2026-08-04", "Bahan makanan & toiletry"),
        ("Tagihan Listrik PLN & Air", 790000.0, "Tagihan", "expense", "2026-08-08", "PLN pascabayar & PAM"),
        ("Internet Wifi Fiber Optic", 450000.0, "Tagihan", "expense", "2026-08-10", "IndiHome 50 Mbps"),
        ("Bensin Mobil Pertamax", 350000.0, "Transportasi", "expense", "2026-08-13", "SPBU Kuningan"),
        ("Makan Malam Bersama Keluarga", 520000.0, "Makanan", "expense", "2026-08-16", "Restoran Sunda"),
        ("Kopi & Brunch Cafe", 85000.0, "Makanan", "expense", "2026-08-19", "Work from cafe"),
        ("Langganan Spotify & Netflix", 186000.0, "Hiburan", "expense", "2026-08-22", "Tagihan streaming"),
        ("Servis Rutin Berkala Mobil", 680000.0, "Transportasi", "expense", "2026-08-25", "Ganti oli & filter"),
        ("Buku & Kursus Cloud Architecture", 320000.0, "Pendidikan", "expense", "2026-08-28", "Buku O'Reilly"),
        ("Makan Siang & Kopi", 65000.0, "Makanan", "expense", "2026-08-30", "Nasi campur & es teh"),

        ("Gaji Bulanan Juli", 12500000.0, "Gaji", "income", "2026-07-25", "Transfer payroll Juli"),
        ("Bonus Kinerja Q2", 4500000.0, "Gaji", "income", "2026-07-15", "Bonus performa kerja semester 1"),
        ("Sewa Apartemen Studio", 2200000.0, "Rumah", "expense", "2026-07-01", "Sewa bulanan Juli"),
        ("Belanja Mingguan Hypermart", 980000.0, "Belanja", "expense", "2026-07-05", "Kebutuhan bulanan"),
        ("Tagihan Listrik PLN", 815000.0, "Tagihan", "expense", "2026-07-08", "Token listrik 2200VA"),
        ("Internet Wifi Fiber Optic", 450000.0, "Tagihan", "expense", "2026-07-10", "IndiHome 50 Mbps"),
        ("Tiket Wisata Keluarga & Hotel", 1850000.0, "Hiburan", "expense", "2026-07-12", "Liburan weekend Bandung"),
        ("Bensin Tol Cipularang", 400000.0, "Transportasi", "expense", "2026-07-17", "Perjalanan Bandung"),
        ("Kuliner Khas & Makan Bersama", 420000.0, "Makanan", "expense", "2026-07-20", "Kuliner akhir pekan"),
        ("Sepatu Olahraga Running", 899000.0, "Belanja", "expense", "2026-07-24", "Sepatu lari marathon"),
        ("Langganan Spotify & Netflix", 186000.0, "Hiburan", "expense", "2026-07-29", "Tagihan streaming")
    ]

    for title, amount, category, tx_type, date_str, notes in historical_txs:
        cursor.execute("""
            INSERT INTO transactions (title, amount, category, type, date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (title, amount, category, tx_type, date_str, notes))


# ============================================================================
# SQLITE CRUD IMPLEMENTATIONS (INTERNAL ENGINE)
# ============================================================================

def _sqlite_create_transaction(data: TransactionCreate) -> Transaction:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO transactions (title, amount, category, type, date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (data.title, data.amount, data.category, data.type, data.date, data.notes))
    tx_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return Transaction(**dict(row))


def _sqlite_create_transaction_with_id(tx_id: int, data: TransactionCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO transactions (id, title, amount, category, type, date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (tx_id, data.title, data.amount, data.category, data.type, data.date, data.notes))
    conn.commit()
    conn.close()


def _sqlite_get_transactions(
    limit: int = 100,
    tx_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Transaction]:
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM transactions WHERE 1=1"
    params = []
    if tx_type:
        query += " AND type = ?"
        params.append(tx_type)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (title LIKE ? OR notes LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
    if month:
        query += " AND substr(date, 1, 7) = ?"
        params.append(month)
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    query += " ORDER BY date DESC, id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [Transaction(**dict(r)) for r in rows]


def _sqlite_get_transaction_by_id(tx_id: int) -> Optional[Transaction]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return Transaction(**dict(row)) if row else None


def _sqlite_update_transaction(tx_id: int, data: TransactionUpdate) -> Optional[Transaction]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return None

    update_fields = []
    values = []
    data_dict = data.model_dump(exclude_unset=True)

    for key, val in data_dict.items():
        update_fields.append(f"{key} = ?")
        values.append(val)

    if not update_fields:
        conn.close()
        return Transaction(**dict(existing))

    values.append(tx_id)
    sql = f"UPDATE transactions SET {', '.join(update_fields)} WHERE id = ?"
    cursor.execute(sql, values)
    conn.commit()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = cursor.fetchone()
    conn.close()
    return Transaction(**dict(updated))


def _sqlite_delete_transaction(tx_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def _sqlite_update_category_budget(category: str, new_budget: float) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE category_budgets SET budget = ? WHERE category = ?", (new_budget, category))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def _sqlite_get_category_budgets() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, budget, color, icon FROM category_budgets")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _sqlite_get_distinct_months() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT substr(date, 1, 7) as ym,
               COUNT(*) as tx_count,
               COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
        FROM transactions
        WHERE date IS NOT NULL AND length(date) >= 7
        GROUP BY ym
        ORDER BY ym DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    months_map_id = {
        "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
        "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
        "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
    }

    result = []
    for r in rows:
        ym = r["ym"]
        parts = ym.split("-")
        label = f"{months_map_id.get(parts[1], parts[1])} {parts[0]}" if len(parts) == 2 else ym
        result.append({
            "month": ym,
            "label": label,
            "tx_count": r["tx_count"],
            "total_expense": float(r["total_expense"])
        })
    return result


def _sqlite_save_portfolio(name: str, capital: float, rf_rate: float, horizon: int, allocations: List[Dict]) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO saved_portfolios (name, initial_capital, risk_free_rate, horizon_years, allocations_json)
        VALUES (?, ?, ?, ?, ?)
    """, (name, capital, rf_rate, horizon, json.dumps(allocations)))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id


def _sqlite_list_saved_portfolios() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, initial_capital, risk_free_rate, horizon_years, allocations_json, created_at FROM saved_portfolios ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "name": r["name"],
            "initial_capital": r["initial_capital"],
            "risk_free_rate": r["risk_free_rate"],
            "horizon_years": r["horizon_years"],
            "allocations": json.loads(r["allocations_json"]),
            "created_at": r["created_at"]
        })
    return results


def _sqlite_get_savings_goals() -> List[SavingsGoal]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM savings_goals ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        target = float(r["target_amount"])
        current = float(r["current_amount"])
        pct = round((current / target) * 100, 1) if target > 0 else 0.0
        remaining = max(0.0, target - current)
        results.append(SavingsGoal(
            id=r["id"],
            title=r["title"],
            target_amount=target,
            current_amount=current,
            category=r["category"],
            color=r["color"],
            icon=r["icon"],
            target_date=r["target_date"],
            percentage=pct,
            remaining_amount=remaining,
            created_at=str(r["created_at"])
        ))
    return results


def _sqlite_create_savings_goal(data: SavingsGoalCreate) -> SavingsGoal:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO savings_goals (title, target_amount, current_amount, category, color, icon, target_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (data.title, data.target_amount, data.initial_deposit, data.category, data.color, data.icon, data.target_date))
    goal_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM savings_goals WHERE id = ?", (goal_id,))
    row = cursor.fetchone()
    conn.close()

    target = float(row["target_amount"])
    current = float(row["current_amount"])
    pct = round((current / target) * 100, 1) if target > 0 else 0.0
    return SavingsGoal(
        id=row["id"],
        title=row["title"],
        target_amount=target,
        current_amount=current,
        category=row["category"],
        color=row["color"],
        icon=row["icon"],
        target_date=row["target_date"],
        percentage=pct,
        remaining_amount=max(0.0, target - current),
        created_at=str(row["created_at"])
    )


def _sqlite_create_savings_goal_with_id(goal_id: int, data: SavingsGoalCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO savings_goals (id, title, target_amount, current_amount, category, color, icon, target_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (goal_id, data.title, data.target_amount, data.initial_deposit, data.category, data.color, data.icon, data.target_date))
    conn.commit()
    conn.close()


def _sqlite_deposit_savings_goal(goal_id: int, amount: float) -> Optional[SavingsGoal]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM savings_goals WHERE id = ?", (goal_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    new_amount = max(0.0, float(row["current_amount"]) + amount)
    cursor.execute("UPDATE savings_goals SET current_amount = ? WHERE id = ?", (new_amount, goal_id))
    conn.commit()

    cursor.execute("SELECT * FROM savings_goals WHERE id = ?", (goal_id,))
    updated = cursor.fetchone()
    conn.close()

    target = float(updated["target_amount"])
    pct = round((new_amount / target) * 100, 1) if target > 0 else 0.0
    return SavingsGoal(
        id=updated["id"],
        title=updated["title"],
        target_amount=target,
        current_amount=new_amount,
        category=updated["category"],
        color=updated["color"],
        icon=updated["icon"],
        target_date=updated["target_date"],
        percentage=pct,
        remaining_amount=max(0.0, target - new_amount),
        created_at=str(updated["created_at"])
    )


def _sqlite_delete_savings_goal(goal_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM savings_goals WHERE id = ?", (goal_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def _sqlite_get_financial_summary(
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> FinancialSummary:
    conn = get_connection()
    cursor = conn.cursor()

    where_clauses = []
    params = []

    if month:
        where_clauses.append("substr(date, 1, 7) = ?")
        params.append(month)
    elif start_date and end_date:
        where_clauses.append("date BETWEEN ? AND ?")
        params.extend([start_date, end_date])
    elif start_date:
        where_clauses.append("date >= ?")
        params.append(start_date)
    elif end_date:
        where_clauses.append("date <= ?")
        params.append(end_date)

    date_filter = f" AND {' AND '.join(where_clauses)}" if where_clauses else ""
    date_where = f" WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    cursor.execute(f"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income'{date_filter}", params)
    total_income = float(cursor.fetchone()[0])

    cursor.execute(f"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense'{date_filter}", params)
    total_expense = float(cursor.fetchone()[0])

    total_balance = total_income - total_expense

    cursor.execute(f"SELECT COUNT(*) FROM transactions{date_where}", params)
    tx_count = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(DISTINCT date) FROM transactions{date_where}", params)
    distinct_days = cursor.fetchone()[0]

    if month:
        try:
            y, m = map(int, month.split("-"))
            _, total_days = calendar.monthrange(y, m)
        except Exception:
            total_days = 30
    else:
        total_days = 30

    cursor.execute(f"""
        SELECT category, SUM(amount) as spent
        FROM transactions
        WHERE type = 'expense'{date_filter}
        GROUP BY category
        ORDER BY spent DESC
    """, params)
    category_rows = cursor.fetchall()
    spent_by_category = {r["category"]: float(r["spent"]) for r in category_rows}

    cursor.execute("SELECT category, budget, color, icon FROM category_budgets")
    budget_rows = cursor.fetchall()

    breakdown = []
    for b in budget_rows:
        cat = b["category"]
        spent = spent_by_category.get(cat, 0.0)
        budget = float(b["budget"])
        pct = round((spent / budget) * 100, 1) if budget > 0 else 0.0
        breakdown.append(CategoryBudget(
            category=cat,
            spent=spent,
            budget=budget,
            percentage=pct,
            color=b["color"],
            icon=b["icon"]
        ))

    daily_expenses = []
    month_names_id = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

    if month:
        y, m = map(int, month.split("-"))
        _, days_in_month = calendar.monthrange(y, m)
        m_label = month_names_id[m] if 1 <= m <= 12 else str(m)

        for d in range(1, days_in_month + 1):
            d_str = f"{y:04d}-{m:02d}-{d:02d}"
            d_label = f"{d} {m_label}"
            cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date = ?", (d_str,))
            amt = float(cursor.fetchone()[0])
            daily_expenses.append(DailyExpenseDataPoint(
                date=d_str,
                day_label=d_label,
                amount=amt
            ))
    elif start_date and end_date:
        s_dt = datetime.strptime(start_date, "%Y-%m-%d")
        e_dt = datetime.strptime(end_date, "%Y-%m-%d")
        days_diff = (e_dt - s_dt).days
        for i in range(min(days_diff + 1, 90)):
            cur_dt = s_dt + timedelta(days=i)
            d_str = cur_dt.strftime("%Y-%m-%d")
            d_label = f"{cur_dt.day} {month_names_id[cur_dt.month]}"
            cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date = ?", (d_str,))
            amt = float(cursor.fetchone()[0])
            daily_expenses.append(DailyExpenseDataPoint(
                date=d_str,
                day_label=d_label,
                amount=amt
            ))
    else:
        today = datetime.now()
        for i in range(9, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            d_label = d.strftime("%d %b")

            cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date = ?", (d_str,))
            amt = float(cursor.fetchone()[0])
            daily_expenses.append(DailyExpenseDataPoint(
                date=d_str,
                day_label=d_label,
                amount=amt
            ))

    cursor.execute(f"SELECT * FROM transactions{date_where} ORDER BY date DESC, id DESC LIMIT 10", params)
    recent_rows = cursor.fetchall()
    recent = [Transaction(**dict(r)) for r in recent_rows]

    conn.close()

    return FinancialSummary(
        total_balance=total_balance,
        total_income=total_income,
        total_expense=total_expense,
        transactions_count=tx_count,
        target_days_current=distinct_days,
        target_days_total=total_days,
        category_breakdown=breakdown,
        daily_expenses=daily_expenses,
        recent_transactions=recent
    )


# ============================================================================
# SUPABASE POSTGREST CLIENT IMPLEMENTATIONS
# ============================================================================

def _supabase_create_transaction(data: TransactionCreate) -> Transaction:
    client = get_supabase_client()
    payload = {
        "title": data.title,
        "amount": float(data.amount),
        "category": data.category,
        "type": data.type,
        "date": data.date,
        "notes": data.notes or None
    }
    res = client.post("/transactions", json=payload, headers={"Prefer": "return=representation"})
    res.raise_for_status()
    row = res.json()[0]
    return Transaction(
        id=row["id"],
        title=row["title"],
        amount=float(row["amount"]),
        category=row["category"],
        type=row["type"],
        date=str(row["date"]),
        notes=row["notes"],
        created_at=str(row["created_at"])
    )


def _supabase_get_transactions(
    limit: int = 100,
    tx_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Transaction]:
    client = get_supabase_client()
    params: List[tuple] = [
        ("select", "*"),
        ("order", "date.desc,id.desc"),
        ("limit", str(limit))
    ]
    if tx_type:
        params.append(("type", f"eq.{tx_type}"))
    if category:
        params.append(("category", f"eq.{category}"))
    if search:
        params.append(("or", f"(title.ilike.*{search}*,notes.ilike.*{search}*)"))

    if month:
        y, m = map(int, month.split("-"))
        _, last_day = calendar.monthrange(y, m)
        params.append(("date", f"gte.{y:04d}-{m:02d}-01"))
        params.append(("date", f"lte.{y:04d}-{m:02d}-{last_day:02d}"))
    elif start_date and end_date:
        params.append(("date", f"gte.{start_date}"))
        params.append(("date", f"lte.{end_date}"))
    elif start_date:
        params.append(("date", f"gte.{start_date}"))
    elif end_date:
        params.append(("date", f"lte.{end_date}"))

    res = client.get("/transactions", params=params)
    res.raise_for_status()
    rows = res.json()
    return [
        Transaction(
            id=r["id"],
            title=r["title"],
            amount=float(r["amount"]),
            category=r["category"],
            type=r["type"],
            date=str(r["date"]),
            notes=r["notes"],
            created_at=str(r["created_at"])
        )
        for r in rows
    ]


def _supabase_get_transaction_by_id(tx_id: int) -> Optional[Transaction]:
    client = get_supabase_client()
    res = client.get("/transactions", params={"id": f"eq.{tx_id}", "select": "*"})
    res.raise_for_status()
    rows = res.json()
    if not rows:
        return None
    r = rows[0]
    return Transaction(
        id=r["id"],
        title=r["title"],
        amount=float(r["amount"]),
        category=r["category"],
        type=r["type"],
        date=str(r["date"]),
        notes=r["notes"],
        created_at=str(r["created_at"])
    )


def _supabase_update_transaction(tx_id: int, data: TransactionUpdate) -> Optional[Transaction]:
    client = get_supabase_client()
    data_dict = data.model_dump(exclude_unset=True)
    if not data_dict:
        return _supabase_get_transaction_by_id(tx_id)
    res = client.patch(
        "/transactions",
        params={"id": f"eq.{tx_id}"},
        headers={"Prefer": "return=representation"},
        json=data_dict
    )
    res.raise_for_status()
    rows = res.json()
    if not rows:
        return None
    r = rows[0]
    return Transaction(
        id=r["id"],
        title=r["title"],
        amount=float(r["amount"]),
        category=r["category"],
        type=r["type"],
        date=str(r["date"]),
        notes=r["notes"],
        created_at=str(r["created_at"])
    )


def _supabase_delete_transaction(tx_id: int) -> bool:
    client = get_supabase_client()
    res = client.delete(
        "/transactions",
        params={"id": f"eq.{tx_id}"},
        headers={"Prefer": "return=representation"}
    )
    res.raise_for_status()
    return len(res.json()) > 0


def _supabase_get_category_budgets() -> List[Dict]:
    client = get_supabase_client()
    res = client.get("/category_budgets", params={"select": "*"})
    res.raise_for_status()
    return res.json()


def _supabase_update_category_budget(category: str, new_budget: float) -> bool:
    client = get_supabase_client()
    res = client.patch(
        "/category_budgets",
        params={"category": f"eq.{category}"},
        headers={"Prefer": "return=representation"},
        json={"budget": new_budget}
    )
    res.raise_for_status()
    return len(res.json()) > 0


def _supabase_get_distinct_months() -> List[Dict]:
    client = get_supabase_client()
    res = client.get("/distinct_months", params={"select": "*", "order": "ym.desc"})
    res.raise_for_status()
    rows = res.json()
    months_map_id = {
        "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
        "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
        "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
    }
    result = []
    for r in rows:
        ym = r["ym"]
        parts = ym.split("-")
        label = f"{months_map_id.get(parts[1], parts[1])} {parts[0]}" if len(parts) == 2 else ym
        result.append({
            "month": ym,
            "label": label,
            "tx_count": r["tx_count"],
            "total_expense": float(r["total_expense"])
        })
    return result


def _supabase_save_portfolio(name: str, capital: float, rf_rate: float, horizon: int, allocations: List[Dict]) -> int:
    client = get_supabase_client()
    res = client.post("/saved_portfolios", headers={"Prefer": "return=representation"}, json={
        "name": name,
        "initial_capital": capital,
        "risk_free_rate": rf_rate,
        "horizon_years": horizon,
        "allocations_json": json.dumps(allocations)
    })
    res.raise_for_status()
    return res.json()[0]["id"]


def _supabase_list_saved_portfolios() -> List[Dict]:
    client = get_supabase_client()
    res = client.get("/saved_portfolios", params={"select": "*", "order": "id.desc"})
    res.raise_for_status()
    results = []
    for r in res.json():
        allocs = r["allocations_json"]
        if isinstance(allocs, str):
            allocs = json.loads(allocs)
        results.append({
            "id": r["id"],
            "name": r["name"],
            "initial_capital": float(r["initial_capital"]),
            "risk_free_rate": float(r["risk_free_rate"]),
            "horizon_years": int(r["horizon_years"]),
            "allocations": allocs,
            "created_at": str(r["created_at"])
        })
    return results


def _supabase_get_savings_goals() -> List[SavingsGoal]:
    client = get_supabase_client()
    res = client.get("/savings_goals", params={"select": "*", "order": "id.asc"})
    res.raise_for_status()
    rows = res.json()
    results = []
    for r in rows:
        target = float(r["target_amount"])
        current = float(r["current_amount"])
        pct = round((current / target) * 100, 1) if target > 0 else 0.0
        remaining = max(0.0, target - current)
        results.append(SavingsGoal(
            id=r["id"],
            title=r["title"],
            target_amount=target,
            current_amount=current,
            category=r["category"],
            color=r["color"],
            icon=r["icon"],
            target_date=str(r["target_date"]),
            percentage=pct,
            remaining_amount=remaining,
            created_at=str(r["created_at"])
        ))
    return results


def _supabase_create_savings_goal(data: SavingsGoalCreate) -> SavingsGoal:
    client = get_supabase_client()
    res = client.post("/savings_goals", headers={"Prefer": "return=representation"}, json={
        "title": data.title,
        "target_amount": float(data.target_amount),
        "current_amount": float(data.initial_deposit),
        "category": data.category,
        "color": data.color,
        "icon": data.icon,
        "target_date": data.target_date
    })
    res.raise_for_status()
    row = res.json()[0]
    target = float(row["target_amount"])
    current = float(row["current_amount"])
    pct = round((current / target) * 100, 1) if target > 0 else 0.0
    return SavingsGoal(
        id=row["id"],
        title=row["title"],
        target_amount=target,
        current_amount=current,
        category=row["category"],
        color=row["color"],
        icon=row["icon"],
        target_date=str(row["target_date"]),
        percentage=pct,
        remaining_amount=max(0.0, target - current),
        created_at=str(row["created_at"])
    )


def _supabase_deposit_savings_goal(goal_id: int, amount: float) -> Optional[SavingsGoal]:
    client = get_supabase_client()
    r_get = client.get("/savings_goals", params={"id": f"eq.{goal_id}", "select": "*"})
    r_get.raise_for_status()
    rows = r_get.json()
    if not rows:
        return None
    cur_row = rows[0]
    new_amount = max(0.0, float(cur_row["current_amount"]) + amount)
    r_up = client.patch(
        "/savings_goals",
        params={"id": f"eq.{goal_id}"},
        headers={"Prefer": "return=representation"},
        json={"current_amount": new_amount}
    )
    r_up.raise_for_status()
    updated = r_up.json()[0]
    target = float(updated["target_amount"])
    pct = round((new_amount / target) * 100, 1) if target > 0 else 0.0
    return SavingsGoal(
        id=updated["id"],
        title=updated["title"],
        target_amount=target,
        current_amount=new_amount,
        category=updated["category"],
        color=updated["color"],
        icon=updated["icon"],
        target_date=str(updated["target_date"]),
        percentage=pct,
        remaining_amount=max(0.0, target - new_amount),
        created_at=str(updated["created_at"])
    )


def _supabase_delete_savings_goal(goal_id: int) -> bool:
    client = get_supabase_client()
    res = client.delete(
        "/savings_goals",
        params={"id": f"eq.{goal_id}"},
        headers={"Prefer": "return=representation"}
    )
    res.raise_for_status()
    return len(res.json()) > 0


def _supabase_get_financial_summary(
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> FinancialSummary:
    txs = _supabase_get_transactions(
        limit=1000,
        month=month,
        start_date=start_date,
        end_date=end_date
    )

    total_income = sum(t.amount for t in txs if t.type == "income")
    total_expense = sum(t.amount for t in txs if t.type == "expense")
    total_balance = total_income - total_expense
    tx_count = len(txs)
    distinct_days = len(set(t.date for t in txs))

    month_names_id = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    if month:
        try:
            y, m = map(int, month.split("-"))
            _, total_days = calendar.monthrange(y, m)
        except Exception:
            total_days = 30
    elif start_date and end_date:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            e_dt = datetime.strptime(end_date, "%Y-%m-%d")
            total_days = (e_dt - s_dt).days + 1
        except Exception:
            total_days = 30
    else:
        total_days = 30

    spent_by_category: Dict[str, float] = defaultdict(float)
    for t in txs:
        if t.type == "expense":
            spent_by_category[t.category] += t.amount

    budget_rows = _supabase_get_category_budgets()
    breakdown = []
    for b in budget_rows:
        cat = b["category"]
        spent = spent_by_category.get(cat, 0.0)
        budget = float(b["budget"])
        pct = round((spent / budget) * 100, 1) if budget > 0 else 0.0
        breakdown.append(CategoryBudget(
            category=cat,
            spent=spent,
            budget=budget,
            percentage=pct,
            color=b["color"],
            icon=b["icon"]
        ))

    daily_expenses: List[DailyExpenseDataPoint] = []
    daily_map: Dict[str, float] = defaultdict(float)
    for t in txs:
        if t.type == "expense":
            daily_map[t.date] += t.amount

    if month:
        y, m = map(int, month.split("-"))
        _, days_in_month = calendar.monthrange(y, m)
        m_label = month_names_id[m] if 1 <= m <= 12 else str(m)
        for d in range(1, days_in_month + 1):
            d_str = f"{y:04d}-{m:02d}-{d:02d}"
            d_label = f"{d} {m_label}"
            daily_expenses.append(DailyExpenseDataPoint(
                date=d_str,
                day_label=d_label,
                amount=daily_map.get(d_str, 0.0)
            ))
    elif start_date and end_date:
        s_dt = datetime.strptime(start_date, "%Y-%m-%d")
        e_dt = datetime.strptime(end_date, "%Y-%m-%d")
        days_diff = (e_dt - s_dt).days
        for i in range(min(days_diff + 1, 90)):
            cur_dt = s_dt + timedelta(days=i)
            d_str = cur_dt.strftime("%Y-%m-%d")
            d_label = f"{cur_dt.day} {month_names_id[cur_dt.month]}"
            daily_expenses.append(DailyExpenseDataPoint(
                date=d_str,
                day_label=d_label,
                amount=daily_map.get(d_str, 0.0)
            ))
    else:
        today = datetime.now()
        for i in range(9, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            d_label = d.strftime("%d %b")
            daily_expenses.append(DailyExpenseDataPoint(
                date=d_str,
                day_label=d_label,
                amount=daily_map.get(d_str, 0.0)
            ))

    recent = txs[:10]

    return FinancialSummary(
        total_balance=total_balance,
        total_income=total_income,
        total_expense=total_expense,
        transactions_count=tx_count,
        target_days_current=distinct_days,
        target_days_total=total_days,
        category_breakdown=breakdown,
        daily_expenses=daily_expenses,
        recent_transactions=recent
    )


# ============================================================================
# PUBLIC REPOSITORY API (DUAL-MODE WITH GRACEFUL FALLBACK)
# ============================================================================

def create_transaction(data: TransactionCreate) -> Transaction:
    """Creates a transaction on Supabase with automatic SQLite local replication and fallback."""
    if is_supabase_enabled():
        try:
            created = _supabase_create_transaction(data)
            try:
                _sqlite_create_transaction_with_id(created.id, data)
            except Exception as e:
                logger.debug("SQLite mirror failed: %s", e)
            return created
        except Exception as e:
            logger.warning("Supabase create_transaction failed, falling back to SQLite: %s", e)
    return _sqlite_create_transaction(data)


def get_transactions(
    limit: int = 100,
    tx_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Transaction]:
    """Retrieves transactions from Supabase or fallback SQLite with multi-criteria filtering."""
    if is_supabase_enabled():
        try:
            return _supabase_get_transactions(
                limit=limit,
                tx_type=tx_type,
                category=category,
                search=search,
                month=month,
                start_date=start_date,
                end_date=end_date
            )
        except Exception as e:
            logger.warning("Supabase get_transactions failed, falling back to SQLite: %s", e)
    return _sqlite_get_transactions(
        limit=limit,
        tx_type=tx_type,
        category=category,
        search=search,
        month=month,
        start_date=start_date,
        end_date=end_date
    )


def get_transaction_by_id(tx_id: int) -> Optional[Transaction]:
    """Retrieves single transaction by ID."""
    if is_supabase_enabled():
        try:
            return _supabase_get_transaction_by_id(tx_id)
        except Exception as e:
            logger.warning("Supabase get_transaction_by_id failed, falling back to SQLite: %s", e)
    return _sqlite_get_transaction_by_id(tx_id)


def update_transaction(tx_id: int, data: TransactionUpdate) -> Optional[Transaction]:
    """Updates an existing transaction record with dual-write to local replica."""
    if is_supabase_enabled():
        try:
            updated = _supabase_update_transaction(tx_id, data)
            if updated:
                try:
                    _sqlite_update_transaction(tx_id, data)
                except Exception as e:
                    logger.debug("SQLite mirror failed: %s", e)
            return updated
        except Exception as e:
            logger.warning("Supabase update_transaction failed, falling back to SQLite: %s", e)
    return _sqlite_update_transaction(tx_id, data)


def delete_transaction(tx_id: int) -> bool:
    """Deletes transaction record across cloud and local replica."""
    if is_supabase_enabled():
        try:
            deleted = _supabase_delete_transaction(tx_id)
            if deleted:
                try:
                    _sqlite_delete_transaction(tx_id)
                except Exception as e:
                    logger.debug("SQLite mirror failed: %s", e)
            return deleted
        except Exception as e:
            logger.warning("Supabase delete_transaction failed, falling back to SQLite: %s", e)
    return _sqlite_delete_transaction(tx_id)


def update_category_budget(category: str, new_budget: float) -> bool:
    """Updates category monthly budget ceiling."""
    if is_supabase_enabled():
        try:
            updated = _supabase_update_category_budget(category, new_budget)
            if updated:
                try:
                    _sqlite_update_category_budget(category, new_budget)
                except Exception as e:
                    logger.debug("SQLite mirror failed: %s", e)
            return updated
        except Exception as e:
            logger.warning("Supabase update_category_budget failed, falling back to SQLite: %s", e)
    return _sqlite_update_category_budget(category, new_budget)


def get_category_budgets() -> List[Dict]:
    """Fetches category limits, colors, and icons."""
    if is_supabase_enabled():
        try:
            return _supabase_get_category_budgets()
        except Exception as e:
            logger.warning("Supabase get_category_budgets failed, falling back to SQLite: %s", e)
    return _sqlite_get_category_budgets()


def get_distinct_months() -> List[Dict]:
    """Returns available distinct historical months with localized labels."""
    if is_supabase_enabled():
        try:
            return _supabase_get_distinct_months()
        except Exception as e:
            logger.warning("Supabase get_distinct_months failed, falling back to SQLite: %s", e)
    return _sqlite_get_distinct_months()


def save_portfolio(name: str, capital: float, rf_rate: float, horizon: int, allocations: List[Dict]) -> int:
    """Persists portfolio allocation."""
    if is_supabase_enabled():
        try:
            pid = _supabase_save_portfolio(name, capital, rf_rate, horizon, allocations)
            try:
                _sqlite_save_portfolio(name, capital, rf_rate, horizon, allocations)
            except Exception as e:
                logger.debug("SQLite mirror failed: %s", e)
            return pid
        except Exception as e:
            logger.warning("Supabase save_portfolio failed, falling back to SQLite: %s", e)
    return _sqlite_save_portfolio(name, capital, rf_rate, horizon, allocations)


def list_saved_portfolios() -> List[Dict]:
    """Retrieves all saved portfolio allocation models."""
    if is_supabase_enabled():
        try:
            return _supabase_list_saved_portfolios()
        except Exception as e:
            logger.warning("Supabase list_saved_portfolios failed, falling back to SQLite: %s", e)
    return _sqlite_list_saved_portfolios()


def get_savings_goals() -> List[SavingsGoal]:
    """Retrieves all Celengan Impian targets."""
    if is_supabase_enabled():
        try:
            return _supabase_get_savings_goals()
        except Exception as e:
            logger.warning("Supabase get_savings_goals failed, falling back to SQLite: %s", e)
    return _sqlite_get_savings_goals()


def create_savings_goal(data: SavingsGoalCreate) -> SavingsGoal:
    """Creates a new Celengan Impian goal."""
    if is_supabase_enabled():
        try:
            goal = _supabase_create_savings_goal(data)
            try:
                _sqlite_create_savings_goal_with_id(goal.id, data)
            except Exception as e:
                logger.debug("SQLite mirror failed: %s", e)
            return goal
        except Exception as e:
            logger.warning("Supabase create_savings_goal failed, falling back to SQLite: %s", e)
    return _sqlite_create_savings_goal(data)


def deposit_savings_goal(goal_id: int, amount: float) -> Optional[SavingsGoal]:
    """Deposits incremental savings into target goal."""
    if is_supabase_enabled():
        try:
            deposited = _supabase_deposit_savings_goal(goal_id, amount)
            if deposited:
                try:
                    _sqlite_deposit_savings_goal(goal_id, amount)
                except Exception as e:
                    logger.debug("SQLite mirror failed: %s", e)
            return deposited
        except Exception as e:
            logger.warning("Supabase deposit_savings_goal failed, falling back to SQLite: %s", e)
    return _sqlite_deposit_savings_goal(goal_id, amount)


def delete_savings_goal(goal_id: int) -> bool:
    """Deletes savings goal."""
    if is_supabase_enabled():
        try:
            deleted = _supabase_delete_savings_goal(goal_id)
            if deleted:
                try:
                    _sqlite_delete_savings_goal(goal_id)
                except Exception as e:
                    logger.debug("SQLite mirror failed: %s", e)
            return deleted
        except Exception as e:
            logger.warning("Supabase delete_savings_goal failed, falling back to SQLite: %s", e)
    return _sqlite_delete_savings_goal(goal_id)


def get_financial_summary(
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> FinancialSummary:
    """Calculates high-density financial metrics, category breakdowns, and daily curves."""
    if is_supabase_enabled():
        try:
            return _supabase_get_financial_summary(month, start_date, end_date)
        except Exception as e:
            logger.warning("Supabase get_financial_summary failed, falling back to SQLite: %s", e)
    return _sqlite_get_financial_summary(month, start_date, end_date)


def export_transactions_csv(
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> str:
    """Exports transaction history to CSV format."""
    txs = get_transactions(limit=10000, month=month, start_date=start_date, end_date=end_date)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tanggal", "Judul", "Kategori", "Jenis", "Nominal (Rp)", "Catatan"])
    for r in txs:
        writer.writerow([r.id, r.date, r.title, r.category, r.type, r.amount, r.notes or ""])
    return output.getvalue()


def get_financial_health(month: Optional[str] = None) -> FinancialHealthResult:
    """
    Computes 50/30/20 budget adherence, savings velocity, and composite health score (0-100).
    Works seamlessly across Supabase and SQLite.
    """
    txs = get_transactions(limit=1000, month=month)
    goals = get_savings_goals()

    income = sum(t.amount for t in txs if t.type == "income")
    expense = sum(t.amount for t in txs if t.type == "expense")
    needs = sum(t.amount for t in txs if t.type == "expense" and t.category in ("Makanan", "Tagihan", "Transportasi", "Rumah", "Pendidikan"))
    wants = sum(t.amount for t in txs if t.type == "expense" and t.category in ("Belanja", "Hiburan"))
    saved_in_goals = sum(g.current_amount for g in goals)

    balance = income - expense
    savings_available = max(0.0, balance)
    savings_spent = savings_available

    total_base = max(income, expense, 1.0)
    needs_pct = round((needs / total_base) * 100, 1)
    wants_pct = round((wants / total_base) * 100, 1)
    savings_pct = round(max(0.0, 100.0 - needs_pct - wants_pct), 1)

    score = 70
    if savings_pct >= 20.0:
        score += 15
    elif savings_pct >= 10.0:
        score += 8
    else:
        score -= 10

    if needs_pct <= 50.0:
        score += 10
    elif needs_pct > 65.0:
        score -= 15

    if wants_pct <= 30.0:
        score += 5
    else:
        score -= 10

    if expense > income and income > 0:
        score -= 20

    score = max(15, min(98, score))

    if score >= 85:
        grade = "A - Prima"
        grade_color = "#10b981"
        summary = "Kondisi keuangan sangat sehat! Rasio tabungan Anda memenuhi standar emas 50/30/20."
    elif score >= 70:
        grade = "B - Stabil"
        grade_color = "#3b82f6"
        summary = "Kondisi keuangan stabil dan terkontrol dengan surplus bulanan positif."
    elif score >= 50:
        grade = "C - Waspada"
        grade_color = "#f59e0b"
        summary = "Pengeluaran kebutuhan mendekati batas toleransi. Pertimbangkan menekan pos belanja."
    else:
        grade = "D - Defisit"
        grade_color = "#ef4444"
        summary = "Pengeluaran melampaui pemasukan bulanan. Segera evaluasi pos pengeluaran sekunder."

    monthly_burn = max(expense, 100000.0)
    total_liquid = balance + saved_in_goals
    runway_months = round(max(0.0, total_liquid / monthly_burn), 1)

    recommendations = []
    if needs_pct > 50.0:
        recommendations.append(f"Kebutuhan primer mencapai {needs_pct}%, di atas acuan ideal 50%. Evaluasi tagihan berkala.")
    if wants_pct > 30.0:
        recommendations.append(f"Pos belanja & hiburan menyerap {wants_pct}%. Terapkan aturan jeda 24 jam sebelum berbelanja.")
    if savings_pct < 20.0:
        recommendations.append("Tingkatkan auto-debit tabungan di awal gajian minimal 20% sebelum belanja konsumtif.")
    else:
        recommendations.append("Alokasi tabungan sudah ideal! Optimalkan surplus ke instrumen SBN atau Reksa Dana.")
    recommendations.append(f"Ketahanan kas saat ini mencukupi {runway_months} bulan pengeluaran rutin.")

    return FinancialHealthResult(
        score=score,
        grade=grade,
        grade_color=grade_color,
        summary=summary,
        rule_50_30_20=Rule503020(
            needs_spent=needs,
            needs_pct=needs_pct,
            ideal_needs_pct=50.0,
            wants_spent=wants,
            wants_pct=wants_pct,
            ideal_wants_pct=30.0,
            savings_spent=savings_spent,
            savings_pct=savings_pct,
            ideal_savings_pct=20.0
        ),
        monthly_income=income,
        monthly_expense=expense,
        savings_rate_pct=savings_pct,
        cash_runway_months=runway_months,
        monthly_burn_rate=monthly_burn,
        recommendations=recommendations
    )


# Auto initialize local replica on startup
init_db()
