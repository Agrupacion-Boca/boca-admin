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

function ultimosNDias(items: Registro[], n: number) {
  const hoy = new Date();
  const dias: { fecha: string; label: string; total: number }[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dias.push({
      fecha: key,
      label: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      total: 0,
    });
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

  const total = registros.length;
  const validados = registros.filter((r) => r.estado === "validado").length;
  const pendientes = registros.filter((r) => r.estado === "pendiente").length;
  const noSocios = registros.filter((r) => r.estado === "no_socio").length;
  const pctValidados = total === 0 ? 0 : Math.round((validados / total) * 100);

  const porCategoria = useMemo(() => agrupar(registros, "categoria"), [registros]);
  const porPais = useMemo(() => agrupar(registros, "pais"), [registros]);
  const evolucion = useMemo(() => ultimosNDias(registros, 14), [registros]);
  const maxEvolucion = Math.max(1, ...evolucion.map((d) => d.total));
  const maxCategoria = Math.max(1, ...porCategoria.map(([, v]) => v));
  const maxPais = Math.max(1, ...porPais.map(([, v]) => v));

  if (loading) {
    return <p className="text-gray-400">Cargando estadísticas...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-bombonera mb-6">Dashboard</h1>

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
            Altas por día (últimos 14 días)
          </h2>
          <div className="flex items-end gap-1.5 h-40">
            {evolucion.map((d) => (
              <div
                key={d.fecha}
                className="flex-1 flex flex-col items-center justify-end gap-1"
              >
                <div
                  className="w-full bg-oro rounded-t"
                  style={{
                    height: `${Math.max(4, (d.total / maxEvolucion) * 100)}%`,
                  }}
                  title={`${d.label}: ${d.total}`}
                />
                <span className="text-[10px] text-gray-400 rotate-0">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Por categoría */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-bombonera mb-4">Por categoría</h2>
          {porCategoria.length === 0 && (
            <p className="text-sm text-gray-400">Sin datos todavía.</p>
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
            <p className="text-sm text-gray-400">Sin datos todavía.</p>
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
