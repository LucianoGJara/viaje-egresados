/**
 * screens/nueva-venta.js — Registrar una venta nueva.
 */

const ScreenNuevaVenta = (() => {
  let productos = [];
  let estado = 'pendiente';

  function calcular(form) {
    const productoId = form.producto.value;
    const producto = productos.find((p) => p.id === productoId);
    const cantidad = Utils.clamp(parseInt(form.cantidad.value, 10) || 1, 1, 9999);

    const costoUnitario = producto ? Number(producto.costo) : 0;
    const precioUnitario = producto ? Number(producto.precio_venta) : 0;
    const costoTotal = Utils.round2(costoUnitario * cantidad);
    const precioTotal = Utils.round2(precioUnitario * cantidad);
    const gananciaTotal = Utils.round2(precioTotal - costoTotal);
    const rentabilidad = costoTotal > 0 ? Utils.round2((gananciaTotal / costoTotal) * 100) : 0;

    return { producto, cantidad, costoUnitario, precioUnitario, costoTotal, precioTotal, gananciaTotal, rentabilidad };
  }

  function actualizarResumen(form) {
    const c = calcular(form);
    const box = document.getElementById('venta-resumen-live');
    if (!box) return;
    if (!c.producto) {
      box.innerHTML = `<p class="text-secondary" style="font-size:13px;text-align:center;padding:8px 0;">Elegí un producto para ver el cálculo automático.</p>`;
      return;
    }
    box.innerHTML = `
      <div class="summary-row"><span class="summary-row__label">Costo total</span><span class="summary-row__value">${Utils.formatMoney(c.costoTotal)}</span></div>
      <div class="summary-row"><span class="summary-row__label">Precio total</span><span class="summary-row__value">${Utils.formatMoney(c.precioTotal)}</span></div>
      <div class="summary-row"><span class="summary-row__label">Rentabilidad</span><span class="summary-row__value">${Utils.formatPercent(c.rentabilidad)}</span></div>
      <div class="summary-row summary-row--total"><span class="summary-row__label">Ganancia total</span><span class="summary-row__value">${Utils.formatMoney(c.gananciaTotal)}</span></div>
    `;
  }

  function renderResumenModal(c, datos) {
    return `
      <div class="summary-box">
        <div class="summary-row"><span class="summary-row__label">Comprador</span><span class="summary-row__value">${Utils.escapeHtml(datos.comprador_nombre)}</span></div>
        ${datos.telefono ? `<div class="summary-row"><span class="summary-row__label">Teléfono</span><span class="summary-row__value">${Utils.escapeHtml(datos.telefono)}</span></div>` : ''}
        <div class="summary-row"><span class="summary-row__label">Producto</span><span class="summary-row__value">${Utils.escapeHtml(c.producto.nombre)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Cantidad</span><span class="summary-row__value">${c.cantidad}</span></div>
        <div class="summary-row"><span class="summary-row__label">Estado</span><span class="summary-row__value">${estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}</span></div>
      </div>
      <div class="summary-box mt-12">
        <div class="summary-row"><span class="summary-row__label">Costo total</span><span class="summary-row__value">${Utils.formatMoney(c.costoTotal)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Precio total</span><span class="summary-row__value">${Utils.formatMoney(c.precioTotal)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Rentabilidad</span><span class="summary-row__value">${Utils.formatPercent(c.rentabilidad)}</span></div>
        <div class="summary-row summary-row--total"><span class="summary-row__label">Ganancia total</span><span class="summary-row__value">${Utils.formatMoney(c.gananciaTotal)}</span></div>
      </div>
      ${datos.observaciones ? `<p class="form-hint mt-12">📝 ${Utils.escapeHtml(datos.observaciones)}</p>` : ''}
      <div class="modal__footer">
        <button class="btn btn--ghost" id="btn-resumen-editar">Seguir editando</button>
        <button class="btn btn--primary" id="btn-resumen-confirmar">Confirmar venta</button>
      </div>
    `;
  }

  function formHtml() {
    if (!productos.length) {
      return `<div class="error-banner">No hay productos activos. Creá al menos un producto en la sección <strong>Productos</strong> antes de registrar una venta.</div>`;
    }
    return `
      <div class="card">
        <form id="form-nueva-venta">
          <div class="form-group">
            <label class="form-label">Nombre del comprador *</label>
            <input class="input" name="comprador_nombre" placeholder="Ej: María González" required autocomplete="off">
          </div>

          <div class="form-group">
            <label class="form-label">Teléfono (opcional)</label>
            <input class="input" name="telefono" type="tel" placeholder="Ej: 11 2345 6789" autocomplete="off">
          </div>

          <div class="form-group">
            <label class="form-label">Producto *</label>
            <div class="select-wrap">
              <select class="select" name="producto" id="venta-producto" required>
                <option value="" disabled selected>Elegí un producto</option>
                ${productos.map((p) => `<option value="${p.id}">${Utils.escapeHtml(p.nombre)} · ${Utils.formatMoney(p.precio_venta)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Cantidad</label>
            <div class="stepper">
              <button type="button" class="stepper__btn" id="venta-cant-menos">−</button>
              <input class="input" name="cantidad" id="venta-cantidad" type="number" min="1" value="1" inputmode="numeric">
              <button type="button" class="stepper__btn" id="venta-cant-mas">+</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Estado de pago</label>
            <div class="segmented" id="venta-estado-segmented">
              <div class="segmented__option is-pendiente ${estado === 'pendiente' ? 'is-active' : ''}" data-estado="pendiente">⏳ Pendiente</div>
              <div class="segmented__option is-pagado ${estado === 'pagado' ? 'is-active' : ''}" data-estado="pagado">✅ Pagado</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea class="textarea" name="observaciones" placeholder="Notas sobre la venta (opcional)"></textarea>
          </div>

          <div class="form-label" style="margin-bottom:8px;">Cálculo automático</div>
          <div class="summary-box" id="venta-resumen-live"></div>

          <button type="submit" class="btn btn--primary btn--block mt-16">Revisar y guardar</button>
        </form>
      </div>
    `;
  }

  function attachEvents(container) {
    const form = document.getElementById('form-nueva-venta');
    if (!form) return;

    const recalc = () => actualizarResumen(form);
    form.producto.addEventListener('change', recalc);
    form.cantidad.addEventListener('input', recalc);

    document.getElementById('venta-cant-menos').addEventListener('click', () => {
      form.cantidad.value = Utils.clamp((parseInt(form.cantidad.value, 10) || 1) - 1, 1, 9999);
      recalc();
    });
    document.getElementById('venta-cant-mas').addEventListener('click', () => {
      form.cantidad.value = Utils.clamp((parseInt(form.cantidad.value, 10) || 1) + 1, 1, 9999);
      recalc();
    });

    document.getElementById('venta-estado-segmented').addEventListener('click', (e) => {
      const opt = e.target.closest('[data-estado]');
      if (!opt) return;
      estado = opt.dataset.estado;
      container.querySelectorAll('#venta-estado-segmented .segmented__option').forEach((o) => o.classList.remove('is-active'));
      opt.classList.add('is-active');
    });

    recalc();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const c = calcular(form);
      if (!c.producto) { Utils.toast('Elegí un producto', 'error'); return; }
      const comprador = form.comprador_nombre.value.trim();
      if (!comprador) { Utils.toast('Ingresá el nombre del comprador', 'error'); return; }

      const datos = {
        comprador_nombre: comprador,
        telefono: form.telefono.value.trim(),
        observaciones: form.observaciones.value.trim()
      };

      AppModal.open('Confirmar venta', renderResumenModal(c, datos), {
        onMount: (modalBody) => {
          modalBody.querySelector('#btn-resumen-editar').addEventListener('click', () => AppModal.close());
          modalBody.querySelector('#btn-resumen-confirmar').addEventListener('click', async (evt) => {
            const btn = evt.target;
            btn.disabled = true;
            btn.textContent = 'Guardando...';
            try {
              await Api.createVenta({
                producto_id: c.producto.id,
                producto_nombre: c.producto.nombre,
                comprador_nombre: datos.comprador_nombre,
                telefono: datos.telefono,
                cantidad: c.cantidad,
                precio_unitario: c.precioUnitario,
                costo_unitario: c.costoUnitario,
                estado,
                observaciones: datos.observaciones,
                fecha: Utils.todayISO()
              });
              AppModal.close();
              Utils.toast('¡Venta registrada con éxito! 🎉', 'success');
              form.reset();
              estado = 'pendiente';
              render(container);
            } catch (err) {
              console.error(err);
              Utils.toast(`Error al guardar: ${err.message || err}`, 'error');
              btn.disabled = false;
              btn.textContent = 'Confirmar venta';
            }
          });
        }
      });
    });
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Nueva venta</h1><p>Registrá una venta y calculá todo automáticamente</p></div>
      <div class="skeleton" style="height:420px;"></div>`;

    productos = await Api.listProductos({ includeInactive: false });

    container.innerHTML = `
      <div class="screen-header"><h1>Nueva venta</h1><p>Registrá una venta y calculá todo automáticamente</p></div>
      ${formHtml()}
    `;
    attachEvents(container);
  }

  return { render };
})();

window.ScreenNuevaVenta = ScreenNuevaVenta;
