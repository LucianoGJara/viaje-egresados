/**
 * stats.js
 * Cálculos agregados compartidos entre Inicio, Meta del viaje y Estadísticas.
 * Centralizarlos acá evita que cada pantalla calcule las cosas "a su manera".
 *
 * Criterio financiero usado en toda la app:
 *   - "Total facturado"   = suma del precio de TODAS las ventas (pagadas + pendientes).
 *   - "Ganancia total"    = suma de la ganancia de TODAS las ventas (pagadas + pendientes).
 *   - "Dinero acumulado"  = lo que realmente ya se puede destinar al viaje:
 *                           ganancia de las ventas YA PAGADAS + ingresos extras.
 *                           (el costo de los insumos no es ahorro: solo la ganancia lo es)
 *   - "Dinero pendiente de cobro" = precio total de las ventas marcadas "pendiente"
 *                           (lo que todavía falta cobrarles a los compradores).
 */

const Stats = (() => {
  function sum(arr, field) {
    return Utils.round2(arr.reduce((acc, item) => acc + (Number(item[field]) || 0), 0));
  }

  function compute(ventas, ingresos, metaMonto) {
    const pagadas = ventas.filter((v) => v.estado === 'pagado');
    const pendientes = ventas.filter((v) => v.estado === 'pendiente');

    const totalFacturado = sum(ventas, 'precio_total');
    const gananciaTotal = sum(ventas, 'ganancia_total');
    const gananciaPagada = sum(pagadas, 'ganancia_total');
    const ingresosExtrasTotal = sum(ingresos, 'monto');
    const dineroPendienteCobro = sum(pendientes, 'precio_total');

    const dineroAcumulado = Utils.round2(gananciaPagada + ingresosExtrasTotal);
    const dineroFaltante = Math.max(0, Utils.round2(metaMonto - dineroAcumulado));
    const porcentaje = metaMonto > 0 ? Utils.round2((dineroAcumulado / metaMonto) * 100) : 0;

    const compradoresSet = new Set(
      ventas.map((v) => `${(v.comprador_nombre || '').trim().toLowerCase()}|${(v.telefono || '').trim()}`)
    );

    const porProducto = {};
    ventas.forEach((v) => {
      const key = v.producto_nombre || 'Sin producto';
      if (!porProducto[key]) porProducto[key] = { nombre: key, cantidad: 0, facturado: 0, ganancia: 0 };
      porProducto[key].cantidad += Number(v.cantidad) || 0;
      porProducto[key].facturado += Number(v.precio_total) || 0;
      porProducto[key].ganancia += Number(v.ganancia_total) || 0;
    });
    const ranking = Object.values(porProducto).sort((a, b) => b.cantidad - a.cantidad);
    const productoMasVendido = ranking[0] || null;
    const productoMenosVendido = ranking.length ? ranking[ranking.length - 1] : null;

    const ultimaVenta = [...ventas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;

    const ticketPromedio = ventas.length > 0 ? Utils.round2(totalFacturado / ventas.length) : 0;

    return {
      totalFacturado, gananciaTotal, gananciaPagada, ingresosExtrasTotal, dineroPendienteCobro,
      dineroAcumulado, dineroFaltante, porcentaje,
      cantidadCompradores: compradoresSet.size,
      cantidadVentas: ventas.length,
      productoMasVendido, productoMenosVendido, ranking,
      ultimaVenta, ticketPromedio
    };
  }

  function agruparPorFecha(ventas, granularidad = 'day') {
    const grupos = {};
    ventas.forEach((v) => {
      const d = new Date(`${v.fecha}T00:00:00`);
      let key;
      if (granularidad === 'day') {
        key = v.fecha;
      } else if (granularidad === 'week') {
        const first = new Date(d);
        const day = (first.getDay() + 6) % 7; // lunes = 0
        first.setDate(first.getDate() - day);
        key = first.toISOString().slice(0, 10);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!grupos[key]) grupos[key] = { key, cantidad: 0, facturado: 0, ganancia: 0 };
      grupos[key].cantidad += Number(v.cantidad) || 0;
      grupos[key].facturado += Number(v.precio_total) || 0;
      grupos[key].ganancia += Number(v.ganancia_total) || 0;
    });
    return Object.values(grupos).sort((a, b) => a.key.localeCompare(b.key));
  }

  // Proyección: cuántas unidades faltan vender de cada producto para llegar a la meta,
  // asumiendo (hipotéticamente) que TODO lo faltante se cubre solo con ese producto.
  function proyeccion(productos, dineroFaltante) {
    return productos
      .filter((p) => p.activo && Number(p.ganancia) > 0)
      .map((p) => ({
        producto: p,
        unidadesFaltantes: Math.ceil(dineroFaltante / Number(p.ganancia))
      }));
  }

  return { compute, agruparPorFecha, proyeccion, sum };
})();
