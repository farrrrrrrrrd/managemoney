"""
ApexAlpha Historical Stress-Testing Engine
Simulates instantaneous portfolio capital shocks against major historical financial crises.
"""

from typing import List, Dict
from backend.app.domain.models import Allocation, StressTestResult

HISTORICAL_SCENARIOS: List[Dict] = [
    {
        "name": "2008 Global Financial Crisis (GFC)",
        "year": 2008,
        "description": "Lehman Brothers collapse, systemic banking liquidity freeze, severe equity drawdown.",
        "shocks": {
            "SP500": -0.520,  # S&P 500 fell ~52%
            "TECH": -0.450,   # Tech fell ~45%
            "BONDS": 0.160,   # Flight to quality: 10Y Treasuries gained +16%
            "GOLD": 0.180,    # Gold appreciated as safe haven
            "CRYPTO": -0.750  # Hypothetical extreme high-beta illiquidity
        }
    },
    {
        "name": "2020 COVID-19 Liquidity Shock",
        "year": 2020,
        "description": "Rapid global lockdown onset, flash crash across risk assets followed by fiscal stimulus.",
        "shocks": {
            "SP500": -0.340,
            "TECH": -0.280,
            "BONDS": 0.080,
            "GOLD": -0.045,   # Short-term margin call liquidation
            "CRYPTO": -0.520  # March 2020 flash liquidation
        }
    },
    {
        "name": "2022 Stagflation & Aggressive Rate Hikes",
        "year": 2022,
        "description": "Federal Reserve rapid rate tightening (450 bps), long-duration tech collapse, bond bear market.",
        "shocks": {
            "SP500": -0.190,
            "TECH": -0.330,
            "BONDS": -0.160,  # Worst bond year in 50 years due to rate hikes
            "GOLD": -0.010,
            "CRYPTO": -0.650  # Crypto winter
        }
    },
    {
        "name": "1970s Oil Shock & Inflation Spiral",
        "year": 1973,
        "description": "Supply chain energy embargo, double-digit inflation, stagflation shock.",
        "shocks": {
            "SP500": -0.420,
            "TECH": -0.400,
            "BONDS": -0.110,
            "GOLD": 0.650,    # Commodities and gold surged
            "CRYPTO": -0.300
        }
    }
]


def run_stress_tests(
    allocations: List[Allocation],
    total_capital: float
) -> List[StressTestResult]:
    """
    Evaluates each historical crisis scenario:
      Total Return Impact = Sum(weight_i * shock_i)
      Capital Lost = Total Capital * abs(Impact)
      Surviving Capital = Total Capital * (1 + Impact)
    """
    weight_map = {a.asset_id: a.weight for a in allocations}
    total_weight = sum(weight_map.values())
    if total_weight > 0:
        weight_map = {k: v / total_weight for k, v in weight_map.items()}

    results = []
    for scenario in HISTORICAL_SCENARIOS:
        impact = 0.0
        shocks = scenario["shocks"]
        for asset_id, w in weight_map.items():
            asset_shock = shocks.get(asset_id, -0.20)
            impact += w * asset_shock

        capital_delta = total_capital * impact
        surviving = max(0.0, total_capital + capital_delta)
        lost = abs(capital_delta) if capital_delta < 0 else 0.0

        results.append(StressTestResult(
            scenario_name=scenario["name"],
            year=scenario["year"],
            description=scenario["description"],
            impact_percent=round(impact * 100, 2),
            capital_lost=round(lost, 2),
            surviving_capital=round(surviving, 2)
        ))

    return results
