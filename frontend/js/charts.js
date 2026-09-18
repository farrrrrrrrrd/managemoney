/**
 * Fino Smooth Spline Area Chart & Category Donut Visualization
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
  const padding = { top: 25, right: 25, bottom: 35, left: 65 };

  ctx.clearRect(0, 0, w, h);

  const values = dataPoints.map(d => d.amount);
  const maxVal = Math.max(...values, 1000000) * 1.25;
  const minVal = 0;
  const n = dataPoints.length;

  const getX = (i) => padding.left + (i / (n - 1)) * (w - padding.left - padding.right);
  const getY = (v) => h - padding.bottom - ((v - minVal) / (maxVal - minVal)) * (h - padding.top - padding.bottom);

  // 1. Grid lines
  ctx.strokeStyle = isDark ? 'rgba(74, 222, 128, 0.08)' : 'rgba(34, 197, 94, 0.08)';
  ctx.lineWidth = 1;
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const val = minVal + (i / yTicks) * (maxVal - minVal);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    let label = `Rp ${(val / 1000).toFixed(0)}rb`;
    if (val >= 1000000) label = `Rp ${(val / 1000000).toFixed(1)}jt`;
    ctx.fillText(label, padding.left - 10, y + 3);
  }

  // X-axis labels
  for (let i = 0; i < n; i++) {
    const x = getX(i);
    ctx.fillStyle = isDark ? '#64748b' : '#64748b';
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
    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.35)');
    gradient.addColorStop(1, 'rgba(74, 222, 128, 0.0)');
  } else {
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.28)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.01)');
  }
  ctx.fillStyle = gradient;
  ctx.fill(fillPath);

  // Stroke Curve
  ctx.strokeStyle = isDark ? '#4ade80' : '#22c55e';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw Data Point Nodes
  points.forEach((pt, idx) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#152219' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#4ade80' : '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });
}


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
  const outerRadius = Math.min(centerX, centerY) - 12;
  const innerRadius = outerRadius * 0.68;

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

    // Subtle slice border
    ctx.strokeStyle = isDark ? '#152219' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Center Text
  ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
  ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('100%', centerX, centerY + 5);
}
