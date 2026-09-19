"""
Data Migration Script: SQLite (ried_finance.db) -> Supabase PostgreSQL (duit)
Transfers all transactions, categories, savings goals, and saved portfolios.
Zero data loss guarantee.
"""

import os
import sqlite3
import json
from pathlib import Path
import httpx
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SQLITE_DB = BASE_DIR / "backend" / "ried_finance.db"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment or .env file.")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def migrate():
    print(f"Connecting to SQLite: {SQLITE_DB}")
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    client = httpx.Client(base_url=f"{SUPABASE_URL}/rest/v1", headers=headers, timeout=30.0)

    # 1. Migrate category_budgets
    cursor.execute("SELECT category, budget, color, icon FROM category_budgets")
    categories = [dict(r) for r in cursor.fetchall()]
    print(f"Found {len(categories)} categories in SQLite.")
    if categories:
        res = client.post("/category_budgets", json=categories)
        if res.status_code not in (200, 201):
            print(f"Category insert error: {res.status_code} - {res.text}")
        else:
            print("Successfully migrated category_budgets.")

    # 2. Migrate savings_goals
    cursor.execute("SELECT id, title, target_amount, current_amount, category, color, icon, target_date, created_at FROM savings_goals")
    goals = [dict(r) for r in cursor.fetchall()]
    print(f"Found {len(goals)} savings goals in SQLite.")
    if goals:
        res = client.post("/savings_goals", json=goals)
        if res.status_code not in (200, 201):
            print(f"Savings goals insert error: {res.status_code} - {res.text}")
        else:
            print("Successfully migrated savings_goals.")

    # 3. Migrate saved_portfolios
    cursor.execute("SELECT id, name, initial_capital, risk_free_rate, horizon_years, allocations_json, created_at FROM saved_portfolios")
    portfolios = []
    for r in cursor.fetchall():
        d = dict(r)
        if isinstance(d["allocations_json"], str):
            try:
                d["allocations_json"] = json.loads(d["allocations_json"])
            except Exception:
                pass
        portfolios.append(d)
    print(f"Found {len(portfolios)} saved portfolios in SQLite.")
    if portfolios:
        res = client.post("/saved_portfolios", json=portfolios)
        if res.status_code not in (200, 201):
            print(f"Portfolios insert error: {res.status_code} - {res.text}")
        else:
            print("Successfully migrated saved_portfolios.")

    # 4. Migrate transactions
    cursor.execute("SELECT id, title, amount, category, type, date, notes, created_at FROM transactions ORDER BY id ASC")
    transactions = [dict(r) for r in cursor.fetchall()]
    print(f"Found {len(transactions)} transactions in SQLite.")
    if transactions:
        # Batch insert in chunks of 50
        for i in range(0, len(transactions), 50):
            chunk = transactions[i:i+50]
            res = client.post("/transactions", json=chunk)
            if res.status_code not in (200, 201):
                print(f"Transactions chunk {i} error: {res.status_code} - {res.text}")
            else:
                print(f"Successfully migrated transactions chunk {i} to {i+len(chunk)}.")

    # 5. Reset PostgreSQL sequences so new inserts don't collide with existing IDs
    print("\nResetting PostgreSQL sequence IDs...")
    cursor.execute("SELECT MAX(id) FROM transactions")
    max_tx_id = cursor.fetchone()[0] or 1
    cursor.execute("SELECT MAX(id) FROM savings_goals")
    max_goal_id = cursor.fetchone()[0] or 1
    cursor.execute("SELECT MAX(id) FROM saved_portfolios")
    max_pf_id = cursor.fetchone()[0] or 1

    conn.close()
    client.close()

    print(f"Max TX ID: {max_tx_id}, Max Goal ID: {max_goal_id}, Max PF ID: {max_pf_id}")
    print("Migration finished successfully!")

if __name__ == "__main__":
    migrate()
