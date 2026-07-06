"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string;
  estado: string;
  categoria: string | null;
  pais: string | null;
  created_at: string;
};

function agrupar(items: Registro[], campo: "categoria" | "pais") {
  const conteo: Record<string, number> = {};
  items.forEach((r) => {
    const clave = r[campo]?.trim() || "Sin especificar";
    conteo[clave] = (conteo[clave] ?? 0) + 1;
  });
  return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
}

function generarSerieDiaria(items: Registro[], desde: Date, hasta: Date) {
  const dias: { fecha: string; label: string; total: number }[] = [];
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);

  // Tope de 60 días para que el gráfico no se vuelva ilegible
  let dias_restantes = 60;
  while (cursor <= fin && dias_restantes > 0) {
    const key = cursor.toISOString().slice(0, 10);
    dias.push({
      fecha: key,
      label: cursor.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      total: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
    dias_restantes--;
  }

  items.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    const dia = dias.find((d) => d.fecha === key);
    if (dia) dia.total += 1;
  });

  return dias;
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
        <div
          className="h-full bg-bombonera rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
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
    const { data, error } = await supabase
      .from("registros")
      .select("id, estado, categoria, pais, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRegistros(data as Registro[]);
    }
    setLoading(false);
  }

  // Opciones dinámicas de los selectores, según lo que realmente hay cargado
  const categoriasDisponibles = useMemo(
    () =>
      Array.from(
        new Set(registros.map((r) => r.categoria?.trim()).filter(Boolean))
      ).sort() as string[],
    [registros]
  );
  const paisesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(registros.map((r) => r.pais?.trim()).filter(Boolean))
      ).sort() as string[],
    [registros]
  );

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
      if (filtroCategoria !== "todas" && r.categoria !== filtroCategoria)
        return false;
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

  const porCategoria = useMemo(() => agrupar(filtrados, "categoria"), [filtrados]);
  const porPais = useMemo(() => agrupar(filtrados, "pais"), [filtrados]);

  const evolucion = useMemo(() => {
    const fin = hasta ? new Date(hasta) : new Date();
    const inicio = desde
      ? new Date(desde)
      : new Date(fin.getTime() - 13 * 24 * 60 * 60 * 1000); // últimos 14 días por default
    return generarSerieDiaria(filtrados, inicio, fin);
  }, [filtrados, desde, hasta]);

  const maxEvolucion = Math.max(1, ...evolucion.map((d) => d.total));
  const maxCategoria = Math.max(1, ...porCategoria.map(([, v]) => v));
  const maxPais = Math.max(1, ...porPais.map(([, v]) => v));

  function limpiarFiltros() {
    setFiltroEstado("todos");
    setFiltroCategoria("todas");
    setFiltroPais("todos");
    setDesde("");
    setHasta("");
  }

  const hayFiltrosActivos =
    filtroEstado !== "todos" ||
    filtroCategoria !== "todas" ||
    filtroPais !== "todos" ||
    desde !== "" ||
    hasta !== "";

  if (loading) {
    return <p className="text-gray-400">Cargando estadísticas...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-bombonera">Dashboard</h1>
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-xs font-bold text-bombonera underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            Estado
          </label>
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
          <label className="block text-xs font-bold text-gray-500 mb-1">
            Categoría
          </label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todas">Todas</option>
            {categoriasDisponibles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            País
          </label>
          <select
            value={filtroPais}
            onChange={(e) => setFiltroPais(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            {paisesDisponibles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
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
          <p className="text-xs text-gray-400">{pctValidados}% del total</p>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Evolución diaria */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-4">
            Altas por día {desde || hasta ? "(rango seleccionado)" : "(últimos 14 días)"}
          </h2>
          <div className="flex items-end gap-1.5 h-40 overflow-x-auto">
            {evolucion.map((d) => (
              <div
                key={d.fecha}
                className="flex-1 min-w-[8px] flex flex-col items-center justify-end gap-1"
              >
                <div
                  className="w-full bg-oro rounded-t"
                  style={{
                    height: `${Math.max(4, (d.total / maxEvolucion) * 100)}%`,
                  }}
                  title={`${d.label}: ${d.total}`}
                />
                <span className="text-[10px] text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por categoría */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-4">Por categoría</h2>
          {porCategoria.length === 0 && (
            <p className="text-sm text-gray-400">Sin datos para este filtro.</p>
          )}
          {porCategoria.map(([nombre, valor]) => (
            <BarraHorizontal
              key={nombre}
              label={nombre}
              valor={valor}
              max={maxCategoria}
            />
          ))}
        </div>

        {/* Por país */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-2">
          <h2 className="text-sm font-bold text-bombonera mb-4">Por país</h2>
          {porPais.length === 0 && (
            <p className="text-sm text-gray-400">Sin datos para este filtro.</p>
          )}
          <div className="grid md:grid-cols-2 gap-x-8">
            {porPais.map(([nombre, valor]) => (
              <BarraHorizontal
                key={nombre}
                label={nombre}
                valor={valor}
                max={maxPais}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
