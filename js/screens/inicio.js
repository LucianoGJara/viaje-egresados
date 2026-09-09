/**
 * screens/inicio.js — Dashboard principal.
 */

window.ScreenInicio = (() => {
  const ICONS = {
    factura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    ganancia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    extra: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>',
    pendiente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    compradores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    ventas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v4H3z"/><path d="M5 7v13a1 1 0 001 1h12a1 1 0 001-1V7"/><line x1="9" y1="12" x2="15" y2="12"/></svg>',
    trofeo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M17 5h3a2 2 0 01-2 4M7 5H4a2 2 0 002 4"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };

  function metricCard({ icon, iconClass, label, value, sub, small }) {
    return `
      <div class="metric-card">
        <div class="metric-card__icon ${iconClass}">${icon}</div>
        <div class="metric-card__label">${label}</div>
        <div class="metric-card__value ${small ? 'metric-card__value--sm' : ''}">${value}</div>
        ${sub ? `<div class="metric-card__sub">${sub}</div>` : ''}
      </div>`;
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header">
        <h1>Hola 👋</h1>
        <p>Así viene la recaudación para el viaje</p>
      </div>
      <div class="skeleton" style="height:170px;margin-bottom:14px;"></div>
      <div class="metrics-grid">
        ${Array.from({ length: 6 }).map(() => '<div class="skeleton" style="height:96px;"></div>').join('')}
      </div>`;

    const [productos, ventas, ingresos, meta] = await Promise.all([
      Api.listProductos(), Api.listVentas(), Api.listIngresos(), Api.getMetaActiva()
    ]);

    const s = Stats.compute(ventas, ingresos, Number(meta.monto_meta) || 0);
    const pct = Utils.clamp(s.porcentaje, 0, 100);

    const ultimaVentaHtml = s.ultimaVenta
      ? `${Utils.escapeHtml(s.ultimaVenta.comprador_nombre)} · ${Utils.formatMoney(s.ultimaVenta.precio_total)}`
      : 'Sin ventas todavía';
    const ultimaVentaSub = s.ultimaVenta ? Utils.timeAgo(s.ultimaVenta.created_at) : '';

    const productoTopHtml = s.productoMasVendido
      ? Utils.escapeHtml(s.productoMasVendido.nombre)
      : 'Todavía sin ventas';
    const productoTopSub = s.productoMasVendido ? `${Utils.formatNumber(s.productoMasVendido.cantidad)} unidades vendidas` : '';

    container.innerHTML = `
      <div class="screen-header">
        <h1>Hola 👋</h1>
        <p>Así viene la recaudación para el viaje</p>
      </div>

      <div class="card progress-card">
        <div class="progress-card__top">
          <div>
            <div class="progress-card__label">Dinero acumulado</div>
            <div class="progress-card__amount">${Utils.formatMoney(s.dineroAcumulado)}</div>
            <div class="progress-card__goal">Meta: ${Utils.formatMoney(meta.monto_meta)}</div>
          </div>
          <div class="progress-card__percent">${Utils.formatPercent(s.porcentaje)}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" id="home-progress-fill" style="width:0%"></div></div>
        <div class="progress-card__footer">
          <span>Faltan <strong>${Utils.formatMoney(s.dineroFaltante)}</strong></span>
          <span>Meta total <strong>${Utils.formatMoney(meta.monto_meta)}</strong></span>
        </div>
      </div>

      <div class="section-title">Resumen general</div>
      <div class="metrics-grid">
        ${metricCard({ icon: ICONS.factura, iconClass: 'icon-bg-primary', label: 'Total facturado', value: Utils.formatMoney(s.totalFacturado), small: true })}
        ${metricCard({ icon: ICONS.ganancia, iconClass: 'icon-bg-secondary', label: 'Ganancia total', value: Utils.formatMoney(s.gananciaTotal), small: true })}
        ${metricCard({ icon: ICONS.extra, iconClass: 'icon-bg-accent', label: 'Ingresos extras', value: Utils.formatMoney(s.ingresosExtrasTotal), small: true })}
        ${metricCard({ icon: ICONS.pendiente, iconClass: 'icon-bg-danger', label: 'Pendiente de cobro', value: Utils.formatMoney(s.dineroPendienteCobro), small: true })}
        ${metricCard({ icon: ICONS.compradores, iconClass: 'icon-bg-info', label: 'Compradores', value: Utils.formatNumber(s.cantidadCompradores) })}
        ${metricCard({ icon: ICONS.ventas, iconClass: 'icon-bg-primary', label: 'Ventas registradas', value: Utils.formatNumber(s.cantidadVentas) })}
      </div>

      <div class="section-title">Destacados</div>
      <div class="metrics-grid">
        ${metricCard({ icon: ICONS.trofeo, iconClass: 'icon-bg-accent', label: 'Producto más vendido', value: productoTopHtml, sub: productoTopSub, small: true })}
        ${metricCard({ icon: ICONS.reloj, iconClass: 'icon-bg-secondary', label: 'Última venta registrada', value: ultimaVentaHtml, sub: ultimaVentaSub, small: true })}
      </div>

      <div class="section-title">Accesos rápidos</div>
      <div class="chip-row">
        <div class="chip" data-nav="nueva-venta">➕ Nueva venta</div>
        <div class="chip" data-nav="ingresos">💰 Ingreso extra</div>
        <div class="chip" data-nav="estadisticas">📊 Estadísticas</div>
        <div class="chip" data-nav="compartir">📣 Compartir</div>
      </div>
    `;

    requestAnimationFrame(() => {
      const fill = document.getElementById('home-progress-fill');
      if (fill) fill.style.width = `${pct}%`;
    });
  }

  return { render };
})();
