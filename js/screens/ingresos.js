/**
 * screens/ingresos.js — Ingresos extras (dinero que no proviene de ventas).
 */

const ScreenIngresos = (() => {
  const TIPOS = {
    donacion: { label: 'Donación', emoji: '🎁' },
    rifa: { label: 'Rifa', emoji: '🎟️' },
    evento: { label: 'Evento', emoji: '🎉' },
    familiar: { label: 'Familiar', emoji: '👨‍👩‍👧' },
    aporte_personal: { label: 'Aporte personal', emoji: '👛' },
    otro: { label: 'Otro', emoji: '✨' }
  };

  function itemHtml(i) {
    const t = TIPOS[i.tipo] || TIPOS.otro;
    return `
      <div class="list-item" data-id="${i.id}">
        <div class="list-item__avatar">${t.emoji}</div>
        <div class="list-item__body">
          <div class="list-item__title">${Utils.escapeHtml(i.concepto)}</div>
          <div class="list-item__subtitle">${t.label} · ${Utils.formatDate(i.fecha)}</div>
        </div>
        <div class="list-item__meta">
          <div class="list-item__amount text-success">+${Utils.formatMoney(i.monto)}</div>
        </div>
      </div>`;
  }

  function formHtml(i) {
    return `
      <form id="form-ingreso">
        <div class="form-group">
          <label class="form-label">Concepto *</label>
          <input class="input" name="concepto" value="${i ? Utils.escapeHtml(i.concepto) : ''}" placeholder="Ej: Rifa de canasta navideña" required>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <div class="select-wrap">
            <select class="select" name="tipo">
              ${Object.entries(TIPOS).map(([key, t]) => `<option value="${key}" ${i && i.tipo === key ? 'selected' : ''}>${t.emoji} ${t.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">Monto *</label>
            <input class="input" name="monto" type="number" min="0" step="0.01" value="${i ? i.monto : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input class="input" name="fecha" type="date" value="${i ? i.fecha : Utils.todayISO()}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <textarea class="textarea" name="observaciones" placeholder="Opcional">${i ? Utils.escapeHtml(i.observaciones || '') : ''}</textarea>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="btn-cancelar-ingreso">Cancelar</button>
          <button type="submit" class="btn btn--primary">${i ? 'Guardar cambios' : 'Registrar ingreso'}</button>
        </div>
      </form>
    `;
  }

  function abrirFormulario(ingreso, onSaved) {
    AppModal.open(ingreso ? 'Editar ingreso' : 'Nuevo ingreso extra', formHtml(ingreso), {
      onMount: (body) => {
        const form = body.querySelector('#form-ingreso');
        body.querySelector('#btn-cancelar-ingreso').addEventListener('click', () => AppModal.close());
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const payload = {
            concepto: form.concepto.value.trim(),
            tipo: form.tipo.value,
            monto: Number(form.monto.value) || 0,
            fecha: form.fecha.value || Utils.todayISO(),
            observaciones: form.observaciones.value.trim()
          };
          try {
            if (ingreso) await Api.updateIngreso(ingreso.id, payload);
            else await Api.createIngreso(payload);
            Utils.toast(ingreso ? 'Ingreso actualizado' : 'Ingreso registrado', 'success');
            AppModal.close();
            onSaved();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      }
    });
  }

  function detalleHtml(i) {
    const t = TIPOS[i.tipo] || TIPOS.otro;
    return `
      <div class="summary-box">
        <div class="summary-row"><span class="summary-row__label">Concepto</span><span class="summary-row__value">${Utils.escapeHtml(i.concepto)}</span></div>
        <div class="summary-row"><span class="summary-row__label">Tipo</span><span class="summary-row__value">${t.emoji} ${t.label}</span></div>
        <div class="summary-row"><span class="summary-row__label">Fecha</span><span class="summary-row__value">${Utils.formatDate(i.fecha)}</span></div>
        <div class="summary-row summary-row--total"><span class="summary-row__label">Monto</span><span class="summary-row__value">${Utils.formatMoney(i.monto)}</span></div>
      </div>
      ${i.observaciones ? `<p class="form-hint mt-12">📝 ${Utils.escapeHtml(i.observaciones)}</p>` : ''}
      <div class="swipe-actions mt-16">
        <button class="btn btn--ghost btn--sm" id="accion-editar-ingreso">✏️ Editar</button>
        <button class="btn btn--danger btn--sm" id="accion-eliminar-ingreso">🗑️ Eliminar</button>
      </div>
    `;
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Ingresos extras</h1><p>Dinero que no proviene de ventas</p></div>
      <div class="skeleton" style="height:120px;"></div>`;

    async function cargar() {
      const ingresos = await Api.listIngresos();
      const total = Stats.sum(ingresos, 'monto');
      document.getElementById('ingresos-total').textContent = Utils.formatMoney(total);

      const listEl = document.getElementById('ingresos-list');
      if (!ingresos.length) {
        listEl.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <p class="empty-state__title">Sin ingresos extras todavía</p>
            <p class="empty-state__text">Registrá donaciones, rifas, eventos y más.</p>
          </div>`;
        return;
      }
      listEl.innerHTML = ingresos.map(itemHtml).join('');
      listEl.querySelectorAll('.list-item').forEach((el) => {
        el.addEventListener('click', () => {
          const ingreso = ingresos.find((x) => x.id === el.dataset.id);
          AppModal.open('Detalle del ingreso', detalleHtml(ingreso), {
            onMount: (body) => {
              body.querySelector('#accion-editar-ingreso').addEventListener('click', () => abrirFormulario(ingreso, cargar));
              body.querySelector('#accion-eliminar-ingreso').addEventListener('click', async () => {
                const ok = await Utils.confirmDialog(`¿Eliminar el ingreso "${ingreso.concepto}"?`);
                if (!ok) return;
                try { await Api.deleteIngreso(ingreso.id); Utils.toast('Ingreso eliminado', 'success'); AppModal.close(); cargar(); }
                catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
              });
            }
          });
        });
      });
    }

    container.innerHTML = `
      <div class="screen-header"><h1>Ingresos extras</h1><p>Dinero que no proviene de ventas</p></div>

      <div class="card metric-card--hero">
        <div class="metric-card__label">Total de ingresos extras</div>
        <div class="metric-card__value" id="ingresos-total">$0</div>
      </div>

      <button class="btn btn--primary btn--block mt-16" id="btn-nuevo-ingreso">➕ Registrar ingreso</button>
      <div class="list mt-16" id="ingresos-list"></div>
    `;

    document.getElementById('btn-nuevo-ingreso').addEventListener('click', () => abrirFormulario(null, cargar));
    await cargar();
  }

  return { render };
})();

window.ScreenIngresos = ScreenIngresos;
