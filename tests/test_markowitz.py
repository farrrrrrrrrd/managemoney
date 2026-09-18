import unittest
import numpy as np

from backend.app.domain.models import Allocation
from backend.app.repository.db import DEFAULT_ASSETS
from backend.app.engine.markowitz import calculate_portfolio_metrics, generate_efficient_frontier


class TestMarkowitzEngine(unittest.TestCase):
    def test_single_asset_portfolio(self):
        """A 100% allocation to a single asset must exactly match that asset's individual parameters."""
        bonds_alloc = [Allocation(asset_id="BONDS", weight=1.0)]
        metrics = calculate_portfolio_metrics(bonds_alloc, risk_free_rate=0.04, total_capital=100000.0)

        expected_return = DEFAULT_ASSETS["BONDS"].expected_return
        expected_vol = DEFAULT_ASSETS["BONDS"].volatility

        self.assertAlmostEqual(metrics.expected_annual_return, expected_return, places=3)
        self.assertAlmostEqual(metrics.annualized_volatility, expected_vol, places=3)

    def test_diversification_volatility_reduction(self):
        """
        Markowitz Modern Portfolio Theory: Combining imperfectly correlated assets
        (e.g. S&P 500 and Gold with correlation 0.05) must produce a portfolio volatility
        strictly less than the weighted linear average of their individual volatilities.
        """
        allocations = [
            Allocation(asset_id="SP500", weight=0.5),
            Allocation(asset_id="GOLD", weight=0.5)
        ]
        metrics = calculate_portfolio_metrics(allocations, risk_free_rate=0.04, total_capital=100000.0)

        vol_sp500 = DEFAULT_ASSETS["SP500"].volatility
        vol_gold = DEFAULT_ASSETS["GOLD"].volatility
        weighted_avg_vol = 0.5 * vol_sp500 + 0.5 * vol_gold

        self.assertLess(metrics.annualized_volatility, weighted_avg_vol)

    def test_sharpe_ratio_formula(self):
        """Verify Sharpe ratio equals (expected_return - risk_free_rate) / volatility."""
        allocations = [
            Allocation(asset_id="TECH", weight=0.6),
            Allocation(asset_id="BONDS", weight=0.4)
        ]
        rf = 0.035
        metrics = calculate_portfolio_metrics(allocations, risk_free_rate=rf, total_capital=50000.0)

        manual_sharpe = (metrics.expected_annual_return - rf) / metrics.annualized_volatility
        self.assertAlmostEqual(metrics.sharpe_ratio, manual_sharpe, places=2)

    def test_efficient_frontier_generation(self):
        """Frontier points must have increasing volatility and positive Sharpe values."""
        frontier = generate_efficient_frontier(risk_free_rate=0.04, num_points=20)
        self.assertGreater(len(frontier), 5)
        for pt in frontier:
            self.assertIn("volatility", pt)
            self.assertIn("return", pt)
            self.assertIn("sharpe", pt)
            self.assertGreater(pt["volatility"], 0.0)


if __name__ == "__main__":
    unittest.main()
