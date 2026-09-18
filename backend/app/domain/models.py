"""
ApexAlpha Domain Models
Strict Pydantic v2 data structures enforcing financial boundary invariants.
"""

from typing import List, Dict, Literal
from pydantic import BaseModel, Field, field_validator


class Asset(BaseModel):
    id: str = Field(..., description="Unique asset identifier (e.g., 'SP500', 'TECH', 'GOLD')")
    name: str = Field(..., description="Human readable asset name")
    category: Literal["Equities", "Fixed Income", "Commodities", "Crypto"]
    expected_return: float = Field(..., description="Annual expected return decimal (e.g. 0.12 for 12%)")
    volatility: float = Field(..., gt=0.0, description="Annual volatility/std-dev decimal (must be > 0)")
    color: str = Field("#38bdf8", description="Hex color for UI charts")


class Allocation(BaseModel):
    asset_id: str
    weight: float = Field(..., ge=0.0, le=1.0, description="Portfolio weight decimal [0.0, 1.0]")


class PortfolioAnalysisRequest(BaseModel):
    initial_capital: float = Field(100000.0, gt=0.0, description="Starting capital in USD")
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
