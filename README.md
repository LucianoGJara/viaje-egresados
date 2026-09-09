# 🎓 Viaje de Egresados

**Control de recaudación para el viaje** — una PWA (Progressive Web App) para administrar ventas, ganancias, ingresos extras y el ahorro hacia una meta económica.

Hecha con **HTML5 + CSS3 + JavaScript vanilla** (sin frameworks, sin paso de build) y **Supabase** como base de datos en la nube. Pensada mobile-first, con navegación por pestañas, se instala como app en el celular y funciona en Android, iPhone, tablets y PC.

---

## Índice

1. [Requisitos](#requisitos)
2. [1. Crear el proyecto en Supabase](#1-crear-el-proyecto-en-supabase)
3. [2. Configurar la app (`js/config.js`)](#2-configurar-la-app-jsconfigjs)
4. [3. Probarla en tu computadora](#3-probarla-en-tu-computadora)
5. [4. Subir el proyecto a GitHub](#4-subir-el-proyecto-a-github)
6. [5. Desplegar en Vercel](#5-desplegar-en-vercel)
7. [Instalar la app en el celular (PWA)](#instalar-la-app-en-el-celular-pwa)
8. [Estructura del proyecto](#estructura-del-proyecto)
9. [Modelo de datos](#modelo-de-datos)
10. [Criterio financiero usado en los cálculos](#criterio-financiero-usado-en-los-cálculos)
11. [Personalización](#personalización)
12. [Multiusuario y autenticación futura](#multiusuario-y-autenticación-futura)
13. [Preguntas frecuentes](#preguntas-frecuentes)

---

## Requisitos

- Una cuenta gratuita en [Supabase](https://supabase.com)
- Una cuenta en [GitHub](https://github.com)
- Una cuenta en [Vercel](https://vercel.com) (podés iniciar sesión directo con GitHub)
- No hace falta instalar Node, npm ni ninguna herramienta de build. Es HTML/CSS/JS puro.

---

## 1. Crear el proyecto en Supabase

1. Entrá a [app.supabase.com](https://app.supabase.com) y creá un **New Project** (elegí una contraseña de base de datos y una región cercana, por ejemplo São Paulo).
2. Esperá a que el proyecto termine de aprovisionarse (~2 minutos).
3. En el menú lateral, abrí **SQL Editor → New query**.
4. Copiá **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql) de este repositorio, pegalo en el editor y presioná **Run**.
5. Verificá en **Table Editor** que se hayan creado 7 tablas: `campanas`, `productos`, `ventas`, `ingresos_extras`, `metas`, `configuracion`, `mensajes` — y que `productos` tenga ya cargados los 3 combos iniciales.
6. Andá a **Settings → API** y copiá dos valores:
   - **Project URL**
   - **anon public** key (la clave pública, no la `service_role`)

> La tabla `productos` ya viene sembrada con los 3 combos del enunciado (Promo Familiar Completa, Promo Clásica y Promo Especial), la meta inicial en **$2.000.000** y el mensaje de "Compartir campaña" con el texto original.

---

## 2. Configurar la app (`js/config.js`)

Abrí el archivo `js/config.js` y reemplazá estos dos valores por los que copiaste en el paso anterior:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU-ANON-KEY-AQUI',
  ...
};
```

Guardá el archivo. Es el **único** archivo que necesitás tocar para conectar la app a tu base de datos.

> ℹ️ La "anon key" está pensada para ser pública (por eso puede ir en el código del front-end): la seguridad la da Row Level Security, que ya viene activado en `schema.sql`.

---

## 3. Probarla en tu computadora

Como es un sitio 100% estático, alcanza con levantar cualquier servidor HTTP simple desde la carpeta del proyecto. Por ejemplo, con Python:

```bash
cd viaje-egresados
python3 -m http.server 8080
```

y abrí `http://localhost:8080` en el navegador. (No abras el `index.html` con doble clic / `file://`, porque el Service Worker y los módulos necesitan `http://`).

---

## 4. Subir el proyecto a GitHub

```bash
cd viaje-egresados
git init
git add .
git commit -m "Primera versión de Viaje de Egresados"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/viaje-egresados.git
git push -u origin main
```

Creá el repositorio vacío en GitHub antes del `git remote add` (podés hacerlo desde github.com/new).

---

## 5. Desplegar en Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new) e importá el repositorio de GitHub que acabás de crear.
2. En **Framework Preset** elegí **Other** (es un sitio estático, no necesita build).
3. Dejá el **Build Command** y el **Output Directory** vacíos (o `./`), no hace falta ningún paso de compilación.
4. Presioná **Deploy**.
5. En un par de minutos vas a tener tu URL pública, algo como `https://viaje-egresados.vercel.app`.

Cada vez que hagas `git push` a `main`, Vercel vuelve a desplegar automáticamente.

---

## Instalar la app en el celular (PWA)

- **Android (Chrome):** entrá a la URL de Vercel → menú (⋮) → **"Agregar a la pantalla de inicio" / "Instalar app"**.
- **iPhone (Safari):** entrá a la URL → botón de compartir (□↑) → **"Agregar a la pantalla de inicio"**.
- **PC (Chrome/Edge):** ícono de instalar (⊕) en la barra de direcciones.

Una vez instalada, la app abre en pantalla completa, con ícono propio, y el "app shell" (HTML/CSS/JS) queda cacheado para que abra rápido incluso con mala conexión (los datos siempre se piden en vivo a Supabase).

---

## Estructura del proyecto

```
viaje-egresados/
├── index.html                 # Shell de la app: navegación + contenedores de cada pantalla
├── manifest.json               # Manifest de la PWA
├── sw.js                       # Service Worker (cachea el app shell, nunca los datos)
├── vercel.json                 # Config de despliegue en Vercel
├── css/
│   └── styles.css              # Sistema de diseño completo (mobile-first)
├── js/
│   ├── config.js                # ⚠️ Acá van tu URL y anon key de Supabase
│   ├── utils.js                 # Formateo, cálculos, toasts, confirmaciones
│   ├── stats.js                 # Cálculos agregados (dashboard, meta, estadísticas)
│   ├── charts.js                # Gráficos SVG simples (barras, dona, línea) sin librerías
│   ├── api.js                   # Única capa de acceso a Supabase (CRUD de todas las tablas)
│   ├── router.js                # Router por hash (#inicio, #ventas, ...)
│   ├── app.js                   # Bootstrap: navegación, branding, Service Worker
│   └── screens/
│       ├── inicio.js             # Dashboard
│       ├── nueva-venta.js        # Registrar venta
│       ├── ventas.js             # Listado + filtros + acciones
│       ├── productos.js          # CRUD de productos
│       ├── ingresos.js           # Ingresos extras
│       ├── estadisticas.js       # Métricas y gráficos
│       ├── meta.js               # Meta del viaje + proyección
│       ├── compartir.js          # Editor de mensaje para compartir
│       └── configuracion.js      # Ajustes, export/import, respaldo
├── icons/                       # Íconos de la PWA (generados con scripts/generate_icons.py)
├── scripts/
│   └── generate_icons.py        # Script opcional para regenerar los íconos
└── supabase/
    └── schema.sql                # Esquema completo + RLS + datos iniciales
```

---

## Modelo de datos

| Tabla              | Para qué sirve                                                                 |
|---------------------|----------------------------------------------------------------------------|
| `campanas`          | Una fila = una campaña de recaudación. Preparada para multi-campaña/usuario. |
| `productos`          | Combos/promos: nombre, costo, precio, ganancia y rentabilidad (calculados). |
| `ventas`             | Cada venta registrada, con snapshot del producto y totales calculados por trigger. |
| `ingresos_extras`   | Dinero que no viene de ventas (donaciones, rifas, eventos, etc.).           |
| `metas`              | Historial de metas económicas (la más reciente y "activa" es la vigente).   |
| `configuracion`      | Branding: nombre, subtítulo, colores, logo, moneda.                        |
| `mensajes`           | Texto editable de "Compartir campaña" (guarda también el original).        |

Los totales de cada venta (`precio_total`, `costo_total`, `ganancia_total`, `rentabilidad`) los calcula **la base de datos** con un trigger (`calcular_totales_venta`), así nunca quedan desincronizados sin importar desde dónde se inserten o editen.

---

## Criterio financiero usado en los cálculos

Para que los números del dashboard tengan sentido para una campaña real:

- **Total facturado** = suma del precio de **todas** las ventas (pagadas + pendientes).
- **Ganancia total** = suma de la ganancia de **todas** las ventas (pagadas + pendientes).
- **Dinero acumulado** (el que cuenta para la meta) = ganancia de las ventas **ya pagadas** + ingresos extras. El costo de los insumos no es ahorro, solo la ganancia lo es.
- **Dinero pendiente de cobro** = precio total de las ventas marcadas como "pendiente" (lo que todavía deben los compradores).

Este criterio está centralizado en `js/stats.js` por si en algún momento querés cambiarlo.

---

## Personalización

- **Meta, nombre, subtítulo, colores y logo:** desde la pantalla **Configuración**, sin tocar código.
- **Productos iniciales:** se cargan desde `supabase/schema.sql`. Podés editarlos ahí antes de correr el script, o simplemente gestionarlos después desde la pantalla **Productos** de la app.
- **Ícono de la PWA:** editá `scripts/generate_icons.py` y corré `python3 scripts/generate_icons.py` para regenerar los PNG en `icons/`.
- **Colores del sistema de diseño:** variables CSS en la sección `:root` de `css/styles.css` (además de lo que se puede cambiar desde Configuración).

---

## Multiusuario y autenticación futura

Hoy la app funciona sin login (cualquiera con el link y la anon key puede leer/escribir). El esquema ya está preparado para agregar autenticación después:

1. Activá **Authentication** en Supabase (email, Google, magic link, lo que prefieras).
2. Hacé que `campanas.user_id` sea `NOT NULL` y lo complete `auth.uid()` al crear una campaña.
3. Reemplazá las policies `acceso_publico_*` de `schema.sql` por policies que filtren por `auth.uid()`, por ejemplo:
   ```sql
   using (campana_id in (select id from campanas where user_id = auth.uid()))
   ```
4. En `js/api.js`, la función `ensureCampana()` es el único lugar que decide "cuál es la campaña activa" — ahí es donde se conectaría el usuario logueado con su propia campaña.

Como toda la app pasa por `js/api.js` para hablar con la base de datos, ninguna pantalla necesita cambios: alcanza con tocar esa capa.

---

## Preguntas frecuentes

**¿Puedo usar la app sin conexión?**
El "cascarón" (HTML/CSS/JS) queda cacheado por el Service Worker y abre rápido incluso offline, pero los datos siempre se leen y escriben en vivo contra Supabase — necesitás internet para ver y guardar ventas.

**¿Los exports de Excel y PDF necesitan instalar algo?**
No. Se generan en el navegador; la primera vez que los usás, la app descarga por única vez las librerías necesarias (SheetJS y jsPDF) desde un CDN.

**¿Dónde se guarda el logo que subo?**
Se comprime en el navegador y se guarda como imagen dentro de la tabla `configuracion` (columna `logo_url`). Para logos muy grandes o múltiples archivos, lo ideal a futuro es migrar a **Supabase Storage**.

**¿Puedo cambiar la moneda?**
Sí, `js/config.js` tiene `LOCALE` y `CURRENCY` (por defecto `es-AR` / `ARS`) que controlan el formato de los montos en toda la app.
