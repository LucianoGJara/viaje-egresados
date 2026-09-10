/**
 * api.js
 * -----------------------------------------------------------------------
 * Capa única de acceso a datos (Supabase). Ninguna pantalla debe llamar
 * a la librería de Supabase directamente: todas pasan por este módulo.
 * Esto hace que, el día de mañana, agregar autenticación multi-usuario
 * sea cuestión de filtrar por usuario acá adentro, sin tocar las pantallas.
 * -----------------------------------------------------------------------
 */

const Api = (() => {
  let sb = null;
  let campanaId = null;
  let ready = false;

  // -------------------------------------------------------------------
  // Inicialización
  // -------------------------------------------------------------------
  async function init() {
    if (ready) return campanaId;

    const cfg = window.APP_CONFIG || {};
    if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('TU-PROYECTO')) {
      throw new Error(
        'Supabase no está configurado. Editá js/config.js con la URL y la anon key de tu proyecto.'
      );
    }
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('No se pudo cargar la librería de Supabase (revisá tu conexión a internet).');
    }

    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    campanaId = await ensureCampana();
    ready = true;
    return campanaId;
  }

  async function ensureCampana() {
    const { data, error } = await sb.from('campanas').select('id').order('created_at', { ascending: true }).limit(1);
    if (error) throw error;
    if (data && data.length) return data[0].id;

    // No existe ninguna campaña todavía (base de datos recién creada): la creamos.
    const { data: nueva, error: errCrear } = await sb
      .from('campanas')
      .insert({ nombre: 'Viaje de Egresados', subtitulo: 'Control de recaudación para el viaje' })
      .select('id')
      .single();
    if (errCrear) throw errCrear;

    const id = nueva.id;
    await sb.from('metas').insert({ campana_id: id, monto_meta: window.APP_CONFIG.META_FALLBACK || 2000000, activa: true });
    await sb.from('configuracion').insert({ campana_id: id });
    const mensajeInicial = window.MENSAJE_INICIAL_DEFAULT || '';
    await sb.from('mensajes').insert({
      campana_id: id, tipo: 'compartir', contenido: mensajeInicial, contenido_original: mensajeInicial
    });
    return id;
  }

  function throwIfError(error) {
    if (error) throw error;
  }

  // -------------------------------------------------------------------
  // PRODUCTOS
  // -------------------------------------------------------------------
  async function listProductos({ includeInactive = true } = {}) {
    let q = sb.from('productos').select('*').eq('campana_id', campanaId).order('orden', { ascending: true });
    if (!includeInactive) q = q.eq('activo', true);
    const { data, error } = await q;
    throwIfError(error);
    return data || [];
  }

  async function getProducto(id) {
    const { data, error } = await sb.from('productos').select('*').eq('id', id).single();
    throwIfError(error);
    return data;
  }

  async function createProducto(payload) {
    const { data, error } = await sb
      .from('productos')
      .insert({ ...payload, campana_id: campanaId })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function updateProducto(id, payload) {
    const { data, error } = await sb
      .from('productos')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function deleteProducto(id) {
    const { error } = await sb.from('productos').delete().eq('id', id);
    throwIfError(error);
  }

  async function duplicarProducto(id) {
    const original = await getProducto(id);
    const copia = {
      nombre: `${original.nombre} (copia)`,
      descripcion: original.descripcion,
      costo: original.costo,
      precio_venta: original.precio_venta,
      activo: original.activo,
      orden: original.orden
    };
    const nuevo = await createProducto(copia);
    // La receta (insumos) también se duplica, así no hay que volver a cargarla a mano.
    const receta = await getRecetaProducto(id);
    if (receta.length) {
      await setRecetaProducto(nuevo.id, receta.map((r) => ({ insumo_id: r.insumo_id, cantidad: r.cantidad })));
    }
    return nuevo;
  }

  // -------------------------------------------------------------------
  // INSUMOS (catálogo de materia prima / ingredientes)
  // -------------------------------------------------------------------
  async function listInsumos({ includeInactive = true } = {}) {
    let q = sb.from('insumos').select('*').eq('campana_id', campanaId).order('orden', { ascending: true });
    if (!includeInactive) q = q.eq('activo', true);
    const { data, error } = await q;
    throwIfError(error);
    return data || [];
  }

  async function getInsumo(id) {
    const { data, error } = await sb.from('insumos').select('*').eq('id', id).single();
    throwIfError(error);
    return data;
  }

  async function createInsumo(payload) {
    const { data, error } = await sb
      .from('insumos')
      .insert({ ...payload, campana_id: campanaId })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function updateInsumo(id, payload) {
    const { data, error } = await sb
      .from('insumos')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function deleteInsumo(id) {
    // Al borrar un insumo, ON DELETE CASCADE también borra sus filas en
    // producto_insumos (deja de aparecer en la receta de los combos que lo usaban).
    const { error } = await sb.from('insumos').delete().eq('id', id);
    throwIfError(error);
  }

  async function duplicarInsumo(id) {
    const original = await getInsumo(id);
    return createInsumo({
      nombre: `${original.nombre} (copia)`,
      unidad_medida: original.unidad_medida,
      notas: original.notas,
      activo: original.activo,
      orden: original.orden
    });
  }

  // -------------------------------------------------------------------
  // RECETAS (producto_insumos): qué insumos y en qué cantidad usa cada combo
  // -------------------------------------------------------------------
  async function getRecetaProducto(productoId) {
    const { data, error } = await sb
      .from('producto_insumos')
      .select('*, insumo:insumos(*)')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: true });
    throwIfError(error);
    return data || [];
  }

  // Trae de una sola vez la receta de TODOS los productos indicados (para no
  // hacer N consultas al calcular "insumos necesarios" sobre todas las ventas).
  async function getRecetas(productoIds = []) {
    if (!productoIds.length) return [];
    const { data, error } = await sb
      .from('producto_insumos')
      .select('*, insumo:insumos(*)')
      .in('producto_id', productoIds);
    throwIfError(error);
    return data || [];
  }

  // Reemplaza toda la receta de un producto de una sola vez (borra + inserta).
  async function setRecetaProducto(productoId, items = []) {
    const { error: errDelete } = await sb.from('producto_insumos').delete().eq('producto_id', productoId);
    throwIfError(errDelete);
    if (!items.length) return [];
    const rows = items
      .filter((it) => it.insumo_id && Number(it.cantidad) > 0)
      .map((it) => ({ producto_id: productoId, insumo_id: it.insumo_id, cantidad: Number(it.cantidad) }));
    if (!rows.length) return [];
    const { data, error } = await sb.from('producto_insumos').insert(rows).select();
    throwIfError(error);
    return data;
  }

  // -------------------------------------------------------------------
  // VENTAS
  // -------------------------------------------------------------------
  async function listVentas(filters = {}) {
    let q = sb.from('ventas').select('*').eq('campana_id', campanaId);

    if (filters.busqueda) {
      const b = filters.busqueda.replace(/[%,]/g, '');
      q = q.or(`comprador_nombre.ilike.%${b}%,telefono.ilike.%${b}%`);
    }
    if (filters.productoId) q = q.eq('producto_id', filters.productoId);
    if (filters.estado) q = q.eq('estado', filters.estado);
    if (filters.desde) q = q.gte('fecha', filters.desde);
    if (filters.hasta) q = q.lte('fecha', filters.hasta);

    q = q.order('fecha', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await q;
    throwIfError(error);
    return data || [];
  }

  async function getVenta(id) {
    const { data, error } = await sb.from('ventas').select('*').eq('id', id).single();
    throwIfError(error);
    return data;
  }

  async function createVenta(payload) {
    const { data, error } = await sb
      .from('ventas')
      .insert({ ...payload, campana_id: campanaId })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function updateVenta(id, payload) {
    const { data, error } = await sb
      .from('ventas')
      .update({ ...payload })
      .eq('id', id)
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function deleteVenta(id) {
    const { error } = await sb.from('ventas').delete().eq('id', id);
    throwIfError(error);
  }

  async function duplicarVenta(id) {
    const original = await getVenta(id);
    const copia = {
      producto_id: original.producto_id,
      producto_nombre: original.producto_nombre,
      comprador_nombre: original.comprador_nombre,
      telefono: original.telefono,
      cantidad: original.cantidad,
      precio_unitario: original.precio_unitario,
      costo_unitario: original.costo_unitario,
      estado: 'pendiente',
      observaciones: original.observaciones,
      fecha: Utils.todayISO()
    };
    return createVenta(copia);
  }

  async function cambiarEstadoVenta(id, estado) {
    return updateVenta(id, { estado });
  }

  // -------------------------------------------------------------------
  // INGRESOS EXTRAS
  // -------------------------------------------------------------------
  async function listIngresos(filters = {}) {
    let q = sb.from('ingresos_extras').select('*').eq('campana_id', campanaId);
    if (filters.tipo) q = q.eq('tipo', filters.tipo);
    if (filters.desde) q = q.gte('fecha', filters.desde);
    if (filters.hasta) q = q.lte('fecha', filters.hasta);
    q = q.order('fecha', { ascending: false }).order('created_at', { ascending: false });
    const { data, error } = await q;
    throwIfError(error);
    return data || [];
  }

  async function createIngreso(payload) {
    const { data, error } = await sb
      .from('ingresos_extras')
      .insert({ ...payload, campana_id: campanaId })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function updateIngreso(id, payload) {
    const { data, error } = await sb.from('ingresos_extras').update(payload).eq('id', id).select().single();
    throwIfError(error);
    return data;
  }

  async function deleteIngreso(id) {
    const { error } = await sb.from('ingresos_extras').delete().eq('id', id);
    throwIfError(error);
  }

  // -------------------------------------------------------------------
  // META
  // -------------------------------------------------------------------
  async function getMetaActiva() {
    const { data, error } = await sb
      .from('metas')
      .select('*')
      .eq('campana_id', campanaId)
      .eq('activa', true)
      .order('created_at', { ascending: false })
      .limit(1);
    throwIfError(error);
    if (data && data.length) return data[0];
    return { monto_meta: window.APP_CONFIG.META_FALLBACK || 2000000 };
  }

  async function setMeta(monto, nota = '') {
    await sb.from('metas').update({ activa: false }).eq('campana_id', campanaId).eq('activa', true);
    const { data, error } = await sb
      .from('metas')
      .insert({ campana_id: campanaId, monto_meta: monto, activa: true, nota })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // -------------------------------------------------------------------
  // CONFIGURACION
  // -------------------------------------------------------------------
  async function getConfiguracion() {
    const { data, error } = await sb.from('configuracion').select('*').eq('campana_id', campanaId).single();
    throwIfError(error);
    return data;
  }

  async function updateConfiguracion(payload) {
    const { data, error } = await sb
      .from('configuracion')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('campana_id', campanaId)
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // -------------------------------------------------------------------
  // MENSAJES
  // -------------------------------------------------------------------
  async function getMensaje(tipo = 'compartir') {
    const { data, error } = await sb
      .from('mensajes')
      .select('*')
      .eq('campana_id', campanaId)
      .eq('tipo', tipo)
      .single();
    throwIfError(error);
    return data;
  }

  async function updateMensaje(contenido, tipo = 'compartir') {
    const { data, error } = await sb
      .from('mensajes')
      .update({ contenido, updated_at: new Date().toISOString() })
      .eq('campana_id', campanaId)
      .eq('tipo', tipo)
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  async function resetMensaje(tipo = 'compartir') {
    const actual = await getMensaje(tipo);
    return updateMensaje(actual.contenido_original, tipo);
  }

  // -------------------------------------------------------------------
  // RESPALDO / RESTAURAR / REINICIAR
  // -------------------------------------------------------------------
  async function exportarTodo() {
    const [productos, ventas, ingresos, meta, configuracion, mensaje, insumos] = await Promise.all([
      listProductos(), listVentas(), listIngresos(), getMetaActiva(), getConfiguracion(), getMensaje(), listInsumos()
    ]);
    const recetas = await getRecetas(productos.map((p) => p.id));
    return {
      version: 2,
      exportado_en: new Date().toISOString(),
      campana_id: campanaId,
      productos, ventas, ingresos_extras: ingresos, meta, configuracion, mensaje,
      insumos,
      producto_insumos: recetas.map((r) => ({ producto_id: r.producto_id, insumo_id: r.insumo_id, cantidad: r.cantidad }))
    };
  }

  async function importarTodo(backup, { reemplazar = false } = {}) {
    if (!backup || typeof backup !== 'object') throw new Error('Archivo de respaldo inválido.');

    if (reemplazar) {
      await sb.from('ventas').delete().eq('campana_id', campanaId);
      await sb.from('ingresos_extras').delete().eq('campana_id', campanaId);
      await sb.from('productos').delete().eq('campana_id', campanaId);
      await sb.from('insumos').delete().eq('campana_id', campanaId);
    }

    const mapaProductos = new Map();
    if (Array.isArray(backup.productos)) {
      for (const p of backup.productos) {
        const creado = await createProducto({
          nombre: p.nombre, descripcion: p.descripcion, costo: p.costo,
          precio_venta: p.precio_venta, activo: p.activo, orden: p.orden
        });
        mapaProductos.set(p.id, creado.id);
      }
    }

    const mapaInsumos = new Map();
    if (Array.isArray(backup.insumos)) {
      for (const i of backup.insumos) {
        const creado = await createInsumo({
          nombre: i.nombre, unidad_medida: i.unidad_medida, notas: i.notas, activo: i.activo, orden: i.orden
        });
        mapaInsumos.set(i.id, creado.id);
      }
    }
    if (Array.isArray(backup.producto_insumos)) {
      const porProducto = new Map();
      for (const r of backup.producto_insumos) {
        const nuevoProductoId = mapaProductos.get(r.producto_id);
        const nuevoInsumoId = mapaInsumos.get(r.insumo_id);
        if (!nuevoProductoId || !nuevoInsumoId) continue; // referencia rota en el backup, se omite
        if (!porProducto.has(nuevoProductoId)) porProducto.set(nuevoProductoId, []);
        porProducto.get(nuevoProductoId).push({ insumo_id: nuevoInsumoId, cantidad: r.cantidad });
      }
      for (const [productoId, items] of porProducto) {
        await setRecetaProducto(productoId, items);
      }
    }

    if (Array.isArray(backup.ventas)) {
      for (const v of backup.ventas) {
        await createVenta({
          producto_id: mapaProductos.get(v.producto_id) || null,
          producto_nombre: v.producto_nombre,
          comprador_nombre: v.comprador_nombre,
          telefono: v.telefono,
          cantidad: v.cantidad,
          precio_unitario: v.precio_unitario,
          costo_unitario: v.costo_unitario,
          estado: v.estado,
          observaciones: v.observaciones,
          fecha: v.fecha
        });
      }
    }
    if (Array.isArray(backup.ingresos_extras)) {
      for (const i of backup.ingresos_extras) {
        await createIngreso({
          concepto: i.concepto, tipo: i.tipo, monto: i.monto, fecha: i.fecha, observaciones: i.observaciones
        });
      }
    }
    if (backup.meta && backup.meta.monto_meta) {
      await setMeta(backup.meta.monto_meta, 'Restaurado desde respaldo');
    }
    if (backup.configuracion) {
      const { nombre_campana, subtitulo, moneda, color_primario, color_secundario, logo_url } = backup.configuracion;
      await updateConfiguracion({ nombre_campana, subtitulo, moneda, color_primario, color_secundario, logo_url });
    }
  }

  async function reiniciarDatos({ mantenerProductos = true } = {}) {
    await sb.from('ventas').delete().eq('campana_id', campanaId);
    await sb.from('ingresos_extras').delete().eq('campana_id', campanaId);
    if (!mantenerProductos) {
      await sb.from('productos').delete().eq('campana_id', campanaId);
      await sb.from('insumos').delete().eq('campana_id', campanaId);
    }
  }

  return {
    init,
    get campanaId() { return campanaId; },
    // productos
    listProductos, getProducto, createProducto, updateProducto, deleteProducto, duplicarProducto,
    // insumos y recetas
    listInsumos, getInsumo, createInsumo, updateInsumo, deleteInsumo, duplicarInsumo,
    getRecetaProducto, getRecetas, setRecetaProducto,
    // ventas
    listVentas, getVenta, createVenta, updateVenta, deleteVenta, duplicarVenta, cambiarEstadoVenta,
    // ingresos
    listIngresos, createIngreso, updateIngreso, deleteIngreso,
    // meta
    getMetaActiva, setMeta,
    // configuracion
    getConfiguracion, updateConfiguracion,
    // mensajes
    getMensaje, updateMensaje, resetMensaje,
    // backup
    exportarTodo, importarTodo, reiniciarDatos
  };
})();
