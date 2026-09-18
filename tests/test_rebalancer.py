import unittest
from backend.app.domain.models import Allocation
from backend.app.engine.rebalancer import calculate_rebalance_orders, BENCHMARK_TARGETS


class TestRebalanceEngine(unittest.TestCase):
    def test_rebalance_at_target_is_hold(self):
        """When portfolio is already at benchmark target, all orders should be HOLD."""
        allocations = [
            Allocation(asset_id=k, weight=v)
            for k, v in BENCHMARK_TARGETS.items()
        ]
        orders = calculate_rebalance_orders(allocations, total_capital=100000.0)
        for o in orders:
            self.assertEqual(o.action, "HOLD")
            self.assertAlmostEqual(o.amount_usd, 0.0, places=1)

    def test_rebalance_conservation_of_capital(self):
        """
        In a closed rebalance, total dollars generated from SELL orders
        must balance the total dollars required for BUY orders.
        """
        # Heavily overweight TECH (80%) and underweight everything else (5% each)
        allocations = [
            Allocation(asset_id="TECH", weight=0.80),
            Allocation(asset_id="SP500", weight=0.05),
            Allocation(asset_id="BONDS", weight=0.05),
            Allocation(asset_id="GOLD", weight=0.05),
            Allocation(asset_id="CRYPTO", weight=0.05)
        ]
        capital = 200000.0
        orders = calculate_rebalance_orders(allocations, total_capital=capital)

        total_buy = sum(o.amount_usd for o in orders if o.action == "BUY")
        total_sell = sum(o.amount_usd for o in orders if o.action == "SELL")

        # BUY and SELL dollar flows must be approximately equal
        self.assertAlmostEqual(total_buy, total_sell, delta=1.0)


if __name__ == "__main__":
    unittest.main()
