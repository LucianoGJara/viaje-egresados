/**
 * screens/configuracion.js — Ajustes generales: meta, branding, exportar/
 * importar datos, respaldo y reinicio.
 *
 * Nota sobre "Exportar JSON" vs "Respaldo completo": ambas opciones generan
 * el mismo archivo (todas las tablas de la campaña), la diferencia es solo
 * de ubicación en el menú, tal como pide la consigna. Lo mismo aplica para
 * "Importar JSON" y "Restaurar respaldo".
 */

const ScreenConfiguracion = (() => {
  const COLOR_PRESETS = ['#4F46E5', '#7C3AED', '#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
  // loadScript/descargarBlob viven en utils.js (Utils.loadScript / Utils.descargarBlob)
  // porque screens/insumos.js también los necesita para sus exportaciones.
  const loadScript = Utils.loadScript;
  const descargarBlob = Utils.descargarBlob;

  function fechaArchivo() {
    return Utils.todayISO();
  }

  // ---------------------------------------------------------------------
  // Fila de configuración reutilizable
  // ---------------------------------------------------------------------
  function row({ id, icon, iconClass, title, desc }) {
    return `
      <div class="settings-row" id="${id}">
        <div class="settings-row__left">
          <div class="settings-row__icon ${iconClass}">${icon}</div>
          <div>
            <div class="settings-row__title">${title}</div>
            <div class="settings-row__desc">${desc}</div>
          </div>
        </div>
        <svg class="settings-row__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
  }

  // ---------------------------------------------------------------------
  // Acciones: Meta
  // ---------------------------------------------------------------------
  async function abrirModalMeta(onSaved) {
    const meta = await Api.getMetaActiva();
    AppModal.open('Modificar meta', `
      <form id="form-meta">
        <div class="form-group">
          <label class="form-label">Meta total ($)</label>
          <input class="input" name="monto" type="number" min="0" step="1000" value="${meta.monto_meta}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nota (opcional)</label>
          <input class="input" name="nota" placeholder="Ej: Ajuste por aumento de pasajes">
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="cancelar-meta">Cancelar</button>
          <button type="submit" class="btn btn--primary">Guardar meta</button>
        </div>
      </form>
    `, {
      onMount: (body) => {
        body.querySelector('#cancelar-meta').addEventListener('click', () => AppModal.close());
        body.querySelector('#form-meta').addEventListener('submit', async (e) => {
          e.preventDefault();
          const monto = Number(e.target.monto.value) || 0;
          try {
            await Api.setMeta(monto, e.target.nota.value.trim());
            Utils.toast('Meta actualizada', 'success');
            AppModal.close();
            onSaved();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Acciones: Nombre de campaña
  // ---------------------------------------------------------------------
  async function abrirModalNombre(cfg, onSaved) {
    AppModal.open('Nombre de la campaña', `
      <form id="form-nombre">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="input" name="nombre_campana" value="${Utils.escapeHtml(cfg.nombre_campana)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Subtítulo</label>
          <input class="input" name="subtitulo" value="${Utils.escapeHtml(cfg.subtitulo)}">
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="cancelar-nombre">Cancelar</button>
          <button type="submit" class="btn btn--primary">Guardar</button>
        </div>
      </form>
    `, {
      onMount: (body) => {
        body.querySelector('#cancelar-nombre').addEventListener('click', () => AppModal.close());
        body.querySelector('#form-nombre').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const nueva = await Api.updateConfiguracion({
              nombre_campana: e.target.nombre_campana.value.trim(),
              subtitulo: e.target.subtitulo.value.trim()
            });
            App.applyBranding(nueva);
            Utils.toast('Nombre actualizado', 'success');
            AppModal.close();
            onSaved();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Acciones: Colores
  // ---------------------------------------------------------------------
  async function abrirModalColores(cfg, onSaved) {
    let primario = cfg.color_primario || '#4F46E5';
    let secundario = cfg.color_secundario || '#10B981';

    AppModal.open('Colores de la campaña', `
      <p class="form-label">Color primario</p>
      <div class="color-swatch-row" id="swatches-primario">
        ${COLOR_PRESETS.map((c) => `<div class="color-swatch ${c.toLowerCase() === primario.toLowerCase() ? 'is-active' : ''}" style="background:${c}" data-color="${c}"></div>`).join('')}
      </div>
      <input class="input mt-8" id="input-primario" type="color" value="${primario}">

      <p class="form-label mt-16">Color secundario</p>
      <div class="color-swatch-row" id="swatches-secundario">
        ${COLOR_PRESETS.map((c) => `<div class="color-swatch ${c.toLowerCase() === secundario.toLowerCase() ? 'is-active' : ''}" style="background:${c}" data-color="${c}"></div>`).join('')}
      </div>
      <input class="input mt-8" id="input-secundario" type="color" value="${secundario}">

      <div class="modal__footer">
        <button type="button" class="btn btn--ghost" id="cancelar-colores">Cancelar</button>
        <button type="button" class="btn btn--primary" id="guardar-colores">Guardar colores</button>
      </div>
    `, {
      onMount: (body) => {
        const inputPrimario = body.querySelector('#input-primario');
        const inputSecundario = body.querySelector('#input-secundario');

        body.querySelector('#swatches-primario').addEventListener('click', (e) => {
          const sw = e.target.closest('.color-swatch');
          if (!sw) return;
          primario = sw.dataset.color;
          inputPrimario.value = primario;
          body.querySelectorAll('#swatches-primario .color-swatch').forEach((s) => s.classList.toggle('is-active', s === sw));
        });
        body.querySelector('#swatches-secundario').addEventListener('click', (e) => {
          const sw = e.target.closest('.color-swatch');
          if (!sw) return;
          secundario = sw.dataset.color;
          inputSecundario.value = secundario;
          body.querySelectorAll('#swatches-secundario .color-swatch').forEach((s) => s.classList.toggle('is-active', s === sw));
        });
        inputPrimario.addEventListener('input', () => { primario = inputPrimario.value; });
        inputSecundario.addEventListener('input', () => { secundario = inputSecundario.value; });

        body.querySelector('#cancelar-colores').addEventListener('click', () => AppModal.close());
        body.querySelector('#guardar-colores').addEventListener('click', async () => {
          try {
            const nueva = await Api.updateConfiguracion({ color_primario: primario, color_secundario: secundario });
            App.applyBranding(nueva);
            Utils.toast('Colores actualizados', 'success');
            AppModal.close();
            onSaved();
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Acciones: Logo (se guarda como imagen comprimida en base64)
  // ---------------------------------------------------------------------
  function comprimirImagen(file, maxSize = 256, calidad = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize; }
          else if (height > maxSize) { width *= maxSize / height; height = maxSize; }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function abrirModalLogo(cfg, onSaved) {
    AppModal.open('Logo de la campaña', `
      <div class="logo-upload">
        <div class="logo-upload__preview" id="logo-preview">
          ${cfg.logo_url ? `<img src="${Utils.escapeHtml(cfg.logo_url)}">` : '🎓'}
        </div>
        <div>
          <input type="file" id="logo-file" accept="image/*" class="hidden">
          <button class="btn btn--ghost btn--sm" id="btn-elegir-logo">Elegir imagen</button>
          ${cfg.logo_url ? '<button class="btn btn--danger btn--sm" id="btn-quitar-logo">Quitar</button>' : ''}
        </div>
      </div>
      <p class="form-hint mt-12">Se recomienda una imagen cuadrada. Se guarda comprimida dentro de tu base de datos.</p>
      <div class="modal__footer">
        <button type="button" class="btn btn--ghost" id="cancelar-logo">Cerrar</button>
      </div>
    `, {
      onMount: (body) => {
        body.querySelector('#cancelar-logo').addEventListener('click', () => AppModal.close());
        body.querySelector('#btn-elegir-logo').addEventListener('click', () => body.querySelector('#logo-file').click());

        const quitarBtn = body.querySelector('#btn-quitar-logo');
        if (quitarBtn) {
          quitarBtn.addEventListener('click', async () => {
            try {
              const nueva = await Api.updateConfiguracion({ logo_url: null });
              App.applyBranding(nueva);
              Utils.toast('Logo eliminado', 'success');
              AppModal.close();
              onSaved();
            } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
          });
        }

        body.querySelector('#logo-file').addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const dataUrl = await comprimirImagen(file);
            body.querySelector('#logo-preview').innerHTML = `<img src="${dataUrl}">`;
            const nueva = await Api.updateConfiguracion({ logo_url: dataUrl });
            App.applyBranding(nueva);
            Utils.toast('Logo actualizado', 'success');
            AppModal.close();
            onSaved();
          } catch (err) { Utils.toast(`Error al procesar la imagen: ${err.message}`, 'error'); }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Exportar: JSON / Excel / PDF
  // ---------------------------------------------------------------------
  async function exportarJSON() {
    Utils.toast('Generando respaldo...', 'info');
    const data = await Api.exportarTodo();
    descargarBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `respaldo-viaje-egresados-${fechaArchivo()}.json`);
    Utils.toast('Respaldo JSON descargado', 'success');
  }

  async function exportarExcel() {
    Utils.toast('Preparando Excel...', 'info');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      const [productos, ventas, ingresos, meta] = await Promise.all([
        Api.listProductos(), Api.listVentas(), Api.listIngresos(), Api.getMetaActiva()
      ]);
      const s = Stats.compute(ventas, ingresos, Number(meta.monto_meta) || 0);

      const wb = XLSX.utils.book_new();

      const wsResumen = XLSX.utils.json_to_sheet([{
        'Meta': meta.monto_meta,
        'Dinero acumulado': s.dineroAcumulado,
        'Dinero faltante': s.dineroFaltante,
        'Porcentaje completado (%)': s.porcentaje,
        'Total facturado': s.totalFacturado,
        'Ganancia total': s.gananciaTotal,
        'Ingresos extras': s.ingresosExtrasTotal,
        'Pendiente de cobro': s.dineroPendienteCobro,
        'Cantidad de ventas': s.cantidadVentas,
        'Cantidad de compradores': s.cantidadCompradores
      }]);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const wsVentas = XLSX.utils.json_to_sheet(ventas.map((v) => ({
        Fecha: v.fecha, Comprador: v.comprador_nombre, Teléfono: v.telefono, Producto: v.producto_nombre,
        Cantidad: v.cantidad, 'Precio unitario': v.precio_unitario, 'Costo unitario': v.costo_unitario,
        'Precio total': v.precio_total, 'Costo total': v.costo_total, 'Ganancia total': v.ganancia_total,
        'Rentabilidad (%)': v.rentabilidad, Estado: v.estado, Observaciones: v.observaciones
      })));
      XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');

      const wsProductos = XLSX.utils.json_to_sheet(productos.map((p) => ({
        Nombre: p.nombre, Descripción: p.descripcion, Costo: p.costo, 'Precio venta': p.precio_venta,
        Ganancia: p.ganancia, 'Rentabilidad (%)': p.rentabilidad, Activo: p.activo ? 'Sí' : 'No'
      })));
      XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');

      const wsIngresos = XLSX.utils.json_to_sheet(ingresos.map((i) => ({
        Fecha: i.fecha, Concepto: i.concepto, Tipo: i.tipo, Monto: i.monto, Observaciones: i.observaciones
      })));
      XLSX.utils.book_append_sheet(wb, wsIngresos, 'Ingresos extras');

      XLSX.writeFile(wb, `viaje-egresados-${fechaArchivo()}.xlsx`);
      Utils.toast('Excel descargado', 'success');
    } catch (err) {
      console.error(err);
      Utils.toast('No se pudo generar el Excel. Revisá tu conexión a internet.', 'error');
    }
  }

  async function exportarPDF() {
    Utils.toast('Preparando PDF...', 'info');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
      const { jsPDF } = window.jspdf;

      const [ventas, ingresos, meta, cfg] = await Promise.all([
        Api.listVentas(), Api.listIngresos(), Api.getMetaActiva(), Api.getConfiguracion()
      ]);
      const s = Stats.compute(ventas, ingresos, Number(meta.monto_meta) || 0);

      const doc = new jsPDF();
      doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text(cfg.nombre_campana || 'Viaje de Egresados', 14, 18);
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text(cfg.subtitulo || 'Control de recaudación para el viaje', 14, 25);
      doc.text(`Generado el ${Utils.formatDate(Utils.todayISO())}`, 14, 31);

      doc.autoTable({
        startY: 38,
        head: [['Métrica', 'Valor']],
        body: [
          ['Meta', Utils.formatMoney(meta.monto_meta)],
          ['Dinero acumulado', Utils.formatMoney(s.dineroAcumulado)],
          ['Dinero faltante', Utils.formatMoney(s.dineroFaltante)],
          ['Porcentaje completado', Utils.formatPercent(s.porcentaje)],
          ['Total facturado', Utils.formatMoney(s.totalFacturado)],
          ['Ganancia total', Utils.formatMoney(s.gananciaTotal)],
          ['Ingresos extras', Utils.formatMoney(s.ingresosExtrasTotal)],
          ['Pendiente de cobro', Utils.formatMoney(s.dineroPendienteCobro)],
          ['Cantidad de ventas', s.cantidadVentas],
          ['Cantidad de compradores', s.cantidadCompradores]
        ],
        theme: 'striped', headStyles: { fillColor: [79, 70, 229] }
      });

      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text('Detalle de ventas', 14, finalY);

      doc.autoTable({
        startY: finalY + 4,
        head: [['Fecha', 'Comprador', 'Producto', 'Cant.', 'Importe', 'Estado']],
        body: ventas.map((v) => [
          Utils.formatDate(v.fecha), v.comprador_nombre, v.producto_nombre, v.cantidad,
          Utils.formatMoney(v.precio_total), v.estado === 'pagado' ? 'Pagado' : 'Pendiente'
        ]),
        theme: 'striped', headStyles: { fillColor: [79, 70, 229] }, styles: { fontSize: 8 }
      });

      doc.save(`viaje-egresados-${fechaArchivo()}.pdf`);
      Utils.toast('PDF descargado', 'success');
    } catch (err) {
      console.error(err);
      Utils.toast('No se pudo generar el PDF. Revisá tu conexión a internet.', 'error');
    }
  }

  // ---------------------------------------------------------------------
  // Importar JSON / Restaurar respaldo
  // ---------------------------------------------------------------------
  function abrirModalImportar() {
    AppModal.open('Importar / restaurar respaldo', `
      <p class="form-hint">Seleccioná un archivo <strong>.json</strong> exportado previamente desde esta app.</p>
      <input type="file" id="import-file" accept="application/json" class="input mt-12">
      <div class="form-group mt-16">
        <label class="flex items-center gap-8">
          <span class="toggle"><input type="checkbox" id="import-reemplazar"><span class="toggle__track"></span></span>
          <span class="form-label" style="margin:0;">Reemplazar datos actuales (en vez de sumarlos)</span>
        </label>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--ghost" id="cancelar-importar">Cancelar</button>
        <button type="button" class="btn btn--primary" id="confirmar-importar">Importar</button>
      </div>
    `, {
      onMount: (body) => {
        body.querySelector('#cancelar-importar').addEventListener('click', () => AppModal.close());
        body.querySelector('#confirmar-importar').addEventListener('click', async () => {
          const fileInput = body.querySelector('#import-file');
          const file = fileInput.files[0];
          if (!file) { Utils.toast('Elegí un archivo primero', 'error'); return; }
          const reemplazar = body.querySelector('#import-reemplazar').checked;
          if (reemplazar) {
            const ok = await Utils.confirmDialog('Vas a REEMPLAZAR todos los datos actuales por los del archivo. ¿Continuar?');
            if (!ok) return;
          }
          try {
            const texto = await file.text();
            const backup = JSON.parse(texto);
            await Api.importarTodo(backup, { reemplazar });
            Utils.toast('Datos importados correctamente', 'success');
            AppModal.close();
            Router.navigate('inicio');
          } catch (err) {
            console.error(err);
            Utils.toast(`Error al importar: ${err.message}`, 'error');
          }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Reiniciar datos
  // ---------------------------------------------------------------------
  function abrirModalReiniciar() {
    AppModal.open('Reiniciar datos', `
      <p class="text-secondary" style="font-size:13.5px;line-height:1.5;">
        Esto borra <strong>todas las ventas e ingresos extras</strong> de la campaña. Es una acción irreversible.
      </p>
      <div class="form-group mt-16">
        <label class="flex items-center gap-8">
          <span class="toggle"><input type="checkbox" id="reiniciar-mantener-productos" checked><span class="toggle__track"></span></span>
          <span class="form-label" style="margin:0;">Mantener mis productos cargados</span>
        </label>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--ghost" id="cancelar-reiniciar">Cancelar</button>
        <button type="button" class="btn btn--danger" id="confirmar-reiniciar">Reiniciar todo</button>
      </div>
    `, {
      onMount: (body) => {
        body.querySelector('#cancelar-reiniciar').addEventListener('click', () => AppModal.close());
        body.querySelector('#confirmar-reiniciar').addEventListener('click', async () => {
          const ok = await Utils.confirmDialog('Esta acción no se puede deshacer. ¿Reiniciar todos los datos de la campaña?');
          if (!ok) return;
          const mantenerProductos = body.querySelector('#reiniciar-mantener-productos').checked;
          try {
            await Api.reiniciarDatos({ mantenerProductos });
            Utils.toast('Datos reiniciados', 'success');
            AppModal.close();
            Router.navigate('inicio');
          } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------
  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>Configuración</h1><p>Ajustes generales de la campaña</p></div>
      <div class="skeleton" style="height:320px;"></div>`;

    let cfg = await Api.getConfiguracion();

    function refrescar() {
      Api.getConfiguracion().then((c) => { cfg = c; });
    }

    container.innerHTML = `
      <div class="screen-header"><h1>Configuración</h1><p>Ajustes generales de la campaña</p></div>

      <div class="section-title">Campaña</div>
      <div class="card">
        ${row({ id: 'cfg-meta', icon: '🎯', iconClass: 'icon-bg-primary', title: 'Modificar meta', desc: 'Cambiar el monto objetivo del viaje' })}
        ${row({ id: 'cfg-nombre', icon: '📝', iconClass: 'icon-bg-info', title: 'Nombre de la campaña', desc: 'Nombre y subtítulo que se muestran arriba' })}
        ${row({ id: 'cfg-colores', icon: '🎨', iconClass: 'icon-bg-accent', title: 'Colores', desc: 'Personalizá los colores de la app' })}
        ${row({ id: 'cfg-logo', icon: '🖼️', iconClass: 'icon-bg-secondary', title: 'Logo', desc: 'Imagen que se muestra en el encabezado' })}
      </div>

      <div class="section-title">Datos</div>
      <div class="card">
        ${row({ id: 'cfg-excel', icon: '📊', iconClass: 'icon-bg-secondary', title: 'Exportar Excel', desc: 'Descargar ventas, productos e ingresos' })}
        ${row({ id: 'cfg-pdf', icon: '📄', iconClass: 'icon-bg-danger', title: 'Exportar PDF', desc: 'Reporte resumido en PDF' })}
        ${row({ id: 'cfg-json', icon: '🗂️', iconClass: 'icon-bg-info', title: 'Exportar JSON', desc: 'Todos los datos en un archivo .json' })}
        ${row({ id: 'cfg-importar', icon: '📥', iconClass: 'icon-bg-primary', title: 'Importar JSON', desc: 'Cargar datos desde un archivo .json' })}
        ${row({ id: 'cfg-respaldo', icon: '☁️', iconClass: 'icon-bg-secondary', title: 'Respaldo completo', desc: 'Copia de seguridad de toda la campaña' })}
        ${row({ id: 'cfg-restaurar', icon: '♻️', iconClass: 'icon-bg-accent', title: 'Restaurar respaldo', desc: 'Recuperar datos desde una copia guardada' })}
      </div>

      <div class="section-title">Zona de peligro</div>
      <div class="card">
        ${row({ id: 'cfg-reiniciar', icon: '⚠️', iconClass: 'icon-bg-danger', title: 'Reiniciar datos', desc: 'Borrar ventas e ingresos de la campaña' })}
      </div>

      <p class="text-center text-muted mt-16" style="font-size:11.5px;">Viaje de Egresados · v1.0</p>
    `;

    document.getElementById('cfg-meta').addEventListener('click', () => abrirModalMeta(refrescar));
    document.getElementById('cfg-nombre').addEventListener('click', () => abrirModalNombre(cfg, refrescar));
    document.getElementById('cfg-colores').addEventListener('click', () => abrirModalColores(cfg, refrescar));
    document.getElementById('cfg-logo').addEventListener('click', () => abrirModalLogo(cfg, refrescar));

    document.getElementById('cfg-excel').addEventListener('click', exportarExcel);
    document.getElementById('cfg-pdf').addEventListener('click', exportarPDF);
    document.getElementById('cfg-json').addEventListener('click', exportarJSON);
    document.getElementById('cfg-respaldo').addEventListener('click', exportarJSON);
    document.getElementById('cfg-importar').addEventListener('click', abrirModalImportar);
    document.getElementById('cfg-restaurar').addEventListener('click', abrirModalImportar);

    document.getElementById('cfg-reiniciar').addEventListener('click', abrirModalReiniciar);
  }

  return { render };
})();

window.ScreenConfiguracion = ScreenConfiguracion;
