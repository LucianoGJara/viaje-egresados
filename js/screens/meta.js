/**
 * screens/meta.js — Meta del viaje + proyección de unidades a vender.
 */

window.ScreenMeta = (() => {
  function proyeccionCardHtml(item) {
    return `
      <div class="card">
        <div class="flex justify-between items-center">
          <div>
            <div style="font-size:13.5px;font-weight:700;">${Utils.escapeHtml(item.producto.nombre)}</div>
            <div class="text-secondary" style="font-size:11.5px;margin-top:2px;">Ganancia por unidad: ${Utils.formatMoney(item.producto.ganancia)}</div>
          </div>
          <div class="text-center">
            <div style="font-size:20px;font-weight:800;color:var(--color-primary);">${Utils.formatNumber(item.unidadesFaltantes)}</div>
            <div class="text-muted" style="font-size:10.5px;font-weight:700;">unidades</div>
          </div>
        </div>
      </div>`;
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Meta del viaje</h1><p>Seguimiento del objetivo económico</p></div>
      <div class="skeleton" style="height:180px;"></div>`;

    const [productos, ventas, ingresos, meta] = await Promise.all([
      Api.listProductos({ includeInactive: false }), Api.listVentas(), Api.listIngresos(), Api.getMetaActiva()
    ]);
    const s = Stats.compute(ventas, ingresos, Number(meta.monto_meta) || 0);
    const pct = Utils.clamp(s.porcentaje, 0, 100);
    const proyecciones = Stats.proyeccion(productos, s.dineroFaltante);

    container.innerHTML = `
      <div class="screen-header"><h1>Meta del viaje</h1><p>Seguimiento del objetivo económico</p></div>

      <div class="card progress-card">
        <div class="progress-card__top">
          <div>
            <div class="progress-card__label">Meta</div>
            <div class="progress-card__amount">${Utils.formatMoney(meta.monto_meta)}</div>
          </div>
          <div class="progress-card__percent">${Utils.formatPercent(s.porcentaje)}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" id="meta-progress-fill" style="width:0%"></div></div>
        <div class="progress-card__footer">
          <span>Acumulado <strong>${Utils.formatMoney(s.dineroAcumulado)}</strong></span>
          <span>Faltante <strong>${Utils.formatMoney(s.dineroFaltante)}</strong></span>
        </div>
      </div>

      <div class="metrics-grid mt-16">
        <div class="metric-card">
          <div class="metric-card__label">💎 Ganancia acumulada</div>
          <div class="metric-card__value metric-card__value--sm">${Utils.formatMoney(s.gananciaPagada)}</div>
          <div class="metric-card__sub">De ventas ya cobradas</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__label">💰 Ingresos extras</div>
          <div class="metric-card__value metric-card__value--sm">${Utils.formatMoney(s.ingresosExtrasTotal)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__label">🎯 Total acumulado</div>
          <div class="metric-card__value metric-card__value--sm">${Utils.formatMoney(s.dineroAcumulado)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__label">📉 Faltante</div>
          <div class="metric-card__value metric-card__value--sm">${Utils.formatMoney(s.dineroFaltante)}</div>
        </div>
      </div>

      <div class="section-title">
        Proyección
        <span class="badge badge--info">si se vende un solo producto</span>
      </div>
      <p class="text-secondary" style="font-size:12.5px;margin-bottom:12px;">
        Unidades que faltarían vender de <strong>cada</strong> producto para cubrir por sí solo lo que falta para la meta.
      </p>
      <div class="list" id="proyeccion-list">
        ${s.dineroFaltante <= 0
          ? `<div class="empty-state"><p class="empty-state__title">🎉 ¡Meta alcanzada!</p><p class="empty-state__text">Ya juntaron el dinero para el viaje.</p></div>`
          : proyecciones.length
            ? proyecciones.map(proyeccionCardHtml).join('')
            : `<p class="text-secondary" style="font-size:13px;text-align:center;padding:16px 0;">Cargá productos activos para ver la proyección.</p>`
        }
      </div>
    `;

    requestAnimationFrame(() => {
      const fill = document.getElementById('meta-progress-fill');
      if (fill) fill.style.width = `${pct}%`;
    });
  }

  return { render };
})();
