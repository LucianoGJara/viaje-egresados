/**
 * screens/estadisticas.js — Métricas, rankings y gráficos.
 */

const ScreenEstadisticas = (() => {
  const PALETTE = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  let granularidad = 'day';
  let ventasCache = [];

  function metricCard(icon, label, value) {
    return `
      <div class="metric-card">
        <div class="metric-card__label">${icon} ${label}</div>
        <div class="metric-card__value metric-card__value--sm">${value}</div>
      </div>`;
  }

  function labelGrupo(key, gran) {
    if (gran === 'day') return Utils.formatDate(key).slice(0, 5);
    if (gran === 'week') return `S. ${Utils.formatDate(key).slice(0, 5)}`;
    const [y, m] = key.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(m, 10) - 1]}`;
  }

  function renderTendencia() {
    const grupos = Stats.agruparPorFecha(ventasCache, granularidad).slice(-10);
    const data = grupos.map((g) => ({ label: labelGrupo(g.key, granularidad), value: g.cantidad }));
    Charts.barChart(document.getElementById('chart-tendencia'), data, { color: '#4F46E5' });
  }

  function renderRanking(ranking) {
    const el = document.getElementById('ranking-list');
    if (!ranking.length) {
      el.innerHTML = `<p class="text-secondary" style="font-size:13px;text-align:center;padding:16px 0;">Todavía no hay ventas registradas.</p>`;
      return;
    }
    const max = Math.max(...ranking.map((r) => r.cantidad), 1);
    el.innerHTML = ranking.slice(0, 8).map((r, i) => `
      <div class="ranking-row">
        <div class="ranking-row__pos">${i + 1}</div>
        <div class="ranking-row__body">
          <div class="ranking-row__title">${Utils.escapeHtml(r.nombre)}</div>
          <div class="ranking-row__bar"><div class="ranking-row__bar-fill" style="width:${(r.cantidad / max) * 100}%; background:${PALETTE[i % PALETTE.length]}"></div></div>
        </div>
        <div class="ranking-row__value">${Utils.formatNumber(r.cantidad)} u.</div>
      </div>
    `).join('');
  }

  function renderDonut(ranking) {
    const top = ranking.slice(0, 5);
    const restoValor = ranking.slice(5).reduce((acc, r) => acc + r.facturado, 0);
    const segments = top.map((r, i) => ({ label: r.nombre, value: r.facturado, color: PALETTE[i % PALETTE.length] }));
    if (restoValor > 0) segments.push({ label: 'Otros', value: restoValor, color: '#CBD5E1' });
    const total = segments.reduce((a, s) => a + s.value, 0);
    Charts.donutChart(document.getElementById('chart-donut'), segments, {
      centerLabel: Utils.formatMoney(total).replace(/\s/g, ''), centerSub: 'facturado'
    });
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Estadísticas</h1><p>El estado de tu campaña en números</p></div>
      <div class="skeleton" style="height:200px;"></div>`;

    const [ventas, ingresos, meta] = await Promise.all([Api.listVentas(), Api.listIngresos(), Api.getMetaActiva()]);
    ventasCache = ventas;
    const s = Stats.compute(ventas, ingresos, Number(meta.monto_meta) || 0);
    const unidadesVendidas = ventas.reduce((acc, v) => acc + (Number(v.cantidad) || 0), 0);

    container.innerHTML = `
      <div class="screen-header"><h1>Estadísticas</h1><p>El estado de tu campaña en números</p></div>

      <div class="metrics-grid">
        ${metricCard('📦', 'Productos vendidos', Utils.formatNumber(unidadesVendidas))}
        ${metricCard('📈', 'Facturación total', Utils.formatMoney(s.totalFacturado))}
        ${metricCard('💎', 'Ganancia total', Utils.formatMoney(s.gananciaTotal))}
        ${metricCard('💰', 'Ingresos extras', Utils.formatMoney(s.ingresosExtrasTotal))}
        ${metricCard('🎯', 'Acumulado para el viaje', Utils.formatMoney(s.dineroAcumulado))}
        ${metricCard('📊', 'Ticket promedio', Utils.formatMoney(s.ticketPromedio))}
      </div>

      <div class="section-title">Ventas por producto</div>
      <div class="chart-card" id="chart-donut-card">
        <div id="chart-donut"></div>
      </div>

      <div class="section-title">🏆 Ranking de productos</div>
      <div class="card" id="ranking-list"></div>

      <div class="section-title">Evolución de ventas</div>
      <div class="chart-card">
        <div class="stat-tabs" id="tendencia-tabs">
          <button data-gran="day" class="is-active">Día</button>
          <button data-gran="week">Semana</button>
          <button data-gran="month">Mes</button>
        </div>
        <div id="chart-tendencia"></div>
      </div>
    `;

    renderRanking(s.ranking);
    renderDonut(s.ranking);
    renderTendencia();

    document.getElementById('tendencia-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-gran]');
      if (!btn) return;
      granularidad = btn.dataset.gran;
      document.querySelectorAll('#tendencia-tabs button').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderTendencia();
    });
  }

  return { render };
})();

window.ScreenEstadisticas = ScreenEstadisticas;
