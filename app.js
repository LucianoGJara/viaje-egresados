/**
 * app.js
 * Punto de entrada: inicializa Supabase, arma la navegación, aplica el
 * branding guardado en "configuracion" y arranca el router.
 */

const AppModal = (() => {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const btnClose = document.getElementById('modal-close');

  function open(title, html, { onMount } = {}) {
    titleEl.textContent = title;
    bodyEl.innerHTML = html;
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (typeof onMount === 'function') onMount(bodyEl);
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { bodyEl.innerHTML = ''; }, 300);
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  btnClose.addEventListener('click', close);

  return { open, close, get bodyEl() { return bodyEl; } };
})();

const App = (() => {
  function setupNav() {
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-nav]');
      if (!target) return;
      e.preventDefault();
      const name = target.dataset.nav;
      Router.navigate(name);
      closeMoreSheet();
      const titles = Router.getTitle(name);
      document.title = titles[0] ? `${titles[0]} · Viaje de Egresados` : 'Viaje de Egresados';
    });

    document.getElementById('fab-nueva-venta').addEventListener('click', () => Router.navigate('nueva-venta'));
    document.getElementById('btn-open-more').addEventListener('click', openMoreSheet);
    document.getElementById('more-sheet-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'more-sheet-overlay') closeMoreSheet();
    });
    document.getElementById('btn-refresh').addEventListener('click', async () => {
      const btn = document.getElementById('btn-refresh');
      btn.style.transform = 'rotate(360deg)';
      btn.style.transition = 'transform .5s ease';
      setTimeout(() => { btn.style.transform = ''; }, 500);
      await Router.navigate(Router.getCurrent() || 'inicio');
      Utils.toast('Datos actualizados', 'success');
    });
  }

  function openMoreSheet() { document.getElementById('more-sheet-overlay').classList.add('is-open'); }
  function closeMoreSheet() { document.getElementById('more-sheet-overlay').classList.remove('is-open'); }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
  }

  function applyBranding(cfg) {
    if (!cfg) return;
    document.getElementById('app-title').textContent = cfg.nombre_campana || 'Viaje de Egresados';
    document.getElementById('app-subtitle').textContent = cfg.subtitulo || 'Control de recaudación para el viaje';
    document.title = `${cfg.nombre_campana || 'Viaje de Egresados'}`;

    const logoBox = document.getElementById('app-logo');
    if (cfg.logo_url) {
      logoBox.innerHTML = `<img src="${Utils.escapeHtml(cfg.logo_url)}" alt="Logo">`;
    } else {
      logoBox.textContent = '🎓';
    }

    const root = document.documentElement.style;
    if (cfg.color_primario) {
      root.setProperty('--color-primary', cfg.color_primario);
      root.setProperty('--color-primary-dark', cfg.color_primario);
    }
    if (cfg.color_secundario) {
      root.setProperty('--color-secondary', cfg.color_secundario);
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && cfg.color_primario) metaTheme.setAttribute('content', cfg.color_primario);
  }

  function showFatalError(message) {
    document.getElementById('loading-text').textContent = 'Ocurrió un problema';
    const overlay = document.getElementById('loading-overlay');
    overlay.innerHTML = `
      <div style="max-width:340px;text-align:center;padding:0 20px;">
        <div style="font-size:38px;margin-bottom:10px;">⚠️</div>
        <p style="font-weight:800;font-size:16px;margin-bottom:8px;">No se pudo conectar</p>
        <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;">${Utils.escapeHtml(message)}</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:14px;">
          Revisá <code>js/config.js</code> y verificá la URL y la anon key de tu proyecto Supabase.
        </p>
      </div>`;
  }

  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/sw.js'); } catch (e) { /* noop en local sin https */ }
    }
  }

  async function init() {
    setupNav();
    registerServiceWorker();

    try {
      await Api.init();
      let cfg = null;
      try { cfg = await Api.getConfiguracion(); } catch (e) { /* usa defaults */ }
      applyBranding(cfg);

      document.getElementById('loading-overlay').classList.add('is-hidden');
      document.getElementById('app').hidden = false;
      setTimeout(() => document.getElementById('loading-overlay').remove(), 500);

      await Router.initFromHash();
      window.addEventListener('hashchange', () => Router.initFromHash());
    } catch (err) {
      console.error(err);
      showFatalError(err.message || 'Error desconocido al inicializar la aplicación.');
    }
  }

  return { init, applyBranding, openMoreSheet, closeMoreSheet };
})();

document.addEventListener('DOMContentLoaded', App.init);
