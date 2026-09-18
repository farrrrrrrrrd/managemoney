"""
ApexAlpha Markowitz Modern Portfolio Theory Engine
Calculates expected portfolio return, variance via covariance matrix, Sharpe ratio,
and points along the Markowitz Efficient Frontier curve.
"""

from typing import List, Dict
import numpy as np

from backend.app.domain.models import Allocation, PortfolioMetrics
from backend.app.repository.db import DEFAULT_ASSETS, get_covariance_matrix


def calculate_portfolio_metrics(
    allocations: List[Allocation],
    risk_free_rate: float,
    total_capital: float
) -> PortfolioMetrics:
    """
    Computes expected return, annualized volatility, and Sharpe ratio
    using matrix algebra:
      mu_p = w^T * mu
      sigma_p = sqrt(w^T * Sigma * w)
      Sharpe = (mu_p - Rf) / sigma_p
    """
    asset_ids = [a.asset_id for a in allocations]
    weights = np.array([a.weight for a in allocations], dtype=float)

    # Normalize weights to exactly 1.0
    weight_sum = np.sum(weights)
    if weight_sum > 0:
        weights = weights / weight_sum

    # Expected returns vector
    expected_returns = np.array([DEFAULT_ASSETS[aid].expected_return for aid in asset_ids], dtype=float)

    # Expected portfolio return: w^T * mu
    port_return = float(np.dot(weights, expected_returns))

    # Covariance matrix: Sigma
    cov_matrix = get_covariance_matrix(asset_ids)

    # Portfolio variance: w^T * Sigma * w
    port_variance = float(np.dot(weights.T, np.dot(cov_matrix, weights)))
    port_volatility = float(np.sqrt(max(1e-8, port_variance)))

    # Sharpe ratio
    sharpe = float((port_return - risk_free_rate) / port_volatility) if port_volatility > 0 else 0.0

    return PortfolioMetrics(
        expected_annual_return=round(port_return, 4),
        annualized_volatility=round(port_volatility, 4),
        sharpe_ratio=round(sharpe, 3),
        total_capital=round(total_capital, 2)
    )


def generate_efficient_frontier(
    risk_free_rate: float,
    num_points: int = 25
) -> List[Dict[str, float]]:
    """
    Generates points spanning the Markowitz Efficient Frontier
    from minimum-variance portfolio to maximum-return portfolio.
    """
    asset_ids = list(DEFAULT_ASSETS.keys())
    n = len(asset_ids)
    cov_matrix = get_covariance_matrix(asset_ids)
    expected_returns = np.array([DEFAULT_ASSETS[aid].expected_return for aid in asset_ids])

    # Monte Carlo randomized Dirichlet sampling for frontier surface
    sample_size = 1200
    np.random.seed(42)
    alpha = np.ones(n)
    weights_samples = np.random.dirichlet(alpha, size=sample_size)

    # Also include pure 100% asset allocations
    identity_weights = np.eye(n)
    weights_samples = np.vstack([weights_samples, identity_weights])

    returns = np.dot(weights_samples, expected_returns)
    variances = np.einsum('ij,jk,ik->i', weights_samples, cov_matrix, weights_samples)
    volatilities = np.sqrt(np.maximum(1e-8, variances))

    # Bin by volatility and take maximum return in each bucket
    min_vol = float(np.min(volatilities))
    max_vol = float(np.max(volatilities))
    vol_bins = np.linspace(min_vol, max_vol, num_points)

    frontier_points = []
    for i in range(len(vol_bins) - 1):
        v_low = vol_bins[i]
        v_high = vol_bins[i + 1]
        mask = (volatilities >= v_low) & (volatilities <= v_high)
        if np.any(mask):
            max_ret_idx = np.argmax(returns[mask])
            best_ret = float(returns[mask][max_ret_idx])
            best_vol = float(volatilities[mask][max_ret_idx])
            sharpe = (best_ret - risk_free_rate) / best_vol if best_vol > 0 else 0.0
            frontier_points.append({
                "volatility": round(best_vol * 100, 2),
                "return": round(best_ret * 100, 2),
                "sharpe": round(sharpe, 3)
            })

    # Sort monotonically by volatility
    frontier_points.sort(key=lambda p: p["volatility"])
    return frontier_points
