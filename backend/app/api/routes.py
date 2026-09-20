"""
Fino Financial REST API Routes
Provides endpoints for financial dashboard summaries, multi-view transaction CRUD,
category budget analytics, and CSV data export.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Response
from pydantic import BaseModel, Field

logger = logging.getLogger("ried.api")

from backend.app.domain.models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    FinancialSummary,
    CategoryBudget,
    Asset,
    Allocation,
    PortfolioAnalysisRequest,
    FullPortfolioAnalysisResponse,
    SavingsGoal,
    SavingsGoalCreate,
    SavingsGoalDeposit,
    FinancialHealthResult
)
from backend.app.repository.db import (
    create_transaction,
    get_transactions,
    get_transaction_by_id,
    update_transaction,
    delete_transaction,
    get_financial_summary,
    update_category_budget,
    get_category_budgets,
    export_transactions_csv,
    DEFAULT_ASSETS,
    save_portfolio,
    list_saved_portfolios,
    get_savings_goals,
    create_savings_goal,
    deposit_savings_goal,
    delete_savings_goal,
    get_financial_health,
    get_distinct_months,
    init_db
)
from backend.app.engine.markowitz import (
    calculate_portfolio_metrics,
    generate_efficient_frontier
)
from backend.app.engine.monte_carlo import run_monte_carlo_simulation
from backend.app.engine.stress_test import run_stress_tests
from backend.app.engine.rebalancer import calculate_rebalance_orders

router = APIRouter(prefix="/api", tags=["Ried Finance"])


class UpdateBudgetRequest(BaseModel):
    budget: float = Field(..., gt=0.0, description="Batas budget baru dalam Rupiah")


@router.get("/health", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "app": "Ried Dashboard // Personal & SME Finance Studio",
        "version": "2.2.0"
    }


@router.get("/months", summary="List Available Transaction Months")
async def list_available_months():
    """Returns distinct months available in transaction history with transaction counts and totals."""
    return get_distinct_months()


@router.get("/summary", response_model=FinancialSummary, summary="Dashboard Financial Summary")
async def get_dashboard_summary(
    month: Optional[str] = Query(None, description="Format YYYY-MM e.g. 2026-08"),
    start_date: Optional[str] = Query(None, description="Format YYYY-MM-DD e.g. 2026-08-01"),
    end_date: Optional[str] = Query(None, description="Format YYYY-MM-DD e.g. 2026-08-31"),
):
    """Returns aggregated KPIs, category breakdown, and daily expenses for the dashboard."""
    try:
        return get_financial_summary(month=month, start_date=start_date, end_date=end_date)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to aggregate financial summary: {str(e)}"
        )


@router.get("/transactions", response_model=List[Transaction], summary="List Transactions")
async def list_transactions(
    limit: int = Query(100, ge=1, le=500),
    type: Optional[str] = Query(None, pattern="^(expense|income)$"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = Query(None, description="Format YYYY-MM e.g. 2026-08"),
    start_date: Optional[str] = Query(None, description="Format YYYY-MM-DD e.g. 2026-08-01"),
    end_date: Optional[str] = Query(None, description="Format YYYY-MM-DD e.g. 2026-08-31"),
):
    """Retrieves transaction history with optional filters and keyword search."""
    return get_transactions(
        limit=limit,
        tx_type=type,
        category=category,
        search=search,
        month=month,
        start_date=start_date,
        end_date=end_date
    )


@router.post("/transactions", response_model=Transaction, status_code=status.HTTP_201_CREATED, summary="Create Transaction")
async def add_transaction(payload: TransactionCreate):
    """Creates a new financial transaction."""
    try:
        return create_transaction(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transaction payload: {str(e)}"
        )


@router.get("/transactions/{tx_id}", response_model=Transaction, summary="Get Transaction by ID")
async def read_transaction(tx_id: int):
    tx = get_transaction_by_id(tx_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")
    return tx


@router.put("/transactions/{tx_id}", response_model=Transaction, summary="Update Transaction")
async def modify_transaction(tx_id: int, payload: TransactionUpdate):
    """Updates an existing transaction record."""
    updated = update_transaction(tx_id, payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan untuk diperbarui")
    return updated


@router.delete("/transactions/{tx_id}", summary="Delete Transaction")
async def remove_transaction(tx_id: int):
    """Deletes a transaction record."""
    deleted = delete_transaction(tx_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan untuk dihapus")
    return {"status": "success", "message": f"Transaksi #{tx_id} berhasil dihapus"}


@router.get("/categories", summary="Get Categories and Budgets")
async def list_categories():
    """Returns available categories with current budget limits and colors."""
    return get_category_budgets()


@router.put("/categories/{category}", summary="Update Category Budget")
async def set_category_budget(category: str, payload: UpdateBudgetRequest):
    """Updates the monthly budget limit for a category."""
    updated = update_category_budget(category, payload.budget)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategori tidak ditemukan")
    return {"status": "success", "category": category, "new_budget": payload.budget}


@router.get("/export/csv", summary="Export Transactions to CSV")
async def export_csv(
    month: Optional[str] = Query(None, description="Format YYYY-MM e.g. 2026-08"),
    start_date: Optional[str] = Query(None, description="Format YYYY-MM-DD e.g. 2026-08-01"),
    end_date: Optional[str] = Query(None, description="Format YYYY-MM-DD e.g. 2026-08-31"),
):
    """Exports transaction history to a CSV file with optional month/date filters."""
    csv_data = export_transactions_csv(month=month, start_date=start_date, end_date=end_date)
    filename = f"ried_transaksi_{month or 'all'}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/telegram/status", summary="Get Telegram Bot Status")
async def get_telegram_status():
    """Returns real-time status of the Telegram Bot Long-Polling service."""
    from backend.app.telegram_service import telegram_service
    return telegram_service.get_status()


@router.post("/telegram/start", summary="Start Telegram Bot Poller")
async def start_telegram_bot():
    """Starts Telegram Bot polling in the background."""
    from backend.app.telegram_service import telegram_service
    telegram_service.start()
    return {"status": "started", "diagnostics": telegram_service.get_status()}


@router.post("/telegram/stop", summary="Stop Telegram Bot Poller")
async def stop_telegram_bot():
    """Stops Telegram Bot polling."""
    from backend.app.telegram_service import telegram_service
    await telegram_service.stop()
    return {"status": "stopped", "diagnostics": telegram_service.get_status()}


class SetWebhookRequest(BaseModel):
    webhook_url: str = Field(..., description="Full HTTPS webhook URL, e.g. https://your-app.vercel.app/api/telegram/webhook")


@router.post("/telegram/webhook", summary="Telegram Webhook Receiver")
async def telegram_webhook(update: Dict[str, Any]):
    """Receives real-time update push from Telegram Bot API."""
    from backend.app.telegram_service import telegram_service
    try:
        await telegram_service.process_update(update)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/telegram/set-webhook", summary="Set Telegram Webhook URL")
async def set_telegram_webhook(payload: SetWebhookRequest):
    """Registers or updates the Telegram Bot webhook URL."""
    from backend.app.telegram_service import telegram_service
    return await telegram_service.set_webhook(payload.webhook_url)


@router.get("/telegram/webhook-info", summary="Get Telegram Webhook Info")
async def get_telegram_webhook_info():
    """Retrieves current webhook configuration from Telegram API."""
    from backend.app.telegram_service import telegram_service
    return await telegram_service.get_webhook_info()


@router.post("/telegram/delete-webhook", summary="Delete Telegram Webhook")
async def delete_telegram_webhook():
    """Removes webhook configuration to allow local long-polling."""
    from backend.app.telegram_service import telegram_service
    return await telegram_service.delete_webhook()


# ============================================================================
# 1. QUANTITATIVE PORTFOLIO & INVESTASI ENDPOINTS
# ============================================================================

@router.get("/portfolio/assets", summary="List Investable Asset Universe")
async def list_portfolio_assets():
    """Returns canonical investable assets with expected return, volatility, and historical baseline."""
    return list(DEFAULT_ASSETS.values())


@router.post("/portfolio/analyze", response_model=FullPortfolioAnalysisResponse, summary="Analyze Portfolio Allocations")
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """
    Executes Markowitz MPT, Monte Carlo GBM simulation, historical stress-testing,
    rebalancing delta calculation, and Efficient Frontier curve generation.
    """
    try:
        # 1. Markowitz Metrics
        metrics = calculate_portfolio_metrics(
            allocations=request.allocations,
            risk_free_rate=request.risk_free_rate,
            total_capital=request.initial_capital
        )

        # 2. Monte Carlo GBM
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


class SavePortfolioRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    initial_capital: float = Field(..., gt=0.0)
    risk_free_rate: float = Field(..., ge=0.0, le=0.20)
    horizon_years: int = Field(..., ge=1, le=30)
    allocations: List[Dict] = Field(..., min_length=1)


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


# ============================================================================
# 2. SAVINGS GOALS (CELENGAN IMPIAN) ENDPOINTS
# ============================================================================

@router.get("/savings-goals", response_model=List[SavingsGoal], summary="List Savings Goals")
async def list_savings_goals():
    """Retrieves all active savings goals with progress percentages."""
    return get_savings_goals()


@router.post("/savings-goals", response_model=SavingsGoal, status_code=status.HTTP_201_CREATED, summary="Create Savings Goal")
async def add_savings_goal(payload: SavingsGoalCreate):
    """Creates a new financial savings target."""
    try:
        return create_savings_goal(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create savings goal: {str(e)}"
        )


@router.post("/savings-goals/{goal_id}/deposit", response_model=SavingsGoal, summary="Deposit/Withdraw from Goal")
async def update_goal_deposit(goal_id: int, payload: SavingsGoalDeposit):
    """Adds or withdraws savings funds from a specific goal."""
    updated = deposit_savings_goal(goal_id, payload.amount)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target tabungan tidak ditemukan")
    return updated


@router.delete("/savings-goals/{goal_id}", summary="Delete Savings Goal")
async def remove_savings_goal(goal_id: int):
    """Deletes a savings goal."""
    deleted = delete_savings_goal(goal_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target tabungan tidak ditemukan")
    return {"status": "success", "message": f"Target tabungan #{goal_id} berhasil dihapus"}


# ============================================================================
# 3. SMART FINANCIAL HEALTH RADAR (50/30/20 & SCORING)
# ============================================================================

@router.get("/financial-health", response_model=FinancialHealthResult, summary="Get Financial Health Radar")
async def get_health_radar(
    month: Optional[str] = Query(None, description="Format YYYY-MM e.g. 2026-08")
):
    """Calculates 50/30/20 budget ratio, health discipline score (0-100), and cash runway."""
    try:
        return get_financial_health(month=month)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate financial health radar: {str(e)}"
        )


