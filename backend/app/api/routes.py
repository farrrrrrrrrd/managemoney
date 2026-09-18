"""
ApexAlpha REST API Controller Routes
Provides endpoints for asset discovery, portfolio analysis, Monte Carlo simulation,
stress testing, rebalancing, and database persistence.
"""

from typing import List, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.domain.models import (
    Asset,
    PortfolioAnalysisRequest,
    FullPortfolioAnalysisResponse,
    PortfolioMetrics
)
from backend.app.repository.db import (
    DEFAULT_ASSETS,
    save_portfolio,
    list_saved_portfolios
)
from backend.app.engine.markowitz import (
    calculate_portfolio_metrics,
    generate_efficient_frontier
)
from backend.app.engine.monte_carlo import run_monte_carlo_simulation
from backend.app.engine.stress_test import run_stress_tests
from backend.app.engine.rebalancer import calculate_rebalance_orders

router = APIRouter(prefix="/api", tags=["Quant Finance"])


class SavePortfolioRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    initial_capital: float = Field(..., gt=0.0)
    risk_free_rate: float = Field(..., ge=0.0, le=0.20)
    horizon_years: int = Field(..., ge=1, le=30)
    allocations: List[Dict] = Field(..., min_length=1)


@router.get("/health", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "service": "ApexAlpha Quantitative Portfolio & Risk Engine",
        "version": "2.0.0"
    }


@router.get("/assets", response_model=List[Asset], summary="Get Investable Assets Universe")
async def get_assets():
    """Returns the canonical multi-asset investable universe."""
    return list(DEFAULT_ASSETS.values())


@router.post("/analyze", response_model=FullPortfolioAnalysisResponse, summary="Analyze Portfolio")
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """
    Executes full quantitative analysis:
      1. Markowitz portfolio return, variance & Sharpe ratio.
      2. Monte Carlo 1,000-path stochastic projection (VaR 95/99, CVaR).
      3. Historical crisis stress test simulation.
      4. Dynamic rebalancing order sheet.
      5. Markowitz Efficient Frontier curve.
    """
    try:
        # 1. Markowitz Metrics
        metrics = calculate_portfolio_metrics(
            allocations=request.allocations,
            risk_free_rate=request.risk_free_rate,
            total_capital=request.initial_capital
        )

        # 2. Monte Carlo Simulation
        monte_carlo = run_monte_carlo_simulation(
            initial_capital=request.initial_capital,
            expected_return=metrics.expected_annual_return,
            volatility=metrics.annualized_volatility,
            horizon_years=request.horizon_years,
            num_simulations=1000
        )

        # 3. Historical Stress Tests
        stress_tests = run_stress_tests(
            allocations=request.allocations,
            total_capital=request.initial_capital
        )

        # 4. Rebalancing Orders
        rebalance_orders = calculate_rebalance_orders(
            current_allocations=request.allocations,
            total_capital=request.initial_capital
        )

        # 5. Efficient Frontier
        efficient_frontier = generate_efficient_frontier(
            risk_free_rate=request.risk_free_rate,
            num_points=25
        )

        return FullPortfolioAnalysisResponse(
            metrics=metrics,
            monte_carlo=monte_carlo,
            stress_tests=stress_tests,
            rebalance_orders=rebalance_orders,
            efficient_frontier=efficient_frontier
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis computation failed: {str(e)}"
        )


@router.post("/portfolios/save", summary="Save Portfolio Configuration")
async def save_user_portfolio(req: SavePortfolioRequest):
    """Persists portfolio allocations to SQLite database."""
    try:
        record_id = save_portfolio(
            name=req.name,
            capital=req.initial_capital,
            rf_rate=req.risk_free_rate,
            horizon=req.horizon_years,
            allocations=req.allocations
        )
        return {"status": "saved", "id": record_id, "name": req.name}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist portfolio: {str(e)}"
        )


@router.get("/portfolios/saved", summary="List Saved Portfolios")
async def get_saved_portfolios():
    """Retrieves all saved portfolio records."""
    return list_saved_portfolios()
