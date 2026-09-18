"""
ApexAlpha Monte Carlo Stochastic Simulation Engine
Executes Geometric Brownian Motion (GBM) paths to compute Value at Risk (VaR),
Conditional VaR (CVaR), and probabilistic percentile fan charts.
"""

from typing import List
import numpy as np

from backend.app.domain.models import MonteCarloResult


def run_monte_carlo_simulation(
    initial_capital: float,
    expected_return: float,
    volatility: float,
    horizon_years: int,
    num_simulations: int = 1000,
    random_seed: int = 42
) -> MonteCarloResult:
    """
    Simulates portfolio capital paths using Geometric Brownian Motion (GBM):
      S(t + dt) = S(t) * exp((mu - 0.5 * sigma^2) * dt + sigma * sqrt(dt) * Z)
      with Z ~ N(0, 1) and dt = 1/12 (monthly steps).
    """
    np.random.seed(random_seed)

    steps_per_year = 12
    total_steps = horizon_years * steps_per_year
    dt = 1.0 / steps_per_year

    # Time steps array in years
    time_steps = [round(i * dt, 2) for i in range(total_steps + 1)]

    # Standard normal increments: (num_simulations, total_steps)
    z = np.random.normal(0.0, 1.0, size=(num_simulations, total_steps))

    # Daily/Monthly log return step
    drift = (expected_return - 0.5 * (volatility ** 2)) * dt
    diffusion = volatility * np.sqrt(dt) * z
    log_returns = drift + diffusion

    # Cumulative sum of log returns
    cumulative_log_returns = np.zeros((num_simulations, total_steps + 1))
    cumulative_log_returns[:, 1:] = np.cumsum(log_returns, axis=1)

    # Price paths matrix
    paths = initial_capital * np.exp(cumulative_log_returns)

    # Extract percentiles at each time step
    p10_curve = np.percentile(paths, 10, axis=0)
    p50_curve = np.percentile(paths, 50, axis=0)
    p90_curve = np.percentile(paths, 90, axis=0)

    # Risk Metrics from Terminal Capital Distribution
    final_values = paths[:, -1]
    final_returns = (final_values - initial_capital) / initial_capital

    # 1. Value at Risk (VaR)
    # VaR 95%: 5th percentile of return (as positive loss percentage)
    p5_return = float(np.percentile(final_returns, 5))
    var_95 = max(0.0, -p5_return * 100)

    # VaR 99%: 1st percentile of return
    p1_return = float(np.percentile(final_returns, 1))
    var_99 = max(0.0, -p1_return * 100)

    # 2. Conditional VaR (CVaR 95% / Expected Shortfall)
    tail_losses = -final_returns[final_returns <= p5_return]
    cvar_95 = float(np.mean(tail_losses) * 100) if len(tail_losses) > 0 else var_95

    # 3. Maximum Drawdown across paths
    # Running maximum along each path
    running_max = np.maximum.accumulate(paths, axis=1)
    drawdowns = (paths - running_max) / running_max
    max_drawdown = float(np.abs(np.min(drawdowns)) * 100)

    return MonteCarloResult(
        time_steps=time_steps,
        p10_trajectory=[round(float(v), 2) for v in p10_curve],
        p50_trajectory=[round(float(v), 2) for v in p50_curve],
        p90_trajectory=[round(float(v), 2) for v in p90_curve],
        var_95_percent=round(var_95, 2),
        var_99_percent=round(var_99, 2),
        cvar_95_percent=round(cvar_95, 2),
        max_drawdown_percent=round(max_drawdown, 2),
        final_capital_median=round(float(p50_curve[-1]), 2)
    )
