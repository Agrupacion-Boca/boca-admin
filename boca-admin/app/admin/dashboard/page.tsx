"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  estado: string;
  categoria: string | null;
  pais: string | null;
  provincia: string | null;
  created_at: string;
};

const DEADLINE_ELECCION = new Date("2027-08-31");

function agrupar(items: Registro[], campo: "categoria" | "pais") {
  const conteo: Record<string, number> = {};
  items.forEach((r) => {
    const clave = r[campo]?.trim() || "Sin especificar";
    conteo[clave] = (conteo[clave] ?? 0) + 1;
  });
  return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
}

function agruparPorProvincia(items: Registro[]) {
  const porProvincia: Record<string, { total: number; validados: number }> = {};
  items.forEach((r) => {
    const clave = r.provincia?.trim() || "Sin especificar";
    if (!porProvincia[clave]) porProvincia[clave] = { total: 0, validados: 0 };
    porProvincia[clave].total += 1;
    if (r.estado === "validado") porProvincia[clave].validados += 1;
  });
  return Object.entries(porProvincia)
    .map(([provincia, datos]) => ({
      provincia,
      total: datos.total,
      validados: datos.validados,
      pct: datos.total === 0 ? 0 : Math.round((datos.validados / datos.total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

function generarSerieDiaria(items: Registro[], desde: Date, hasta: Date) {
  const dias: { fecha: string; label: string; total: number }[] = [];
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);

  let diasRestantes = 60;
  while (cursor <= fin && diasRestantes > 0) {
    const key = cursor.toISOString().slice(0, 10);
    dias.push({
      fecha: key,
      label: cursor.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      total: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
    diasRestantes--;
  }

  items.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    const dia = dias.find((d) => d.fecha === key);
    if (dia) dia.total += 1;
  });

  return dias;
}

// Curva acumulada de validados a lo largo de TODA la historia (sin
// importar filtros activos) — es lo relevante para trackear el
// progreso real hacia la meta electoral.
function generarAcumuladoValidados(todos: Registro[]) {
  const validadosOrdenados = todos
    .filter((r) => r.estado === "validado")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (validadosOrdenados.length === 0) return [];

  const porDia: Record<string, number> = {};
  validadosOrdenados.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    porDia[key] = (porDia[key] ?? 0) + 1;
  });

  const dias = Object.keys(porDia).sort();
  let acumulado = 0;
  return dias.map((fecha) => {
    acumulado += porDia[fecha];
    return {
      fecha,
      label: new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      acumulado,
    };
  });
}

function diasTranscurridos(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function BarraHorizontal({
  label,
  valor,
  max,
}: {
  label: string;
  valor: number;
  max: number;
}) {
  const pct = max === 0 ? 0 : Math.round((valor / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-bold">{valor}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-bombonera rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [totalPadron, setTotalPadron] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroPais, setFiltroPais] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [{ data: regs, error: regsError }, { data: total, error: totalError }] =
      await Promise.all([
        supabase
          .from("registros")
          .select("id, nombre, apellido, email, estado, categoria, pais, provincia, created_at")
          .order("created_at", { ascending: false }),
        supabase.rpc("contar_padron_total"),
      ]);

    if (!regsError && regs) setRegistros(regs as Registro[]);
    if (!totalError && typeof total === "number") setTotalPadron(total);
    setLoading(false);
  }

  const categoriasDisponibles = useMemo(
    () =>
      Array.from(new Set(registros.map((r) => r.categoria?.trim()).filter(Boolean))).sort() as string[],
    [registros]
  );
  const paisesDisponibles = useMemo(
    () => Array.from(new Set(registros.map((r) => r.pais?.trim()).filter(Boolean))).sort() as string[],
    [registros]
  );

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
      if (filtroCategoria !== "todas" && r.categoria !== filtroCategoria) return false;
      if (filtroPais !== "todos" && r.pais !== filtroPais) return false;
      if (desde && r.created_at.slice(0, 10) < desde) return false;
      if (hasta && r.created_at.slice(0, 10) > hasta) return false;
      return true;
    });
  }, [registros, filtroEstado, filtroCategoria, filtroPais, desde, hasta]);

  const total = filtrados.length;
  const validados = filtrados.filter((r) => r.estado === "validado").length;
  const pendientes = filtrados.filter((r) => r.estado === "pendiente").length;
  const noSocios = filtrados.filter((r) => r.estado === "no_socio").length;
  const pctValidados = total === 0 ? 0 : Math.round((validados / total) * 100);

  // Meta de comunidad: 10.000 registros totales (cualquier estado),
  // la misma que se comunica en la home pública.
  const META_COMUNIDAD = 10000;
  const totalGeneral = registros.length;
  const pctComunidad = Math.min(100, Math.round((totalGeneral / META_COMUNIDAD) * 100));
  const faltantesComunidad = Math.max(0, META_COMUNIDAD - totalGeneral);

  // Requisito legal: 10% del padrón electoral, solo cuenta validados reales
  const validadosTotales = registros.filter((r) => r.estado === "validado").length;
  const meta = totalPadron ? Math.ceil(totalPadron * 0.1) : null;
  const pctMeta = meta ? Math.min(100, Math.round((validadosTotales / meta) * 100)) : 0;
  const faltantes = meta ? Math.max(0, meta - validadosTotales) : null;
  const diasParaDeadline = Math.max(
    0,
    Math.ceil((DEADLINE_ELECCION.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const porCategoria = useMemo(() => agrupar(filtrados, "categoria"), [filtrados]);
  const porPais = useMemo(() => agrupar(filtrados, "pais"), [filtrados]);
  const porProvincia = useMemo(() => agruparPorProvincia(filtrados), [filtrados]);

  const evolucion = useMemo(() => {
    const fin = hasta ? new Date(hasta) : new Date();
    const inicio = desde ? new Date(desde) : new Date(fin.getTime() - 13 * 24 * 60 * 60 * 1000);
    return generarSerieDiaria(filtrados, inicio, fin);
  }, [filtrados, desde, hasta]);

  const acumulado = useMemo(() => generarAcumuladoValidados(registros), [registros]);

  const pendientesViejos = useMemo(() => {
    return registros
      .filter((r) => r.estado === "pendiente")
      .map((r) => ({ ...r, dias: diasTranscurridos(r.created_at) }))
      .sort((a, b) => b.dias - a.dias);
  }, [registros]);

  const maxEvolucion = Math.max(1, ...evolucion.map((d) => d.total));
  const maxAcumulado = Math.max(1, ...acumulado.map((d) => d.acumulado));
  const maxCategoria = Math.max(1, ...porCategoria.map(([, v]) => v));
  const maxPais = Math.max(1, ...porPais.map(([, v]) => v));
  const maxProvinciaTotal = Math.max(1, ...porProvincia.map((p) => p.total));

  function limpiarFiltros() {
    setFiltroEstado("todos");
    setFiltroCategoria("todas");
    setFiltroPais("todos");
    setDesde("");
    setHasta("");
  }

  const hayFiltrosActivos =
    filtroEstado !== "todos" || filtroCategoria !== "todas" || filtroPais !== "todos" || desde !== "" || hasta !== "";

  if (loading) {
    return <p className="text-gray-400">Cargando estadísticas...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-bombonera">Dashboard</h1>
        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros} className="text-xs font-bold text-bombonera underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Dos metas distintas: comunidad (10.000) y requisito legal (10% padrón) */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-bombonera rounded-xl p-5 text-white">
          <h2 className="text-sm font-bold text-oro mb-2">Meta de comunidad</h2>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-black">{totalGeneral.toLocaleString("es-AR")}</span>
            <span className="text-white/60 text-sm mb-1">
              / {META_COMUNIDAD.toLocaleString("es-AR")} (socios y no socios)
            </span>
          </div>
          <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-oro rounded-full" style={{ width: `${pctComunidad}%` }} />
          </div>
          <p className="text-xs text-white/60 mt-2">
            {pctComunidad}% de la meta · Faltan {faltantesComunidad.toLocaleString("es-AR")}
          </p>
        </div>

        <div className="bg-bombonera-deep rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-oro">Requisito legal: 10% del padrón</h2>
            <span className="text-xs text-white/60">{diasParaDeadline} días para el 31/08/2027</span>
          </div>
          {meta ? (
            <>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-black">{validadosTotales.toLocaleString("es-AR")}</span>
                <span className="text-white/60 text-sm mb-1">
                  / {meta.toLocaleString("es-AR")} validados (10% de {totalPadron?.toLocaleString("es-AR")})
                </span>
              </div>
              <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-oro rounded-full" style={{ width: `${pctMeta}%` }} />
              </div>
              <p className="text-xs text-white/60 mt-2">
                {pctMeta}% del requisito · Faltan {faltantes?.toLocaleString("es-AR")} validados
              </p>
            </>
          ) : (
            <p className="text-sm text-white/60">No se pudo calcular el total del padrón.</p>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="validado">Validado</option>
            <option value="pendiente">Pendiente</option>
            <option value="no_socio">No socio</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todas">Todas</option>
            {categoriasDisponibles.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">País</label>
          <select
            value={filtroPais}
            onChange={(e) => setFiltroPais(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            {paisesDisponibles.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total</p>
          <p className="text-3xl font-black text-bombonera">{total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Validados</p>
          <p className="text-3xl font-black text-green-600">{validados}</p>
          <p className="text-xs text-gray-400">{pctValidados}% del total filtrado</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pendientes</p>
          <p className="text-3xl font-black text-yellow-600">{pendientes}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">No socios</p>
          <p className="text-3xl font-black text-red-600">{noSocios}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Altas por día (filtrado) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-4">
            Altas por día {desde || hasta ? "(rango seleccionado)" : "(últimos 14 días)"}
          </h2>
          <div className="flex items-end gap-1.5 h-40 overflow-x-auto">
            {evolucion.map((d) => (
              <div key={d.fecha} className="flex-1 min-w-[8px] flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full bg-oro rounded-t"
                  style={{ height: `${Math.max(4, (d.total / maxEvolucion) * 100)}%` }}
                  title={`${d.label}: ${d.total}`}
                />
                <span className="text-[10px] text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crecimiento acumulado de validados (histórico completo, sin filtros) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-1">Crecimiento acumulado de validados</h2>
          <p className="text-xs text-gray-400 mb-3">Histórico completo, no se ve afectado por los filtros</p>
          {acumulado.length === 0 ? (
            <p className="text-sm text-gray-400">Todavía no hay socios validados.</p>
          ) : (
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {acumulado.map((d) => (
                <div key={d.fecha} className="flex-1 min-w-[6px] flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full bg-bombonera rounded-t"
                    style={{ height: `${Math.max(4, (d.acumulado / maxAcumulado) * 100)}%` }}
                    title={`${d.label}: ${d.acumulado} acumulados`}
                  />
                </div>
              ))}
            </div>
          )}
          {acumulado.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Último valor: {acumulado[acumulado.length - 1].acumulado} validados acumulados
            </p>
          )}
        </div>

        {/* Por categoría */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-4">Por categoría</h2>
          {porCategoria.length === 0 && <p className="text-sm text-gray-400">Sin datos para este filtro.</p>}
          {porCategoria.map(([nombre, valor]) => (
            <BarraHorizontal key={nombre} label={nombre} valor={valor} max={maxCategoria} />
          ))}
        </div>

        {/* Por país */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-4">Por país</h2>
          {porPais.length === 0 && <p className="text-sm text-gray-400">Sin datos para este filtro.</p>}
          {porPais.map(([nombre, valor]) => (
            <BarraHorizontal key={nombre} label={nombre} valor={valor} max={maxPais} />
          ))}
        </div>

        {/* Tasa de validación por provincia */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-2">
          <h2 className="text-sm font-bold text-bombonera mb-4">Tasa de validación por provincia</h2>
          {porProvincia.length === 0 && <p className="text-sm text-gray-400">Sin datos para este filtro.</p>}
          <div className="grid md:grid-cols-2 gap-x-8">
            {porProvincia.map((p) => (
              <div key={p.provincia} className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{p.provincia}</span>
                  <span className="font-bold">
                    {p.validados}/{p.total} · {p.pct}% validado
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(p.validados / maxProvinciaTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-gray-300"
                    style={{ width: `${((p.total - p.validados) / maxProvinciaTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de pendientes viejos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-2">
          <h2 className="text-sm font-bold text-bombonera mb-1">
            Pendientes sin revisar ({pendientesViejos.length})
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Ordenados por antigüedad — revisalos en la sección Registros
          </p>
          {pendientesViejos.length === 0 ? (
            <p className="text-sm text-gray-400">No hay pendientes sin revisar. 🎉</p>
          ) : (
            <div className="space-y-2">
              {pendientesViejos.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm border-b border-gray-100 pb-2"
                >
                  <div>
                    <span className="font-medium">{r.nombre} {r.apellido ?? ""}</span>
                    <span className="text-gray-400 text-xs ml-2">{r.email}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      r.dias >= 7
                        ? "bg-red-100 text-red-700"
                        : r.dias >= 3
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.dias === 0 ? "Hoy" : `${r.dias} día${r.dias === 1 ? "" : "s"}`}
                  </span>
                </div>
              ))}
              {pendientesViejos.length > 10 && (
                <p className="text-xs text-gray-400 pt-1">
                  y {pendientesViejos.length - 10} más...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
