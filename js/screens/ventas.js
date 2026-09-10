/**
 * screens/ventas.js — Listado, búsqueda, filtros y acciones sobre ventas.
 */

const ScreenVentas = (() => {
  let productosCache = [];
  let filtros = { busqueda: '', productoId: '', estado: '', desde: '', hasta: '' };
  let filtrosAbiertos = false;
  let rootRef = null;

  function initials(name) {
    return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  function itemHtml(v) {
    return `
      <div class="list-item" data-id="${v.id}">
        <div class="list-item__avatar">${initials(v.comprador_nombre)}</div>
        <div class="list-item__body">
          <div class="list-item__title">${Utils.escapeHtml(v.comprador_nombre)}</div>
          <div class="list-item__subtitle">${Utils.escapeHtml(v.producto_nombre)} · x${v.cantidad} · ${Utils.formatDate(v.fecha)}</div>
        </div>
        <div class="list-item__meta">
          <div class="list-item__amount">${Utils.formatMoney(v.precio_total)}</div>
          <span class="badge ${v.estado === 'pagado' ? 'badge--pagado' : 'badge--pendiente'}">${v.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}</span>
        </div>
      </div>`;
  }

  function filtrosPanelHtml() {
    return `
      <div class="card mt-12" id="filtros-panel">
        <div class="form-group">
          <label class="form-label">Producto</label>
          <div class="select-wrap">
            <select class="select" id="filtro-producto">
              <option value="">Todos los productos</option>
              ${productosCache.map((p) => `<option value="${p.id}" ${filtros.productoId === p.id ? 'selected' : ''}>${Utils.escapeHtml(p.nombre)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input type="date" class="input" id="filtro-desde" value="${filtros.desde}">
          </div>
          <div class="form-group">
            <label class="form-label">Hasta</label>
            <input type="date" class="input" id="filtro-hasta" value="${filtros.hasta}">
          </div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn--ghost btn--block" id="filtro-limpiar">Limpiar filtros</button>
          <button class="btn btn--primary btn--block" id="filtro-aplicar">Aplicar</button>
        </div>
      </div>`;
  }

  async function cargarLista() {
    const listEl = document.getElementById('ventas-list');
    const resumenEl = document.getElementById('ventas-resumen');
    if (!listEl) return;
    listEl.innerHTML = `<div class="skeleton" style="height:74px;"></div><div class="skeleton" style="height:74px;"></div><div class="skeleton" style="height:74px;"></div>`;

    const ventas = await Api.listVentas(filtros);

    if (resumenEl) {
      const totalImporte = Stats.sum(ventas, 'precio_total');
      const totalGanancia = Stats.sum(ventas, 'ganancia_total');
      resumenEl.innerHTML = `${ventas.length} venta${ventas.length === 1 ? '' : 's'} · ${Utils.formatMoney(totalImporte)} · ganancia ${Utils.formatMoney(totalGanancia)}`;
    }

    if (!ventas.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3h18v4H3z"/><path d="M5 7v13a1 1 0 001 1h12a1 1 0 001-1V7"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
          <p class="empty-state__title">No se encontraron ventas</p>
          <p class="empty-state__text">Probá con otros filtros o registrá una nueva venta.</p>
        </div>`;
      return;
    }
    listEl.innerHTML = ventas.map(itemHtml).join('');
    listEl.querySelectorAll('.list-item').forEach((el) => {
      el.addEventListener('click', () => abrirDetalle(el.dataset.id));
    });
  }

  function calcularVenta({ producto, cantidad, costoUnitario, precioUnitario }) {
    const costoTotal = Utils.round2(costoUnitario * cantidad);
    const precioTotal = Utils.round2(precioUnitario * cantidad);
    const gananciaTotal = Utils.round2(precioTotal - costoTotal);
    const rentabilidad = costoTotal > 0 ? Utils.round2((gananciaTotal / costoTotal) * 100) : 0;
    return { costoTotal, precioTotal, gananciaTotal, rentabilidad };
  }

  function detalleHtml(v) {
    return `
      <div class="summary-box">
        <div class="summary-row"><span class="summary-row__label">Comprador</span><span class="summary-row__value">${Utils.escapeHtml(v.comprador_nombre)}</span></div>
        ${v.telefono ? `<div class="summary-row"><span class="summary-row__label">Teléfono</span><span class="summary-row__value">${Utils.escapeHtml(v.telefono)}</span></div>` : ''}
        <div class="summary-row"><span class="summary-row__label">Producto</span><span class="summary-row__value">${Utils.escapeHtml(v.producto_nombre)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Cantidad</span><span class="summary-row__value">${v.cantidad}</span></div>
        <div class="summary-row"><span class="summary-row__label">Fecha</span><span class="summary-row__value">${Utils.formatDate(v.fecha)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Estado</span><span class="badge ${v.estado === 'pagado' ? 'badge--pagado' : 'badge--pendiente'}">${v.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}</span></div>
      </div>
      <div class="summary-box mt-12">
        <div class="summary-row"><span class="summary-row__label">Precio total</span><span class="summary-row__value">${Utils.formatMoney(v.precio_total)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Costo total</span><span class="summary-row__value">${Utils.formatMoney(v.costo_total)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Rentabilidad</span><span class="summary-row__value">${Utils.formatPercent(v.rentabilidad)}</span></div>
        <div class="summary-row summary-row--total"><span class="summary-row__label">Ganancia total</span><span class="summary-row__value">${Utils.formatMoney(v.ganancia_total)}</span></div>
      </div>
      ${v.observaciones ? `<p class="form-hint mt-12">📝 ${Utils.escapeHtml(v.observaciones)}</p>` : ''}

      <div class="swipe-actions mt-16" style="flex-wrap:wrap;">
        <button class="btn btn--secondary btn--sm" id="accion-estado">${v.estado === 'pagado' ? '⏳ Marcar pendiente' : '✅ Marcar pagado'}</button>
        <button class="btn btn--ghost btn--sm" id="accion-editar">✏️ Editar</button>
        <button class="btn btn--ghost btn--sm" id="accion-duplicar">📋 Duplicar</button>
        <button class="btn btn--danger btn--sm" id="accion-eliminar">🗑️ Eliminar</button>
      </div>
    `;
  }

  function editarHtml(v) {
    return `
      <form id="form-editar-venta">
        <div class="form-group">
          <label class="form-label">Nombre del comprador *</label>
          <input class="input" name="comprador_nombre" value="${Utils.escapeHtml(v.comprador_nombre)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input class="input" name="telefono" value="${Utils.escapeHtml(v.telefono || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Producto *</label>
          <div class="select-wrap">
            <select class="select" name="producto" required>
              ${productosCache.map((p) => `<option value="${p.id}" data-costo="${p.costo}" data-precio="${p.precio_venta}" ${p.id === v.producto_id ? 'selected' : ''}>${Utils.escapeHtml(p.nombre)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Cantidad</label>
          <input class="input" name="cantidad" type="number" min="1" value="${v.cantidad}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input class="input" name="fecha" type="date" value="${v.fecha}">
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <div class="select-wrap">
            <select class="select" name="estado">
              <option value="pendiente" ${v.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
              <option value="pagado" ${v.estado === 'pagado' ? 'selected' : ''}>✅ Pagado</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <textarea class="textarea" name="observaciones">${Utils.escapeHtml(v.observaciones || '')}</textarea>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="btn-cancelar-edicion">Cancelar</button>
          <button type="submit" class="btn btn--primary">Guardar cambios</button>
        </div>
      </form>
    `;
  }

  async function abrirDetalle(id) {
    const v = await Api.getVenta(id);
    AppModal.open('Detalle de venta', detalleHtml(v), {
      onMount: (body) => {
        body.querySelector('#accion-estado').addEventListener('click', async () => {
          try {
            await Api.cambiarEstadoVenta(v.id, v.estado === 'pagado' ? 'pendiente' : 'pagado');
            Utils.toast('Estado actualizado', 'success');
            AppModal.close();
            cargarLista();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });

        body.querySelector('#accion-editar').addEventListener('click', () => {
          AppModal.open('Editar venta', editarHtml(v), { onMount: (editBody) => attachEditForm(editBody, v) });
        });

        body.querySelector('#accion-duplicar').addEventListener('click', async () => {
          try {
            await Api.duplicarVenta(v.id);
            Utils.toast('Venta duplicada', 'success');
            AppModal.close();
            cargarLista();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });

        body.querySelector('#accion-eliminar').addEventListener('click', async () => {
          const ok = await Utils.confirmDialog(`¿Eliminar la venta de ${v.comprador_nombre}? Esta acción no se puede deshacer.`);
          if (!ok) return;
          try {
            await Api.deleteVenta(v.id);
            Utils.toast('Venta eliminada', 'success');
            AppModal.close();
            cargarLista();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      }
    });
  }

  function attachEditForm(body, original) {
    const form = body.querySelector('#form-editar-venta');
    body.querySelector('#btn-cancelar-edicion').addEventListener('click', () => AppModal.close());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productoOpt = form.producto.selectedOptions[0];
      const cantidad = Utils.clamp(parseInt(form.cantidad.value, 10) || 1, 1, 9999);
      const payload = {
        comprador_nombre: form.comprador_nombre.value.trim(),
        telefono: form.telefono.value.trim(),
        producto_id: form.producto.value,
        producto_nombre: productoOpt.textContent.trim(),
        cantidad,
        costo_unitario: Number(productoOpt.dataset.costo),
        precio_unitario: Number(productoOpt.dataset.precio),
        estado: form.estado.value,
        fecha: form.fecha.value || Utils.todayISO(),
        observaciones: form.observaciones.value.trim()
      };
      try {
        await Api.updateVenta(original.id, payload);
        Utils.toast('Venta actualizada', 'success');
        AppModal.close();
        cargarLista();
      } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
    });
  }

  function attachTopEvents(container) {
    const search = document.getElementById('ventas-search');
    search.addEventListener('input', Utils.debounce(() => {
      filtros.busqueda = search.value.trim();
      cargarLista();
    }, 300));

    document.querySelectorAll('#estado-chips .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#estado-chips .chip').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        filtros.estado = chip.dataset.estado;
        cargarLista();
      });
    });

    const btnFiltros = document.getElementById('btn-toggle-filtros');
    btnFiltros.addEventListener('click', () => {
      filtrosAbiertos = !filtrosAbiertos;
      renderFiltrosPanel(container);
    });
  }

  function renderFiltrosPanel(container) {
    const existing = document.getElementById('filtros-panel');
    if (existing) existing.remove();
    if (!filtrosAbiertos) return;
    document.getElementById('ventas-search-wrap').insertAdjacentHTML('afterend', filtrosPanelHtml());
    document.getElementById('filtro-aplicar').addEventListener('click', () => {
      filtros.productoId = document.getElementById('filtro-producto').value;
      filtros.desde = document.getElementById('filtro-desde').value;
      filtros.hasta = document.getElementById('filtro-hasta').value;
      cargarLista();
    });
    document.getElementById('filtro-limpiar').addEventListener('click', () => {
      filtros.productoId = ''; filtros.desde = ''; filtros.hasta = '';
      filtrosAbiertos = false;
      renderFiltrosPanel(container);
      cargarLista();
    });
  }

  async function render(container) {
    rootRef = container;
    container.innerHTML = `
      <div class="screen-header"><h1>Ventas</h1><p>Buscá, filtrá y administrá tus ventas</p></div>
      <div class="skeleton" style="height:48px;margin-bottom:12px;"></div>
      <div class="skeleton" style="height:74px;"></div>`;

    productosCache = await Api.listProductos();

    container.innerHTML = `
      <div class="screen-header"><h1>Ventas</h1><p id="ventas-resumen">Buscá, filtrá y administrá tus ventas</p></div>

      <div id="ventas-search-wrap">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="input" id="ventas-search" placeholder="Buscar por nombre o teléfono...">
        </div>
        <div class="flex gap-8 items-center" style="overflow-x:auto;">
          <div class="chip-row" id="estado-chips" style="flex:1;">
            <div class="chip is-active" data-estado="">Todos</div>
            <div class="chip" data-estado="pagado">✅ Pagados</div>
            <div class="chip" data-estado="pendiente">⏳ Pendientes</div>
          </div>
          <button class="btn btn--ghost btn--icon" id="btn-toggle-filtros" title="Más filtros">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
          </button>
        </div>
      </div>

      <div class="list mt-16" id="ventas-list"></div>
    `;

    attachTopEvents(container);
    await cargarLista();
  }

  return { render };
})();

window.ScreenVentas = ScreenVentas;
