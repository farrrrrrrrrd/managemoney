"""
Fino Financial Repository & Persistence Layer
SQLite storage with transactions CRUD, category budget tracking, and real-time summaries.
"""

import sqlite3
import csv
import io
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from backend.app.domain.models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    FinancialSummary,
    CategoryBudget,
    DailyExpenseDataPoint
)

DB_PATH = Path(__file__).resolve().parent.parent.parent / "fino_finance.db"

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


# Auto initialize database on module import
init_db()
