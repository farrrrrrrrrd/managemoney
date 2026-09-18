"""
Fino / ApexAlpha Domain Models
Strict Pydantic v2 schemas for personal & business finance tracking,
transactions CRUD, category budgets, and financial summaries.
"""

from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class TransactionBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=120, description="Judul transaksi")
    amount: float = Field(..., gt=0.0, description="Nominal transaksi dalam Rupiah (harus > 0)")
    category: str = Field(..., description="Kategori (Makanan, Tagihan, Transportasi, Belanja, dll)")
    type: Literal["expense", "income"] = Field("expense", description="Jenis: pengeluaran atau pemasukan")
    date: str = Field(..., description="Format YYYY-MM-DD")
    notes: Optional[str] = Field(None, max_length=250)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=120)
    amount: Optional[float] = Field(None, gt=0.0)
    category: Optional[str] = None
    type: Optional[Literal["expense", "income"]] = None
    date: Optional[str] = None
    notes: Optional[str] = None


class Transaction(TransactionBase):
    id: int
    created_at: str


class CategoryBudget(BaseModel):
    category: str
    spent: float
    budget: float
    percentage: float
    color: str
    icon: str


class DailyExpenseDataPoint(BaseModel):
    date: str
    day_label: str
    amount: float


class FinancialSummary(BaseModel):
    total_balance: float
    total_income: float
    total_expense: float
    transactions_count: int
    target_days_current: int
    target_days_total: int
    category_breakdown: List[CategoryBudget]
    daily_expenses: List[DailyExpenseDataPoint]
    recent_transactions: List[Transaction]
