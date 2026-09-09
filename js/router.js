/**
 * router.js
 * Router muy simple basado en hash (#inicio, #ventas, ...).
 * Cada pantalla es un módulo global con un método render(container, params).
 */

const Router = (() => {
  const screens = {
    'inicio': () => window.ScreenInicio,
    'nueva-venta': () => window.ScreenNuevaVenta,
    'ventas': () => window.ScreenVentas,
    'productos': () => window.ScreenProductos,
    'ingresos': () => window.ScreenIngresos,
    'estadisticas': () => window.ScreenEstadisticas,
    'meta': () => window.ScreenMeta,
    'compartir': () => window.ScreenCompartir,
    'configuracion': () => window.ScreenConfiguracion
  };

  const TITLES = {
    'inicio': ['Inicio', ''],
    'nueva-venta': ['Nueva venta', 'Registrá una venta nueva'],
    'ventas': ['Ventas', 'Buscá, filtrá y administrá tus ventas'],
    'productos': ['Productos', 'Tus combos y promociones'],
    'ingresos': ['Ingresos extras', 'Dinero que no proviene de ventas'],
    'estadisticas': ['Estadísticas', 'El estado de tu campaña en números'],
    'meta': ['Meta del viaje', 'Seguimiento del objetivo económico'],
    'compartir': ['Compartir campaña', 'Invitá a colaborar con tu viaje'],
    'configuracion': ['Configuración', 'Ajustes generales de la campaña']
  };

  let current = null;

  async function navigate(name, params = {}) {
    if (!screens[name]) name = 'inicio';

    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('is-active'));
    document.querySelectorAll('[data-nav]').forEach((elm) => {
      elm.classList.toggle('is-active', elm.dataset.nav === name);
    });

    const screenEl = document.getElementById(`screen-${name}`);
    if (screenEl) screenEl.classList.add('is-active');
    current = name;

    try { window.history.replaceState(null, '', `#${name}`); } catch (e) { /* noop */ }

    const container = document.getElementById(`root-${name}`);
    const mod = screens[name]();

    if (mod && typeof mod.render === 'function') {
      try {
        await mod.render(container, params);
      } catch (err) {
        console.error(`[Router] Error renderizando "${name}":`, err);
        container.innerHTML = `<div class="error-banner">
          No se pudo cargar esta sección.<br><code>${Utils.escapeHtml(err.message || String(err))}</code>
        </div>`;
      }
    } else if (container) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state__title">Próximamente</p></div>';
    }

    window.scrollTo({ top: 0, behavior: 'instant' in window.scrollTo ? 'instant' : 'auto' });
    return name;
  }

  function initFromHash() {
    const name = (window.location.hash || '#inicio').replace('#', '') || 'inicio';
    return navigate(name);
  }

  function getCurrent() { return current; }
  function getTitle(name) { return TITLES[name] || ['', '']; }

  return { navigate, initFromHash, getCurrent, getTitle };
})();
