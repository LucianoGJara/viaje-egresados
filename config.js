/**
 * config.js
 * -----------------------------------------------------------------------
 * Configuración de conexión a Supabase.
 *
 * 1. Creá un proyecto gratis en https://supabase.com
 * 2. Ejecutá el archivo supabase/schema.sql en el SQL Editor de tu proyecto
 * 3. Andá a Settings → API y copiá:
 *      - "Project URL"      -> SUPABASE_URL
 *      - "anon public" key  -> SUPABASE_ANON_KEY
 * 4. Reemplazá los valores de abajo por los tuyos.
 *
 * La "anon key" es pública por diseño (Supabase la protege con Row Level
 * Security, ya configurado en schema.sql), así que es normal y seguro que
 * quede en el código del front-end y se suba al repositorio.
 * -----------------------------------------------------------------------
 */

window.APP_CONFIG = {
  SUPABASE_URL: 'https://aqlfvqrfghrsmlyugnsp.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'sb_publishable_jF5x3DRS9wJHFdL7w55XHA_srAUQmsL',

  // Nombre que se usa mientras la app carga la configuración real desde Supabase.
  APP_NAME_FALLBACK: 'Viaje de Egresados',
  APP_SUBTITLE_FALLBACK: 'Control de recaudación para el viaje',

  // Meta usada solo como referencia visual si aún no hay datos en la nube.
  META_FALLBACK: 2000000,

  // Moneda para formateo de montos (Intl.NumberFormat).
  LOCALE: 'es-AR',
  CURRENCY: 'ARS'
};

// Mensaje inicial de la pantalla "Compartir Campaña". Se usa como red de
// seguridad por si la base de datos está vacía (normalmente ya viene
// sembrado por supabase/schema.sql).
window.MENSAJE_INICIAL_DEFAULT =
`Holaa 😊 Estoy vendiendo estas promos para poder juntar dinero para mi viaje de egresados ☺️❤️
Estoy tratando de ir ahorrando de a poquito para llegar a mi objetivo.
Si te gustaría colaborar, ¿comprarías alguna?
Cualquier ayuda me sirve muchísimo.
Y si no podés comprar, compartir la publicación también me ayudaría un montón.
¡Muchas gracias! ❤️🙏`;
