import unittest
from pydantic import ValidationError
from backend.app.domain.models import PortfolioAnalysisRequest, Allocation
from backend.app.repository.db import save_portfolio, list_saved_portfolios


class TestApiSecurityAndValidation(unittest.TestCase):
    def test_reject_unbalanced_weights(self):
        """Weights summing to 0.70 instead of 1.0 must raise ValidationError."""
        with self.assertRaises(ValidationError):
            PortfolioAnalysisRequest(
                initial_capital=100000.0,
                risk_free_rate=0.04,
                horizon_years=5,
                allocations=[
                    Allocation(asset_id="SP500", weight=0.40),
                    Allocation(asset_id="TECH", weight=0.30)
                ]
            )

    def test_reject_negative_capital(self):
        """Negative capital must be blocked by Pydantic validator."""
        with self.assertRaises(ValidationError):
            PortfolioAnalysisRequest(
                initial_capital=-5000.0,
                risk_free_rate=0.04,
                horizon_years=5,
                allocations=[
                    Allocation(asset_id="SP500", weight=1.0)
                ]
            )

    def test_reject_invalid_horizon_range(self):
        """Horizon years < 1 or > 30 must be rejected."""
        with self.assertRaises(ValidationError):
            PortfolioAnalysisRequest(
                initial_capital=10000.0,
                risk_free_rate=0.04,
                horizon_years=0,
                allocations=[Allocation(asset_id="SP500", weight=1.0)]
            )

    def test_sql_injection_defense_parameterized_queries(self):
        """
        OWASP SQL Injection defense: Storing malicious payload in portfolio name
        must not execute or corrupt database structure.
        """
        malicious_name = "HackerPortfolio'; DROP TABLE saved_portfolios; --"
        rec_id = save_portfolio(
            name=malicious_name,
            capital=10000.0,
            rf_rate=0.04,
            horizon=5,
            allocations=[{"asset_id": "SP500", "weight": 1.0}]
        )
        self.assertGreater(rec_id, 0)

        # Database table must still be intact and queryable
        records = list_saved_portfolios()
        found = any(r["name"] == malicious_name for r in records)
        self.assertTrue(found)


if __name__ == "__main__":
    unittest.main()
