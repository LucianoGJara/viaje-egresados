/**
 * charts.js
 * Gráficos simples, livianos y sin dependencias, dibujados con SVG.
 * Pensados para "Estadísticas" pero reutilizables en cualquier pantalla.
 */

const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  /**
   * Gráfico de barras verticales simple.
   * data: [{ label, value }]
   */
  function barChart(container, data, { color = '#4F46E5', height = 160, formatValue } = {}) {
    container.innerHTML = '';
    if (!data.length) {
      container.innerHTML = '<p class="text-secondary" style="font-size:12.5px;padding:20px 0;text-align:center;">Todavía no hay datos suficientes.</p>';
      return;
    }
    const max = Math.max(...data.map((d) => d.value), 1);
    const width = 320;
    const padding = 8;
    const barGap = 10;
    const barWidth = (width - padding * 2 - barGap * (data.length - 1)) / data.length;
    const svg = el('svg', { viewBox: `0 0 ${width} ${height + 34}`, preserveAspectRatio: 'none' });

    data.forEach((d, i) => {
      const x = padding + i * (barWidth + barGap);
      const barHeight = Math.max(4, (d.value / max) * height);
      const y = height - barHeight;

      svg.appendChild(el('rect', {
        x, y: height, width: barWidth, height: 0, rx: 6,
        fill: color, class: 'chart-bar', 'data-final-y': y, 'data-final-h': barHeight
      }));

      const label = el('text', {
        x: x + barWidth / 2, y: height + 18, 'text-anchor': 'middle',
        'font-size': '9', fill: 'var(--text-muted)', 'font-weight': '700'
      });
      label.textContent = d.label;
      svg.appendChild(label);

      const valueLabel = el('text', {
        x: x + barWidth / 2, y: y - 6, 'text-anchor': 'middle', class: 'chart-tooltip-value'
      });
      valueLabel.textContent = formatValue ? formatValue(d.value) : d.value;
      svg.appendChild(valueLabel);
    });

    container.appendChild(svg);

    requestAnimationFrame(() => {
      svg.querySelectorAll('.chart-bar').forEach((bar) => {
        bar.setAttribute('y', bar.getAttribute('data-final-y'));
        bar.setAttribute('height', bar.getAttribute('data-final-h'));
      });
    });
  }

  /**
   * Gráfico de anillo (donut) simple.
   * segments: [{ label, value, color }]
   */
  function donutChart(container, segments, { size = 180, thickness = 26, centerLabel = '', centerSub = '' } = {}) {
    container.innerHTML = '';
    const total = segments.reduce((s, x) => s + x.value, 0);
    const radius = size / 2 - thickness / 2;
    const circumference = 2 * Math.PI * radius;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:flex;justify-content:center;';

    const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, width: '100%', style: `max-width:${size}px;` });
    svg.appendChild(el('circle', {
      cx: size / 2, cy: size / 2, r: radius, fill: 'none',
      stroke: 'var(--border-color)', 'stroke-width': thickness
    }));

    if (total > 0) {
      let offset = 0;
      segments.forEach((seg) => {
        const fraction = seg.value / total;
        const dash = fraction * circumference;
        const circle = el('circle', {
          cx: size / 2, cy: size / 2, r: radius, fill: 'none',
          stroke: seg.color, 'stroke-width': thickness,
          'stroke-dasharray': `0 ${circumference}`,
          'stroke-dashoffset': -offset,
          'stroke-linecap': segments.length > 1 ? 'butt' : 'round',
          transform: `rotate(-90 ${size / 2} ${size / 2})`,
          class: 'chart-donut-seg',
          'data-final-dash': `${dash} ${circumference - dash}`
        });
        svg.appendChild(circle);
        offset += dash;
      });
    }

    wrap.appendChild(svg);

    const centerBox = document.createElement('div');
    centerBox.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;';
    centerBox.innerHTML = `<div style="font-size:19px;font-weight:800;">${centerLabel}</div><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">${centerSub}</div>`;
    wrap.appendChild(centerBox);

    container.appendChild(wrap);

    // Leyenda
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.style.justifyContent = 'center';
    segments.forEach((seg) => {
      const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'chart-legend__item';
      item.innerHTML = `<span class="chart-legend__dot" style="background:${seg.color}"></span> ${Utils.escapeHtml(seg.label)} · ${pct}%`;
      legend.appendChild(item);
    });
    container.appendChild(legend);

    requestAnimationFrame(() => {
      svg.querySelectorAll('.chart-donut-seg').forEach((seg) => {
        seg.setAttribute('stroke-dasharray', seg.getAttribute('data-final-dash'));
      });
    });
  }

  /**
   * Gráfico de línea / área simple (para evolución en el tiempo).
   * points: [{ label, value }]
   */
  function lineChart(container, points, { color = '#10B981', height = 140 } = {}) {
    container.innerHTML = '';
    if (!points.length) {
      container.innerHTML = '<p class="text-secondary" style="font-size:12.5px;padding:20px 0;text-align:center;">Todavía no hay datos suficientes.</p>';
      return;
    }
    const width = 320;
    const padding = 10;
    const max = Math.max(...points.map((p) => p.value), 1);
    const min = 0;
    const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

    const coords = points.map((p, i) => {
      const x = padding + i * stepX;
      const y = height - ((p.value - min) / (max - min || 1)) * (height - 20) - 6;
      return [x, y];
    });

    const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1][0]},${height} L${coords[0][0]},${height} Z`;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height + 22}`, preserveAspectRatio: 'none' });

    const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;
    const defs = el('defs');
    const gradient = el('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' });
    gradient.appendChild(el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.35' }));
    gradient.appendChild(el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(gradient);
    svg.appendChild(defs);

    svg.appendChild(el('path', { d: areaPath, fill: `url(#${gradientId})`, stroke: 'none' }));
    const path = el('path', { d: linePath, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const len = 1000;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.style.transition = 'stroke-dashoffset 1s ease';
    svg.appendChild(path);

    coords.forEach(([x, y]) => {
      svg.appendChild(el('circle', { cx: x, cy: y, r: 3, fill: color }));
    });

    points.forEach((p, i) => {
      const label = el('text', {
        x: coords[i][0], y: height + 16, 'text-anchor': 'middle',
        'font-size': '9', fill: 'var(--text-muted)', 'font-weight': '700'
      });
      label.textContent = p.label;
      svg.appendChild(label);
    });

    container.appendChild(svg);
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  }

  return { barChart, donutChart, lineChart };
})();
