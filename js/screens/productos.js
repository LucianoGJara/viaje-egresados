/**
 * screens/productos.js — CRUD de productos/combos con cálculo automático
 * de ganancia y rentabilidad, y precio↔porcentaje bidireccional.
 */

window.ScreenProductos = (() => {
  function productCardHtml(p) {
    return `
      <div class="product-card ${p.activo ? '' : 'is-inactive'}" data-id="${p.id}">
        <div class="product-card__header">
          <div>
            <div class="product-card__title">${Utils.escapeHtml(p.nombre)}</div>
            <div class="product-card__desc">${Utils.escapeHtml(p.descripcion || '')}</div>
          </div>
          <span class="badge ${p.activo ? 'badge--pagado' : 'badge--neutral'}">${p.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
        <div class="product-card__stats">
          <div class="product-card__stat"><div class="product-card__stat-label">Costo</div><div class="product-card__stat-value">${Utils.formatMoney(p.costo)}</div></div>
          <div class="product-card__stat"><div class="product-card__stat-label">Precio</div><div class="product-card__stat-value">${Utils.formatMoney(p.precio_venta)}</div></div>
          <div class="product-card__stat"><div class="product-card__stat-label">Ganancia</div><div class="product-card__stat-value">${Utils.formatMoney(p.ganancia)}</div></div>
        </div>
        <div class="mt-8 text-center">
          <span class="badge badge--info">Rentabilidad ${Utils.formatPercent(p.rentabilidad)}</span>
        </div>
        <div class="product-card__actions">
          <button class="btn btn--ghost btn--sm" data-accion="editar">✏️ Editar</button>
          <button class="btn btn--ghost btn--sm" data-accion="duplicar">📋 Duplicar</button>
          <button class="btn btn--secondary btn--sm" data-accion="toggle">${p.activo ? '🚫 Desactivar' : '✅ Activar'}</button>
          <button class="btn btn--danger btn--sm" data-accion="eliminar">🗑️ Eliminar</button>
        </div>
      </div>`;
  }

  function formHtml(p) {
    const costo = p ? p.costo : '';
    const precio = p ? p.precio_venta : '';
    const pct = p && p.costo > 0 ? Utils.calcularRentabilidad(p.costo, p.precio_venta) : '';
    return `
      <form id="form-producto">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input class="input" name="nombre" value="${p ? Utils.escapeHtml(p.nombre) : ''}" placeholder="Ej: Promo Familiar Completa" required>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea class="textarea" name="descripcion" placeholder="Contenido del combo...">${p ? Utils.escapeHtml(p.descripcion || '') : ''}</textarea>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">Costo *</label>
            <input class="input" name="costo" id="prod-costo" type="number" min="0" step="0.01" value="${costo}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Porcentaje de ganancia</label>
            <input class="input" name="porcentaje" id="prod-porcentaje" type="number" min="0" step="0.1" value="${pct}" placeholder="Ej: 50">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Precio de venta *</label>
          <input class="input" name="precio_venta" id="prod-precio" type="number" min="0" step="0.01" value="${precio}" required>
          <p class="form-hint">Cambiá el costo o el porcentaje para calcular el precio automáticamente, o escribí el precio directamente y el porcentaje se recalcula solo.</p>
        </div>

        <div class="summary-box">
          <div class="summary-row"><span class="summary-row__label">Ganancia</span><span class="summary-row__value" id="prod-ganancia-preview">${p ? Utils.formatMoney(p.ganancia) : '$0'}</span></div>
          <div class="summary-row summary-row--total"><span class="summary-row__label">Rentabilidad</span><span class="summary-row__value" id="prod-rentabilidad-preview">${p ? Utils.formatPercent(p.rentabilidad) : '0%'}</span></div>
        </div>

        <div class="form-group mt-16">
          <label class="flex items-center gap-8">
            <span class="toggle"><input type="checkbox" name="activo" ${!p || p.activo ? 'checked' : ''}><span class="toggle__track"></span></span>
            <span class="form-label" style="margin:0;">Producto activo</span>
          </label>
        </div>

        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="btn-cancelar-producto">Cancelar</button>
          <button type="submit" class="btn btn--primary">${p ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>
    `;
  }

  function attachFormEvents(body, producto, onSaved) {
    const form = body.querySelector('#form-producto');
    const costoInput = form.costo;
    const precioInput = form.precio_venta;
    const pctInput = form.porcentaje;
    const gananciaPreview = body.querySelector('#prod-ganancia-preview');
    const pctPreview = body.querySelector('#prod-rentabilidad-preview');

    function updatePreview() {
      const costo = Number(costoInput.value) || 0;
      const precio = Number(precioInput.value) || 0;
      const ganancia = Utils.calcularGanancia(costo, precio);
      const rentabilidad = Utils.calcularRentabilidad(costo, precio);
      gananciaPreview.textContent = Utils.formatMoney(ganancia);
      pctPreview.textContent = Utils.formatPercent(rentabilidad);
    }

    function recalcularDesdePorcentaje() {
      const costo = Number(costoInput.value) || 0;
      const pct = Number(pctInput.value) || 0;
      precioInput.value = Utils.calcularPrecioDesdePorcentaje(costo, pct);
      updatePreview();
    }

    function recalcularDesdePrecio() {
      const costo = Number(costoInput.value) || 0;
      const precio = Number(precioInput.value) || 0;
      pctInput.value = costo > 0 ? Utils.calcularRentabilidad(costo, precio) : '';
      updatePreview();
    }

    costoInput.addEventListener('input', () => {
      // Si ya hay un porcentaje cargado, recalculamos el precio en base a él.
      if (pctInput.value !== '') recalcularDesdePorcentaje();
      else recalcularDesdePrecio();
    });
    pctInput.addEventListener('input', recalcularDesdePorcentaje);
    precioInput.addEventListener('input', recalcularDesdePrecio);

    body.querySelector('#btn-cancelar-producto').addEventListener('click', () => AppModal.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        nombre: form.nombre.value.trim(),
        descripcion: form.descripcion.value.trim(),
        costo: Number(costoInput.value) || 0,
        precio_venta: Number(precioInput.value) || 0,
        activo: form.activo.checked
      };
      try {
        if (producto) await Api.updateProducto(producto.id, payload);
        else await Api.createProducto({ ...payload, orden: Date.now() });
        Utils.toast(producto ? 'Producto actualizado' : 'Producto creado', 'success');
        AppModal.close();
        onSaved();
      } catch (err) {
        Utils.toast(`Error: ${err.message}`, 'error');
      }
    });
  }

  function abrirFormulario(producto, onSaved) {
    AppModal.open(producto ? 'Editar producto' : 'Nuevo producto', formHtml(producto), {
      onMount: (body) => attachFormEvents(body, producto, onSaved)
    });
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Productos</h1><p>Tus combos y promociones</p></div>
      <div class="skeleton" style="height:220px;margin-bottom:12px;"></div>`;

    async function cargar() {
      const productos = await Api.listProductos();
      const listEl = document.getElementById('productos-list');
      if (!productos.length) {
        listEl.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/></svg>
            <p class="empty-state__title">Todavía no cargaste productos</p>
            <p class="empty-state__text">Creá tu primer combo para empezar a vender.</p>
          </div>`;
        return;
      }
      listEl.innerHTML = productos.map(productCardHtml).join('');
      listEl.querySelectorAll('.product-card').forEach((card) => {
        const id = card.dataset.id;
        const producto = productos.find((p) => p.id === id);
        card.querySelector('[data-accion="editar"]').addEventListener('click', () => abrirFormulario(producto, cargar));
        card.querySelector('[data-accion="duplicar"]').addEventListener('click', async () => {
          try { await Api.duplicarProducto(id); Utils.toast('Producto duplicado', 'success'); cargar(); }
          catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
        card.querySelector('[data-accion="toggle"]').addEventListener('click', async () => {
          try { await Api.updateProducto(id, { activo: !producto.activo }); cargar(); }
          catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
        card.querySelector('[data-accion="eliminar"]').addEventListener('click', async () => {
          const ok = await Utils.confirmDialog(`¿Eliminar "${producto.nombre}"? Las ventas ya registradas con este producto no se van a borrar.`);
          if (!ok) return;
          try { await Api.deleteProducto(id); Utils.toast('Producto eliminado', 'success'); cargar(); }
          catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      });
    }

    container.innerHTML = `
      <div class="screen-header flex justify-between items-center">
        <div><h1>Productos</h1><p>Tus combos y promociones</p></div>
      </div>
      <button class="btn btn--primary btn--block mt-8" id="btn-nuevo-producto">➕ Nuevo producto</button>
      <div class="list mt-16" id="productos-list" style="gap:14px;"></div>
    `;

    document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirFormulario(null, cargar));
    await cargar();
  }

  return { render };
})();
