"""
Ried Financial Repository & Persistence Layer
SQLite-backed storage with category budgets and transaction ledger.
"""

import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Optional
import csv
import io
from datetime import datetime, timedelta
import numpy as np

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

DB_PATH = Path(__file__).resolve().parent.parent.parent / "ried_finance.db"

# Canonical Investable Asset Universe with realistic historical market baselines
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


def get_connection():
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

    # Category Budgets table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS category_budgets (
            category TEXT PRIMARY KEY,
            budget REAL NOT NULL,
            color TEXT NOT NULL,
            icon TEXT NOT NULL
        )
    """)

    # Pre-populate category budgets if not present
    for cat, meta in CATEGORY_DEFAULTS.items():
        cursor.execute("""
            INSERT OR IGNORE INTO category_budgets (category, budget, color, icon)
            VALUES (?, ?, ?, ?)
        """, (cat, meta["budget"], meta["color"], meta["icon"]))

    # Saved Portfolios table (Markowitz & Quant allocations)
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

    # Savings Goals (Celengan Impian) table
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

    # Pre-populate savings goals if not present
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

    # Check if empty; if so, pre-seed with realistic financial data matching the video
    cursor.execute("SELECT COUNT(*) FROM transactions")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_sample_data(cursor)
        conn.commit()

    conn.close()


def seed_sample_data(cursor):
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(15)]

    sample_txs = [
        # Income
        ("Gaji Bulanan", 12500000.0, "Gaji", "income", dates[14], "Transfer payroll perusahaan"),
        ("Project Freelance UI/UX", 4096500.0, "Freelance", "income", dates[7], "Pembayaran klien aplikasi"),
        # Expenses (matching video totals ~Rp 6.702.000)
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


def create_transaction(data: TransactionCreate) -> Transaction:
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


def get_transactions(limit: int = 100, tx_type: Optional[str] = None, category: Optional[str] = None, search: Optional[str] = None) -> List[Transaction]:
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

    query += " ORDER BY date DESC, id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [Transaction(**dict(r)) for r in rows]


def get_transaction_by_id(tx_id: int) -> Optional[Transaction]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return Transaction(**dict(row)) if row else None


def update_transaction(tx_id: int, data: TransactionUpdate) -> Optional[Transaction]:
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


def delete_transaction(tx_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def update_category_budget(category: str, new_budget: float) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE category_budgets SET budget = ? WHERE category = ?", (new_budget, category))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def get_category_budgets() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, budget, color, icon FROM category_budgets")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def export_transactions_csv() -> str:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, date, title, category, type, amount, notes FROM transactions ORDER BY date DESC, id DESC")
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tanggal", "Judul", "Kategori", "Jenis", "Nominal (Rp)", "Catatan"])
    for r in rows:
        writer.writerow([r["id"], r["date"], r["title"], r["category"], r["type"], r["amount"], r["notes"] or ""])
    return output.getvalue()


def get_financial_summary() -> FinancialSummary:
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Totals
    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income'")
    total_income = float(cursor.fetchone()[0])

    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense'")
    total_expense = float(cursor.fetchone()[0])

    total_balance = total_income - total_expense

    cursor.execute("SELECT COUNT(*) FROM transactions")
    tx_count = cursor.fetchone()[0]

    # 2. Category Breakdown
    cursor.execute("""
        SELECT category, SUM(amount) as spent
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        ORDER BY spent DESC
    """)
    category_rows = cursor.fetchall()
    spent_by_category = {r["category"]: float(r["spent"]) for r in category_rows}

    # Fetch dynamic budgets from table
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

    # 3. Daily Expenses (Last 10 days)
    today = datetime.now()
    daily_expenses = []
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

    # 4. Recent Transactions (limit 10)
    cursor.execute("SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT 10")
    recent_rows = cursor.fetchall()
    recent = [Transaction(**dict(r)) for r in recent_rows]

    conn.close()

    return FinancialSummary(
        total_balance=total_balance,
        total_income=total_income,
        total_expense=total_expense,
        transactions_count=tx_count,
        target_days_current=13,
        target_days_total=31,
        category_breakdown=breakdown,
        daily_expenses=daily_expenses,
        recent_transactions=recent
    )


# ============================================================================
# 5. SAVED PORTFOLIOS PERSISTENCE
# ============================================================================

def save_portfolio(name: str, capital: float, rf_rate: float, horizon: int, allocations: List[Dict]) -> int:
    """Persists portfolio allocation to SQLite and returns the record ID."""
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


def list_saved_portfolios() -> List[Dict]:
    """Retrieves all saved portfolio configurations."""
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


# ============================================================================
# 6. SAVINGS GOALS (CELENGAN IMPIAN) CRUD
# ============================================================================

def get_savings_goals() -> List[SavingsGoal]:
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


def create_savings_goal(data: SavingsGoalCreate) -> SavingsGoal:
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


def deposit_savings_goal(goal_id: int, amount: float) -> Optional[SavingsGoal]:
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


def delete_savings_goal(goal_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM savings_goals WHERE id = ?", (goal_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ============================================================================
# 7. SMART FINANCIAL HEALTH RADAR (50/30/20 & SCORING)
# ============================================================================

def get_financial_health() -> FinancialHealthResult:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income'")
    income = float(cursor.fetchone()[0])

    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense'")
    expense = float(cursor.fetchone()[0])

    # Needs categories (Kebutuhan Primer)
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM transactions
        WHERE type = 'expense' AND category IN ('Makanan', 'Tagihan', 'Transportasi', 'Rumah', 'Pendidikan')
    """)
    needs = float(cursor.fetchone()[0])

    # Wants categories (Keinginan Sekunder)
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM transactions
        WHERE type = 'expense' AND category IN ('Belanja', 'Hiburan')
    """)
    wants = float(cursor.fetchone()[0])

    # Savings & Investments
    cursor.execute("SELECT COALESCE(SUM(current_amount), 0) FROM savings_goals")
    saved_in_goals = float(cursor.fetchone()[0])

    balance = income - expense
    savings_available = max(0.0, balance)
    savings_spent = savings_available

    total_base = max(income, expense, 1.0)
    needs_pct = round((needs / total_base) * 100, 1)
    wants_pct = round((wants / total_base) * 100, 1)
    savings_pct = round(max(0.0, 100.0 - needs_pct - wants_pct), 1)

    # Score calculation (0 - 100)
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

    # Cash runway (months)
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

    conn.close()

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


# Auto initialize database on module import
init_db()

