/**
 * RIED Canvas Data Visualizations
 * Reconstructed 1:1 from video document_6156569914959209641.mp4:
 * 1. renderSplineChart: Smooth organic green area curve for "Per hari"
 * 2. renderTransactionBarChart: Dense neon mint bars for "Per transaksi" (frame_45.png)
 * 3. renderStackedBudgetChart: Vertical stacked budget columns with 20%, 50%, 75%, 100% ticks (frame_30.png)
 * 4. renderCategoryDonut: Clean donut chart
 */

export function renderSplineChart(canvas, dataPoints, isDark = false) {
  if (!canvas || !dataPoints || dataPoints.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 25, right: 25, bottom: 35, left: 60 };

  ctx.clearRect(0, 0, w, h);

  const values = dataPoints.map(d => d.amount);
  const maxVal = Math.max(...values, 1000000) * 1.2;
  const minVal = 0;
  const n = dataPoints.length;

  const getX = (i) => padding.left + (i / (n - 1)) * (w - padding.left - padding.right);
  const getY = (v) => h - padding.bottom - ((v - minVal) / (maxVal - minVal)) * (h - padding.top - padding.bottom);

  // 1. Grid lines
  ctx.strokeStyle = isDark ? 'rgba(78, 250, 139, 0.08)' : 'rgba(56, 168, 82, 0.09)';
  ctx.lineWidth = 1;
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const val = minVal + (i / yTicks) * (maxVal - minVal);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#7d9685' : '#8a9e8f';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    let label = `Rp ${(val / 1000).toFixed(0)}rb`;
    if (val >= 1000000) label = `Rp ${(val / 1000000).toFixed(1)}jt`;
    ctx.fillText(label, padding.left - 8, y + 3);
  }

  // X-axis labels
  for (let i = 0; i < n; i++) {
    const x = getX(i);
    ctx.fillStyle = isDark ? '#7d9685' : '#8a9e8f';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dataPoints[i].day_label, x, h - padding.bottom + 18);
  }

  // 2. Smooth Spline Bezier Curve
  const points = [];
  for (let i = 0; i < n; i++) {
    points.push({ x: getX(i), y: getY(values[i]) });
  }

  if (points.length < 2) return;

  // Build curved path
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = (i > 0) ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = (i != points.length - 2) ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  // Fill gradient
  const fillPath = new Path2D();
  fillPath.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = (i > 0) ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = (i != points.length - 2) ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    fillPath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  fillPath.lineTo(points[points.length - 1].x, h - padding.bottom);
  fillPath.lineTo(points[0].x, h - padding.bottom);
  fillPath.closePath();

  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  if (isDark) {
    gradient.addColorStop(0, 'rgba(78, 250, 139, 0.35)');
    gradient.addColorStop(1, 'rgba(78, 250, 139, 0.01)');
  } else {
    gradient.addColorStop(0, 'rgba(56, 168, 82, 0.28)');
    gradient.addColorStop(1, 'rgba(56, 168, 82, 0.01)');
  }
  ctx.fillStyle = gradient;
  ctx.fill(fillPath);

  // Stroke Curve
  ctx.strokeStyle = isDark ? '#4efa8b' : '#38a852';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Data Point Nodes
  points.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#131e16' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#4efa8b' : '#38a852';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

/**
 * Dense Transaction Bar Chart for "Per transaksi" mode (matching frame_45.png)
 */
