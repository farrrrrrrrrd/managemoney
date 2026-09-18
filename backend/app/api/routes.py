"""
Fino Financial REST API Routes
Provides endpoints for financial dashboard summaries, transaction CRUD,
and category budget analytics.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query

from backend.app.domain.models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    FinancialSummary,
    CategoryBudget
)
from backend.app.repository.db import (
    create_transaction,
    get_transactions,
    get_transaction_by_id,
    update_transaction,
    delete_transaction,
    get_financial_summary,
    CATEGORY_METADATA
)

router = APIRouter(prefix="/api", tags=["Fino Finance"])


@router.get("/health", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "app": "Fino Dashboard // Personal & SME Finance Studio",
        "version": "2.1.0"
    }


@router.get("/summary", response_model=FinancialSummary, summary="Dashboard Financial Summary")
async def get_dashboard_summary():
    """Returns aggregated KPIs, category breakdown, and daily expenses for the dashboard."""
    try:
        return get_financial_summary()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to aggregate financial summary: {str(e)}"
        )


@router.get("/transactions", response_model=List[Transaction], summary="List Transactions")
async def list_transactions(
    limit: int = Query(100, ge=1, le=500),
    type: Optional[str] = Query(None, regex="^(expense|income)$"),
    category: Optional[str] = None
):
    """Retrieves transaction history with optional filters."""
    return get_transactions(limit=limit, tx_type=type, category=category)


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
    """Returns available categories with default budget limits and colors."""
    return [
        {
            "category": k,
            "budget": v["budget"],
            "color": v["color"],
            "icon": v["icon"]
        }
        for k, v in CATEGORY_METADATA.items()
    ]
