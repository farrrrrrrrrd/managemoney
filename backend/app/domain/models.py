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


# ============================================================================
# 2. QUANTITATIVE PORTFOLIO & INVESTASI
# ============================================================================

class Asset(BaseModel):
    id: str = Field(..., description="Unique asset identifier (e.g. 'SP500', 'TECH', 'GOLD')")
    name: str = Field(..., description="Human readable asset name")
    category: Literal["Equities", "Fixed Income", "Commodities", "Crypto", "Cash"]
    expected_return: float = Field(..., description="Annual expected return decimal (e.g. 0.12 for 12%)")
    volatility: float = Field(..., gt=0.0, description="Annual volatility/std-dev decimal (must be > 0)")
    color: str = Field("#38bdf8", description="Hex color for UI charts")


class Allocation(BaseModel):
    asset_id: str
    weight: float = Field(..., ge=0.0, le=1.0, description="Portfolio weight decimal [0.0, 1.0]")


class PortfolioAnalysisRequest(BaseModel):
    initial_capital: float = Field(100000.0, gt=0.0, description="Starting capital")
    risk_free_rate: float = Field(0.04, ge=0.0, le=0.20, description="Risk-free rate (e.g. 0.04 = 4%)")
    horizon_years: int = Field(5, ge=1, le=30, description="Investment horizon in years")
    allocations: List[Allocation] = Field(..., min_length=1)

    @field_validator("allocations")
    @classmethod
    def validate_weights(cls, allocations: List[Allocation]) -> List[Allocation]:
        total = sum(a.weight for a in allocations)
        if not (0.98 <= total <= 1.02):
            raise ValueError(f"Sum of allocation weights must equal 1.0 (current sum: {total:.4f})")
        return allocations


class PortfolioMetrics(BaseModel):
    expected_annual_return: float
    annualized_volatility: float
    sharpe_ratio: float
    total_capital: float


class MonteCarloResult(BaseModel):
    time_steps: List[float]
    p10_trajectory: List[float]
    p50_trajectory: List[float]
    p90_trajectory: List[float]
    var_95_percent: float
    var_99_percent: float
    cvar_95_percent: float
    max_drawdown_percent: float
    final_capital_median: float


class StressTestResult(BaseModel):
    scenario_name: str
    year: int
    description: str
    impact_percent: float
    capital_lost: float
    surviving_capital: float


class RebalanceOrder(BaseModel):
    asset_id: str
    asset_name: str
    current_weight: float
    target_weight: float
    delta_weight: float
    action: Literal["BUY", "SELL", "HOLD"]
    amount_usd: float


class FullPortfolioAnalysisResponse(BaseModel):
    metrics: PortfolioMetrics
    monte_carlo: MonteCarloResult
    stress_tests: List[StressTestResult]
    rebalance_orders: List[RebalanceOrder]
    efficient_frontier: List[Dict[str, float]]


# ============================================================================
# 3. SAVINGS GOALS (CELENGAN IMPIAN)
# ============================================================================

class SavingsGoal(BaseModel):
    id: int
    title: str
    target_amount: float
    current_amount: float
    category: str
    color: str
    icon: str
    target_date: str
    percentage: float
    remaining_amount: float
    created_at: str


class SavingsGoalCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    target_amount: float = Field(..., gt=0.0)
    initial_deposit: float = Field(0.0, ge=0.0)
    category: str = Field("Umum", max_length=50)
    color: str = Field("#10b981", max_length=20)
    icon: str = Field("target", max_length=30)
    target_date: str = Field(..., description="Format YYYY-MM-DD")


class SavingsGoalDeposit(BaseModel):
    amount: float = Field(..., description="Nominal setor (+) atau penarikan (-)")


# ============================================================================
# 4. SMART FINANCIAL HEALTH RADAR (50/30/20 & SCORING)
# ============================================================================

class Rule503020(BaseModel):
    needs_spent: float
    needs_pct: float
    ideal_needs_pct: float = 50.0
    wants_spent: float
    wants_pct: float
    ideal_wants_pct: float = 30.0
    savings_spent: float
    savings_pct: float
    ideal_savings_pct: float = 20.0


class FinancialHealthResult(BaseModel):
    score: int
    grade: str
    grade_color: str
    summary: str
    rule_50_30_20: Rule503020
    monthly_income: float
    monthly_expense: float
    savings_rate_pct: float
    cash_runway_months: float
    monthly_burn_rate: float
    recommendations: List[str]