export function renderTransactionBarChart(canvas, transactions, isDark = false) {
  if (!canvas || !transactions || transactions.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 25, right: 25, bottom: 35, left: 60 };

  ctx.clearRect(0, 0, w, h);

  // Filter only expenses
  const expenseTxs = transactions.filter(t => t.type === 'expense');
  if (expenseTxs.length === 0) return;

  const amounts = expenseTxs.map(t => t.amount);
  const maxVal = Math.max(...amounts, 1000000) * 1.15;
  const minVal = 0;
  const n = expenseTxs.length;

  const getX = (i) => padding.left + (i / n) * (w - padding.left - padding.right);
  const getY = (v) => h - padding.bottom - ((v - minVal) / (maxVal - minVal)) * (h - padding.top - padding.bottom);

  // Grid lines
  ctx.strokeStyle = isDark ? 'rgba(78, 250, 139, 0.08)' : 'rgba(56, 168, 82, 0.09)';
  ctx.lineWidth = 1;
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const val = minVal + (i / yTicks) * (maxVal - minVal);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#7d9685' : '#8a9e8f';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    let label = `Rp ${(val / 1000).toFixed(0)}rb`;
    if (val >= 1000000) label = `Rp ${(val / 1000000).toFixed(1)}jt`;
    ctx.fillText(label, padding.left - 8, y + 3);
  }

  // Draw dense vertical bars
  const barWidth = Math.max(3, Math.min(12, (w - padding.left - padding.right) / n - 3));
  const neonGreen = isDark ? '#4efa8b' : '#38a852';

  expenseTxs.forEach((tx, i) => {
    const x = getX(i) + 2;
    const y = getY(tx.amount);
    const barHeight = (h - padding.bottom) - y;

    // Bar background
    ctx.fillStyle = neonGreen;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
    ctx.fill();
  });

  // Base axis line
  ctx.strokeStyle = isDark ? '#233628' : '#dce6d9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, h - padding.bottom);
  ctx.lineTo(w - padding.right, h - padding.bottom);
  ctx.stroke();
}

/**
 * Stacked Budget Projection Chart (matching frame_30.png & frame_45.png)
 * Percentage vertical ticks: 0%, 20%, 50%, 75%, 100%
 */
export function renderStackedBudgetChart(canvas, categories, isDark = false) {
  if (!canvas || !categories || categories.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 20, right: 20, bottom: 45, left: 45 };

  ctx.clearRect(0, 0, w, h);

  const ticks = [0, 0.2, 0.5, 0.75, 1.0];
  const chartHeight = h - padding.top - padding.bottom;

  // Grid lines
  ticks.forEach(t => {
    const y = h - padding.bottom - (t * chartHeight);
    ctx.strokeStyle = isDark ? 'rgba(78, 250, 139, 0.08)' : 'rgba(56, 168, 82, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#7d9685' : '#8a9e8f';
    ctx.font = '9px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(t * 100)}%`, padding.left - 6, y + 3);
  });

  const n = categories.length;
  const colWidth = (w - padding.left - padding.right) / n;
  const barWidth = Math.min(18, colWidth * 0.55);

  categories.forEach((cat, i) => {
    const cx = padding.left + i * colWidth + colWidth / 2;
    const catName = cat.category || cat.name || '';
    const ratio = cat.budget > 0 ? (cat.spent / cat.budget) : 0;
    const clampedRatio = Math.min(ratio, 1.25);
    const barH = (clampedRatio / 1.0) * chartHeight;
    const y = Math.max(padding.top, (h - padding.bottom) - barH);

    // Track background
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
    ctx.beginPath();
    ctx.roundRect(cx - barWidth / 2, padding.top, barWidth, chartHeight, [4, 4, 4, 4]);
    ctx.fill();

    // Actual filled bar
    const isOver = ratio > 1.0;
    ctx.fillStyle = isOver ? '#ef4444' : (isDark ? '#4efa8b' : '#38a852');
    ctx.beginPath();
    ctx.roundRect(cx - barWidth / 2, y, barWidth, (h - padding.bottom) - y, [4, 4, 2, 2]);
    ctx.fill();

    // X-axis label (slanted or abbreviated)
    ctx.save();
    ctx.translate(cx, h - padding.bottom + 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(catName, 0, 0);
    ctx.restore();
  });
}

/**
 * Category Donut Chart
 */
export function renderCategoryDonut(canvas, categories, isDark = false) {
  if (!canvas || !categories || categories.length === 0) return;
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

  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0) || 1;
  let startAngle = -Math.PI / 2;

  categories.forEach((cat) => {
    const sliceAngle = (cat.spent / totalSpent) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = cat.color;
    ctx.fill();

    ctx.strokeStyle = isDark ? '#131e16' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Center percentage
  ctx.fillStyle = isDark ? '#e2ede5' : '#1e2920';
  ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('100%', centerX, centerY + 4);
}
