/**
 * utils.js
 * Funciones puras de formateo y cálculo, reutilizadas por todas las pantallas.
 */

const Utils = (() => {
  const locale = (window.APP_CONFIG && window.APP_CONFIG.LOCALE) || 'es-AR';
  const currency = (window.APP_CONFIG && window.APP_CONFIG.CURRENCY) || 'ARS';

  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  });

  const numberFormatter = new Intl.NumberFormat(locale);

  function formatMoney(value) {
    const n = Number(value) || 0;
    return currencyFormatter.format(n);
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatPercent(value, decimals = 1) {
    const n = Number(value) || 0;
    return `${n.toFixed(decimals)}%`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Recién ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return formatDate(dateStr);
  }

  function todayISO() {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  }

  // Ganancia = Precio - Costo
  function calcularGanancia(costo, precio) {
    return round2((Number(precio) || 0) - (Number(costo) || 0));
  }

  // Rentabilidad (%) = Ganancia / Costo * 100
  function calcularRentabilidad(costo, precio) {
    const c = Number(costo) || 0;
    if (c <= 0) return 0;
    const g = calcularGanancia(c, precio);
    return round2((g / c) * 100);
  }

  // Dado costo y % de ganancia deseado, calcula el precio de venta.
  function calcularPrecioDesdePorcentaje(costo, porcentaje) {
    const c = Number(costo) || 0;
    const p = Number(porcentaje) || 0;
    return round2(c + c * (p / 100));
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--show'));
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-overlay');
      const msgEl = document.getElementById('confirm-message');
      const btnOk = document.getElementById('confirm-ok');
      const btnCancel = document.getElementById('confirm-cancel');
      msgEl.textContent = message;
      overlay.classList.add('is-open');

      const cleanup = (result) => {
        overlay.classList.remove('is-open');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        resolve(result);
      };
      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
    });
  }

  // Carga un <script src="..."> una sola vez (usado para librerías pesadas
  // que solo hacen falta al exportar Excel/PDF: SheetJS, jsPDF).
  const scriptsCargados = new Set();
  function loadScript(src) {
    if (scriptsCargados.has(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { scriptsCargados.add(src); resolve(); };
      s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(s);
    });
  }

  // Dispara la descarga de un Blob con un nombre de archivo dado.
  function descargarBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return {
    formatMoney, formatNumber, formatPercent, formatDate, formatDateTime, timeAgo,
    todayISO, calcularGanancia, calcularRentabilidad, calcularPrecioDesdePorcentaje,
    round2, clamp, uuid, debounce, escapeHtml, toast, confirmDialog,
    loadScript, descargarBlob
  };
})();
