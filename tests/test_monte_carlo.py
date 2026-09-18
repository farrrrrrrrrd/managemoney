import unittest
from backend.app.engine.monte_carlo import run_monte_carlo_simulation


class TestMonteCarloEngine(unittest.TestCase):
    def test_trajectory_dimensions_and_initial_capital(self):
        """Verify time steps count and capital continuity at t=0."""
        capital = 100000.0
        horizon = 3
        res = run_monte_carlo_simulation(
            initial_capital=capital,
            expected_return=0.10,
            volatility=0.18,
            horizon_years=horizon,
            num_simulations=500,
            random_seed=123
        )
        expected_steps = horizon * 12 + 1
        self.assertEqual(len(res.time_steps), expected_steps)
        self.assertEqual(len(res.p10_trajectory), expected_steps)
        self.assertEqual(len(res.p50_trajectory), expected_steps)
        self.assertEqual(len(res.p90_trajectory), expected_steps)

        # At t=0, all percentiles must equal initial capital
        self.assertEqual(res.p10_trajectory[0], capital)
        self.assertEqual(res.p50_trajectory[0], capital)
        self.assertEqual(res.p90_trajectory[0], capital)

    def test_percentile_monotonic_ordering(self):
        """At terminal step, p10 <= p50 <= p90."""
        res = run_monte_carlo_simulation(
            initial_capital=50000.0,
            expected_return=0.12,
            volatility=0.20,
            horizon_years=5,
            num_simulations=500,
            random_seed=42
        )
        self.assertLessEqual(res.p10_trajectory[-1], res.p50_trajectory[-1])
        self.assertLessEqual(res.p50_trajectory[-1], res.p90_trajectory[-1])

    def test_var_and_cvar_relationship(self):
        """CVaR (Expected Shortfall) must be greater than or equal to VaR."""
        res = run_monte_carlo_simulation(
            initial_capital=100000.0,
            expected_return=0.08,
            volatility=0.25,
            horizon_years=2,
            num_simulations=800,
            random_seed=99
        )
        self.assertGreaterEqual(res.cvar_95_percent, res.var_95_percent)
        self.assertGreater(res.max_drawdown_percent, 0.0)
        self.assertLessEqual(res.max_drawdown_percent, 100.0)


if __name__ == "__main__":
    unittest.main()
