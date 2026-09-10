/**
 * screens/compartir.js — Editor del mensaje para compartir la campaña.
 */

const ScreenCompartir = (() => {
  let mensajeActual = null;

  function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    return Promise.resolve();
  }

  async function render(container) {
    container.innerHTML = `
      <div class="screen-header"><h1>📣 Compartir campaña</h1><p>Invitá a colaborar con tu viaje</p></div>
      <div class="skeleton" style="height:260px;"></div>`;

    mensajeActual = await Api.getMensaje('compartir');

    container.innerHTML = `
      <div class="screen-header"><h1>📣 Compartir campaña</h1><p>Invitá a colaborar con tu viaje</p></div>

      <div class="card">
        <label class="form-label">Tu mensaje</label>
        <textarea class="textarea" id="compartir-texto" style="min-height:220px;">${Utils.escapeHtml(mensajeActual.contenido)}</textarea>

        <div class="flex gap-8 mt-12" style="flex-wrap:wrap;">
          <button class="btn btn--primary" id="btn-guardar-mensaje">💾 Guardar mensaje</button>
          <button class="btn btn--ghost" id="btn-restablecer-mensaje">↩️ Restablecer original</button>
          <button class="btn btn--ghost" id="btn-vista-previa">👁️ Vista previa</button>
        </div>
      </div>

      <div id="preview-wrap" class="mt-16 hidden">
        <div class="section-title">Vista previa</div>
        <div class="share-preview" id="preview-texto"></div>
      </div>

      <div class="section-title">Compartir por</div>
      <div class="share-actions-grid">
        <button class="share-btn share-btn--whatsapp" id="btn-whatsapp">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A7.85 7.85 0 0012.05 4a7.94 7.94 0 00-6.9 11.87L4 20l4.24-1.11a7.9 7.9 0 003.8.97h.01a7.94 7.94 0 007.94-7.93 7.85 7.85 0 00-2.4-5.61zm-5.55 12.2a6.6 6.6 0 01-3.36-.92l-.24-.14-2.5.66.67-2.44-.16-.25a6.6 6.6 0 1112.28-3.5 6.61 6.61 0 01-6.69 6.6zm3.62-4.94c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.14-.43.05a5.4 5.4 0 01-1.6-.98 5.98 5.98 0 01-1.1-1.37c-.12-.2 0-.3.09-.4.09-.1.2-.23.3-.35.1-.11.13-.2.2-.32.06-.13.03-.25-.02-.35-.05-.1-.44-1.06-.6-1.45-.16-.38-.32-.33-.44-.33h-.38a.72.72 0 00-.52.24 2.2 2.2 0 00-.68 1.63c0 .96.7 1.89.8 2.02.1.13 1.38 2.1 3.34 2.95.47.2.83.32 1.12.41.47.15.9.13 1.24.08.38-.06 1.17-.48 1.33-.94.17-.46.17-.86.12-.94-.05-.09-.18-.14-.38-.24z"/></svg>
          WhatsApp
        </button>
        <button class="share-btn share-btn--telegram" id="btn-telegram">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.6L18.7 19.9c-.24 1.06-.87 1.32-1.76.82l-4.86-3.58-2.34 2.25c-.26.26-.48.48-.98.48l.35-4.98 9.05-8.18c.4-.35-.08-.55-.6-.2L6.6 12.6l-4.9-1.53c-1.06-.33-1.08-1.06.22-1.57L20.6 3.24c.88-.32 1.65.2 1.3 1.36z"/></svg>
          Telegram
        </button>
        <button class="share-btn share-btn--email" id="btn-email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>
          Correo
        </button>
        <button class="share-btn share-btn--copy" id="btn-copiar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copiar texto
        </button>
        <button class="share-btn share-btn--native" id="btn-nativo" ${navigator.share ? '' : 'style="display:none;"'}>
          📲 Compartir desde el celular
        </button>
      </div>
    `;

    const textarea = document.getElementById('compartir-texto');
    const previewWrap = document.getElementById('preview-wrap');
    const previewTexto = document.getElementById('preview-texto');

    document.getElementById('btn-guardar-mensaje').addEventListener('click', async () => {
      try {
        mensajeActual = await Api.updateMensaje(textarea.value);
        Utils.toast('Mensaje guardado', 'success');
      } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
    });

    document.getElementById('btn-restablecer-mensaje').addEventListener('click', async () => {
      const ok = await Utils.confirmDialog('¿Restablecer el mensaje original? Vas a perder los cambios que hiciste.');
      if (!ok) return;
      try {
        mensajeActual = await Api.resetMensaje();
        textarea.value = mensajeActual.contenido;
        Utils.toast('Mensaje restablecido', 'success');
      } catch (err) { Utils.toast(`Error: ${err.message}`, 'error'); }
    });

    document.getElementById('btn-vista-previa').addEventListener('click', () => {
      previewWrap.classList.toggle('hidden');
      previewTexto.textContent = textarea.value;
      if (!previewWrap.classList.contains('hidden')) previewWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    document.getElementById('btn-copiar').addEventListener('click', async () => {
      try { await copiarAlPortapapeles(textarea.value); Utils.toast('Texto copiado al portapapeles', 'success'); }
      catch (err) { Utils.toast('No se pudo copiar el texto', 'error'); }
    });

    document.getElementById('btn-whatsapp').addEventListener('click', () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(textarea.value)}`, '_blank');
    });

    document.getElementById('btn-telegram').addEventListener('click', () => {
      window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(textarea.value)}`, '_blank');
    });

    document.getElementById('btn-email').addEventListener('click', () => {
      window.location.href = `mailto:?subject=${encodeURIComponent('¡Ayudame a llegar a mi viaje de egresados!')}&body=${encodeURIComponent(textarea.value)}`;
    });

    const btnNativo = document.getElementById('btn-nativo');
    if (navigator.share) {
      btnNativo.addEventListener('click', async () => {
        try { await navigator.share({ text: textarea.value }); }
        catch (err) { /* el usuario canceló el share, no hacemos nada */ }
      });
    }
  }

  return { render };
})();

window.ScreenCompartir = ScreenCompartir;
