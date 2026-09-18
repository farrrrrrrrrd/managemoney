/**
 * ApexAlpha High-Performance Canvas Visualization Engine
 * Custom zero-dependency 2D Canvas rendering for Monte Carlo Fan Charts,
 * Markowitz Efficient Frontier curves, and Allocation Donut.
 */

export function renderMonteCarloChart(canvas, result) {
  if (!canvas || !result || !result.time_steps) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 30, right: 30, bottom: 40, left: 75 };

  ctx.clearRect(0, 0, w, h);

  const steps = result.time_steps;
  const p10 = result.p10_trajectory;
  const p50 = result.p50_trajectory;
  const p90 = result.p90_trajectory;

  const maxVal = Math.max(...p90) * 1.08;
  const minVal = Math.min(...p10) * 0.92;
  const maxTime = steps[steps.length - 1];

  const getX = (t) => padding.left + (t / maxTime) * (w - padding.left - padding.right);
  const getY = (v) => h - padding.bottom - ((v - minVal) / (maxVal - minVal)) * (h - padding.top - padding.bottom);

  // 1. Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = minVal + (i / yTicks) * (maxVal - minVal);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${Math.round(val).toLocaleString()}`, padding.left - 10, y + 3);
  }

  // X-axis Ticks
  const xTicks = Math.min(10, Math.round(maxTime));
  for (let i = 0; i <= xTicks; i++) {
    const t = (i / xTicks) * maxTime;
    const x = getX(t);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Yr ${t.toFixed(0)}`, x, h - padding.bottom + 18);
  }

  // 2. Confidence Ribbon Fill (p10 to p90)
  ctx.beginPath();
  ctx.moveTo(getX(steps[0]), getY(p90[0]));
  for (let i = 1; i < steps.length; i++) {
    ctx.lineTo(getX(steps[i]), getY(p90[i]));
  }
  for (let i = steps.length - 1; i >= 0; i--) {
    ctx.lineTo(getX(steps[i]), getY(p10[i]));
  }
  ctx.closePath();
  const ribbonGradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  ribbonGradient.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
  ribbonGradient.addColorStop(1, 'rgba(56, 189, 248, 0.03)');
  ctx.fillStyle = ribbonGradient;
  ctx.fill();

  // 3. Trajectory Lines
  const drawLine = (data, color, width, dashed = false) => {
    ctx.beginPath();
    if (dashed) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(getX(steps[0]), getY(data[0]));
    for (let i = 1; i < steps.length; i++) {
      ctx.lineTo(getX(steps[i]), getY(data[i]));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawLine(p90, '#a855f7', 1.5, true);  // 90th Percentile (Bull)
  drawLine(p10, '#f59e0b', 1.5, true);  // 10th Percentile (Bear)
  drawLine(p50, '#38bdf8', 2.5, false); // 50th Percentile (Median)

  // Legend
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '11px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('● Median (p50)', padding.left + 15, padding.top - 8);
  ctx.fillStyle = '#a855f7';
  ctx.fillText('--- 90th% (Bull)', padding.left + 130, padding.top - 8);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('--- 10th% (Bear)', padding.left + 245, padding.top - 8);
}


export function renderEfficientFrontierChart(canvas, frontierPoints, currentPoint) {
  if (!canvas || !frontierPoints || frontierPoints.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };

  ctx.clearRect(0, 0, w, h);

  const vols = frontierPoints.map(p => p.volatility);
  const rets = frontierPoints.map(p => p.return);

  const minX = Math.min(...vols) * 0.85;
  const maxX = Math.max(...vols, currentPoint ? currentPoint.volatility * 100 : 0) * 1.15;
  const minY = Math.min(...rets) * 0.85;
  const maxY = Math.max(...rets, currentPoint ? currentPoint.return * 100 : 0) * 1.15;

  const getX = (v) => padding.left + ((v - minX) / (maxX - minX)) * (w - padding.left - padding.right);
  const getY = (r) => h - padding.bottom - ((r - minY) / (maxY - minY)) * (h - padding.top - padding.bottom);

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yVal = minY + (i / 4) * (maxY - minY);
    const y = getY(yVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${yVal.toFixed(1)}%`, padding.left - 8, y + 3);
  }

  // Draw Frontier Curve
  ctx.beginPath();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.moveTo(getX(frontierPoints[0].volatility), getY(frontierPoints[0].return));
  for (let i = 1; i < frontierPoints.length; i++) {
    ctx.lineTo(getX(frontierPoints[i].volatility), getY(frontierPoints[i].return));
  }
  ctx.stroke();

  // Draw Current Portfolio Dot
  if (currentPoint) {
    const currX = getX(currentPoint.volatility * 100);
    const currY = getY(currentPoint.return * 100);

    // Pulse Ring
    ctx.beginPath();
    ctx.arc(currX, currY, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(currX, currY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(' Current Allocation', currX + 8, currY - 6);
  }

  // Axis Labels
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Annualized Volatility (Risk %)', padding.left + (w - padding.left - padding.right) / 2, h - 8);
}


export function renderAllocationDonut(canvas, allocations, assetsMap) {
  if (!canvas || !allocations) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const outerRadius = Math.min(centerX, centerY) - 10;
  const innerRadius = outerRadius * 0.65;

  ctx.clearRect(0, 0, w, h);

  let startAngle = -Math.PI / 2;
  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0) || 1.0;

  allocations.forEach((alloc) => {
    const sliceAngle = (alloc.weight / totalWeight) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const meta = assetsMap[alloc.asset_id] || { color: '#64748b' };

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = meta.color;
    ctx.fill();

    startAngle = endAngle;
  });

  // Center Cutout Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('100%', centerX, centerY + 4);
}
