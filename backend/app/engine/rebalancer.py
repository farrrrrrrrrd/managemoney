"""
ApexAlpha Portfolio Rebalancing Engine
Calculates asset weight deviations and generates exact Buy/Sell rebalancing orders
enforcing the conservation of capital invariant.
"""

from typing import List
from backend.app.domain.models import Allocation, RebalanceOrder
from backend.app.repository.db import DEFAULT_ASSETS

# Standard Target Benchmark: Classic 60/20/10/10 All-Weather Base
BENCHMARK_TARGETS = {
    "SP500": 0.35,
    "TECH": 0.20,
    "BONDS": 0.25,
    "GOLD": 0.10,
    "CRYPTO": 0.10
}


def calculate_rebalance_orders(
    current_allocations: List[Allocation],
    total_capital: float
) -> List[RebalanceOrder]:
    """
    Computes delta weights:
      delta_w = target_weight - current_weight
      action = BUY if delta_w > threshold else SELL if delta_w < -threshold else HOLD
      amount = total_capital * abs(delta_w)
    """
    current_map = {a.asset_id: a.weight for a in current_allocations}
    total_current = sum(current_map.values())
    if total_current > 0:
        current_map = {k: v / total_current for k, v in current_map.items()}

    orders = []
    threshold = 0.005  # 0.5% threshold to avoid noise transactions

    for asset_id, asset_meta in DEFAULT_ASSETS.items():
        curr_w = current_map.get(asset_id, 0.0)
        target_w = BENCHMARK_TARGETS.get(asset_id, 0.20)
        delta_w = target_w - curr_w

        if delta_w > threshold:
            action = "BUY"
        elif delta_w < -threshold:
            action = "SELL"
        else:
            action = "HOLD"

        amount_usd = abs(delta_w) * total_capital

        orders.append(RebalanceOrder(
            asset_id=asset_id,
            asset_name=asset_meta.name,
            current_weight=round(curr_w * 100, 2),
            target_weight=round(target_w * 100, 2),
            delta_weight=round(delta_w * 100, 2),
            action=action,
            amount_usd=round(amount_usd, 2)
        ))

    # Sort orders: SELL first (liquidity generation), then BUY (capital deployment), then HOLD
    order_rank = {"SELL": 0, "BUY": 1, "HOLD": 2}
    orders.sort(key=lambda o: (order_rank[o.action], -o.amount_usd))
    return orders
