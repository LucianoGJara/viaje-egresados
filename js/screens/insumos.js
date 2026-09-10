/**
 * screens/insumos.js — Catálogo de insumos + necesidades de compra/producción
 * calculadas en vivo a partir de las ventas y la receta de cada combo.
 *
 * No es un control de stock: es una calculadora de "cuánto necesito según
 * lo que ya vendí". El stock real se sigue manejando a mano por ahora.
 */

const ScreenInsumos = (() => {
  const UNIDADES_SUGERIDAS = ['unidades', 'kg', 'gr', 'litros', 'docena', 'paquete', 'caja', 'bolsa'];
  let filtroEstado = ''; // '' = todas, 'pagado', 'pendiente'

  // ---------------------------------------------------------------------
  // Catálogo de insumos: CRUD (similar a Productos, más simple)
  // ---------------------------------------------------------------------
  function insumoFormHtml(i) {
    return `
      <form id="form-insumo">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input class="input" name="nombre" value="${i ? Utils.escapeHtml(i.nombre) : ''}" placeholder="Ej: Disco de horno" required>
        </div>
        <div class="form-group">
          <label class="form-label">Unidad de medida</label>
          <input class="input" name="unidad_medida" list="unidades-sugeridas" value="${i ? Utils.escapeHtml(i.unidad_medida) : 'unidades'}">
          <datalist id="unidades-sugeridas">
            ${UNIDADES_SUGERIDAS.map((u) => `<option value="${u}">`).join('')}
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Notas</label>
          <textarea class="textarea" name="notas" placeholder="Opcional: proveedor, presentación, etc.">${i ? Utils.escapeHtml(i.notas || '') : ''}</textarea>
        </div>
        <div class="form-group">
          <label class="flex items-center gap-8">
            <span class="toggle"><input type="checkbox" name="activo" ${!i || i.activo ? 'checked' : ''}><span class="toggle__track"></span></span>
            <span class="form-label" style="margin:0;">Insumo activo</span>
          </label>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="cancelar-insumo">Cancelar</button>
          <button type="submit" class="btn btn--primary">${i ? 'Guardar cambios' : 'Crear insumo'}</button>
        </div>
      </form>
    `;
  }

  function abrirFormularioInsumo(insumo, onSaved) {
    AppModal.open(insumo ? 'Editar insumo' : 'Nuevo insumo', insumoFormHtml(insumo), {
      onMount: (body) => {
        body.querySelector('#cancelar-insumo').addEventListener('click', () => AppModal.close());
        body.querySelector('#form-insumo').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const payload = {
            nombre: form.nombre.value.trim(),
            unidad_medida: form.unidad_medida.value.trim() || 'unidades',
            notas: form.notas.value.trim(),
            activo: form.activo.checked
          };
          try {
            if (insumo) await Api.updateInsumo(insumo.id, payload);
            else await Api.createInsumo({ ...payload, orden: Date.now() });
            Utils.toast(insumo ? 'Insumo actualizado' : 'Insumo creado', 'success');
            AppModal.close();
            onSaved();
          } catch (err) {
            const msg = /duplicate key|unique/i.test(err.message || '') ? 'Ya existe un insumo con ese nombre.' : err.message;
            Utils.toast(`Error: ${msg}`, 'error');
          }
        });
      }
    });
  }

  function insumoRowHtml(i) {
    return `
      <div class="list-item" data-id="${i.id}" style="cursor:default;">
        <div class="list-item__avatar">📦</div>
        <div class="list-item__body">
          <div class="list-item__title">${Utils.escapeHtml(i.nombre)} ${i.activo ? '' : '<span class="badge badge--neutral">Inactivo</span>'}</div>
          <div class="list-item__subtitle">${Utils.escapeHtml(i.unidad_medida)}${i.notas ? ` · ${Utils.escapeHtml(i.notas)}` : ''}</div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn--ghost btn--icon" data-accion="editar" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button class="btn btn--ghost btn--icon" data-accion="duplicar" title="Duplicar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="btn btn--ghost btn--icon" data-accion="toggle" title="${i.activo ? 'Desactivar' : 'Activar'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/>${i.activo ? '<path d="M15 9l-6 6M9 9l6 6"/>' : '<polyline points="9 12 11 14 15 10"/>'}</svg>
          </button>
          <button class="btn btn--danger btn--icon" data-accion="eliminar" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`;
  }

  async function cargarCatalogo(contenedorId, onChange) {
    const insumos = await Api.listInsumos();
    const el = document.getElementById(contenedorId);
    if (!insumos.length) {
      el.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/></svg>
          <p class="empty-state__title">Todavía no cargaste insumos</p>
          <p class="empty-state__text">Creá tu primer insumo para empezar a armar recetas.</p>
        </div>`;
      return;
    }
    el.innerHTML = insumos.map(insumoRowHtml).join('');
    el.querySelectorAll('.list-item').forEach((row) => {
      const id = row.dataset.id;
      const insumo = insumos.find((i) => i.id === id);
      row.querySelector('[data-accion="editar"]').addEventListener('click', () => abrirFormularioInsumo(insumo, onChange));
      row.querySelector('[data-accion="duplicar"]').addEventListener('click', async () => {
        try { await Api.duplicarInsumo(id); Utils.toast('Insumo duplicado', 'success'); onChange(); }
        catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
      });
      row.querySelector('[data-accion="toggle"]').addEventListener('click', async () => {
        try { await Api.updateInsumo(id, { activo: !insumo.activo }); onChange(); }
        catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
      });
      row.querySelector('[data-accion="eliminar"]').addEventListener('click', async () => {
        const ok = await Utils.confirmDialog(`¿Eliminar "${insumo.nombre}"? Se va a quitar también de la receta de los combos que lo usan.`);
        if (!ok) return;
        try { await Api.deleteInsumo(id); Utils.toast('Insumo eliminado', 'success'); onChange(); }
        catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Necesidades de compra + ranking de insumos
  // ---------------------------------------------------------------------
  function necesidadRowHtml(item, index, max) {
    return `
      <div class="ranking-row">
        <div class="ranking-row__pos">${index + 1}</div>
        <div class="ranking-row__body">
          <div class="ranking-row__title">${Utils.escapeHtml(item.insumo.nombre)}</div>
          <div class="ranking-row__bar"><div class="ranking-row__bar-fill" style="width:${(item.cantidadNecesaria / max) * 100}%"></div></div>
        </div>
        <div class="ranking-row__value">${Utils.formatNumber(item.cantidadNecesaria)} ${Utils.escapeHtml(item.insumo.unidad_medida)}</div>
      </div>`;
  }

  function podiumHtml(top3) {
    const medallas = ['🥇', '🥈', '🥉'];
    return `
      <div class="metrics-grid">
        ${top3.map((item, i) => `
          <div class="metric-card">
            <div class="metric-card__label">${medallas[i]} ${Utils.escapeHtml(item.insumo.nombre)}</div>
            <div class="metric-card__value metric-card__value--sm">${Utils.formatNumber(item.cantidadNecesaria)} <span style="font-size:11px;color:var(--text-muted);">${Utils.escapeHtml(item.insumo.unidad_medida)}</span></div>
          </div>
        `).join('')}
      </div>`;
  }

  // ---------------------------------------------------------------------
  // Exportar
  // ---------------------------------------------------------------------
  async function exportarExcel(necesidades, ranking) {
    Utils.toast('Preparando Excel...', 'info');
    try {
      await Utils.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      const wb = XLSX.utils.book_new();

      const wsNecesidades = XLSX.utils.json_to_sheet(necesidades.map((n) => ({
        Insumo: n.insumo.nombre, 'Unidad de medida': n.insumo.unidad_medida, 'Cantidad necesaria': n.cantidadNecesaria
      })));
      XLSX.utils.book_append_sheet(wb, wsNecesidades, 'Insumos necesarios');

      const wsRanking = XLSX.utils.json_to_sheet(ranking.map((r) => ({
        Producto: r.nombre, 'Unidades vendidas': r.cantidad, Facturado: r.facturado, Ganancia: r.ganancia
      })));
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Ventas por combo');

      XLSX.writeFile(wb, `insumos-necesarios-${Utils.todayISO()}.xlsx`);
      Utils.toast('Excel descargado', 'success');
    } catch (err) {
      console.error(err);
      Utils.toast('No se pudo generar el Excel. Revisá tu conexión a internet.', 'error');
    }
  }

  async function exportarPDF(necesidades, ranking) {
    Utils.toast('Preparando PDF...', 'info');
    try {
      await Utils.loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      await Utils.loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text('Insumos necesarios para producción', 14, 18);
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text(`Generado el ${Utils.formatDate(Utils.todayISO())}`, 14, 25);

      doc.autoTable({
        startY: 32,
        head: [['Insumo', 'Unidad', 'Cantidad necesaria']],
        body: necesidades.map((n) => [n.insumo.nombre, n.insumo.unidad_medida, Utils.formatNumber(n.cantidadNecesaria)]),
        theme: 'striped', headStyles: { fillColor: [79, 70, 229] }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text('Ventas por combo', 14, finalY);
      doc.autoTable({
        startY: finalY + 4,
        head: [['Producto', 'Unidades vendidas', 'Facturado', 'Ganancia']],
        body: ranking.map((r) => [r.nombre, r.cantidad, Utils.formatMoney(r.facturado), Utils.formatMoney(r.ganancia)]),
        theme: 'striped', headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`insumos-necesarios-${Utils.todayISO()}.pdf`);
      Utils.toast('PDF descargado', 'success');
    } catch (err) {
      console.error(err);
      Utils.toast('No se pudo generar el PDF. Revisá tu conexión a internet.', 'error');
    }
  }

  // ---------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------
  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Insumos</h1><p>Qué necesitás comprar o producir según lo vendido</p></div>
      <div class="skeleton" style="height:260px;"></div>`;

    let ultimaNecesidades = [];
    let ultimoRanking = [];

    async function cargarNecesidades() {
      const [productos, ventas] = await Promise.all([Api.listProductos(), Api.listVentas(filtroEstado ? { estado: filtroEstado } : {})]);
      const recetas = await Api.getRecetas(productos.map((p) => p.id));
      const necesidades = Stats.calcularInsumosNecesarios(ventas, recetas);
      const ranking = Stats.compute(ventas, [], 0).ranking;
      ultimaNecesidades = necesidades;
      ultimoRanking = ranking;

      const podiumEl = document.getElementById('insumos-podium');
      const listaEl = document.getElementById('insumos-necesidades-list');
      const rankingEl = document.getElementById('ventas-por-combo-list');

      if (!necesidades.length) {
        podiumEl.innerHTML = '';
        listaEl.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3h18v4H3z"/><path d="M5 7v13a1 1 0 001 1h12a1 1 0 001-1V7"/></svg>
            <p class="empty-state__title">Sin necesidades por ahora</p>
            <p class="empty-state__text">Esto se completa solo a medida que registrás ventas de combos con receta cargada.</p>
          </div>`;
      } else {
        podiumEl.innerHTML = necesidades.length >= 3 ? podiumHtml(necesidades.slice(0, 3)) : '';
        const max = Math.max(...necesidades.map((n) => n.cantidadNecesaria), 1);
        listaEl.innerHTML = necesidades.map((n, i) => necesidadRowHtml(n, i, max)).join('');
      }

      if (!ranking.length) {
        rankingEl.innerHTML = `<p class="text-secondary" style="font-size:13px;text-align:center;padding:16px 0;">Todavía no hay ventas registradas.</p>`;
      } else {
        const maxR = Math.max(...ranking.map((r) => r.cantidad), 1);
        rankingEl.innerHTML = ranking.map((r, i) => `
          <div class="ranking-row">
            <div class="ranking-row__pos">${i + 1}</div>
            <div class="ranking-row__body">
              <div class="ranking-row__title">${Utils.escapeHtml(r.nombre)}</div>
              <div class="ranking-row__bar"><div class="ranking-row__bar-fill" style="width:${(r.cantidad / maxR) * 100}%; background:var(--color-secondary);"></div></div>
            </div>
            <div class="ranking-row__value">${Utils.formatNumber(r.cantidad)} u. · ${Utils.formatMoney(r.facturado)}</div>
          </div>
        `).join('');
      }
    }

    container.innerHTML = `
      <div class="screen-header"><h1>Insumos</h1><p>Qué necesitás comprar o producir según lo vendido</p></div>

      <div class="chip-row" id="insumos-filtro-estado">
        <div class="chip is-active" data-estado="">Todas las ventas</div>
        <div class="chip" data-estado="pagado">✅ Solo pagadas</div>
        <div class="chip" data-estado="pendiente">⏳ Solo pendientes</div>
      </div>

      <div class="section-title">🛒 Necesidades de compra</div>
      <div id="insumos-podium"></div>
      <div class="card mt-8" id="insumos-necesidades-list"></div>

      <div class="flex gap-8 mt-12">
        <button class="btn btn--ghost btn--block" id="btn-export-excel-insumos">📊 Exportar Excel</button>
        <button class="btn btn--ghost btn--block" id="btn-export-pdf-insumos">📄 Exportar PDF</button>
      </div>

      <div class="section-title">🍽️ Ventas por combo</div>
      <div class="card" id="ventas-por-combo-list"></div>

      <div class="section-title flex justify-between items-center">
        📦 Catálogo de insumos
        <button class="btn btn--primary btn--sm" id="btn-nuevo-insumo">➕ Nuevo</button>
      </div>
      <div class="list" id="insumos-catalogo-list"></div>
    `;

    document.getElementById('insumos-filtro-estado').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-estado]');
      if (!chip) return;
      filtroEstado = chip.dataset.estado;
      document.querySelectorAll('#insumos-filtro-estado .chip').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      cargarNecesidades();
    });

    document.getElementById('btn-export-excel-insumos').addEventListener('click', () => exportarExcel(ultimaNecesidades, ultimoRanking));
    document.getElementById('btn-export-pdf-insumos').addEventListener('click', () => exportarPDF(ultimaNecesidades, ultimoRanking));

    async function recargarTodo() {
      await Promise.all([cargarNecesidades(), cargarCatalogo('insumos-catalogo-list', recargarTodo)]);
    }

    document.getElementById('btn-nuevo-insumo').addEventListener('click', () => {
      abrirFormularioInsumo(null, recargarTodo);
    });

    await recargarTodo();
  }

  return { render };
})();

window.ScreenInsumos = ScreenInsumos;
