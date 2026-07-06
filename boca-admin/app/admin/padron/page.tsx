"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ResultadoPadron = {
  nombre: string;
  apellido: string;
  numero_socio: string;
  categoria: string | null;
  provincia: string | null;
  email: string | null;
  cuota_al_dia: boolean | null;
};

export default function PadronPage() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoPadron[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [buscoAlMenosUnaVez, setBuscoAlMenosUnaVez] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (query.trim().length < 3) {
      setError("Ingresá al menos 3 caracteres para buscar.");
      return;
    }

    setBuscando(true);
    const { data, error: rpcError } = await supabase.rpc("buscar_padron", {
      query: query.trim(),
      limite: 100,
    });
    setBuscando(false);
    setBuscoAlMenosUnaVez(true);

    if (rpcError) {
      setError(rpcError.message);
      setResultados([]);
      return;
    }

    setResultados((data as ResultadoPadron[]) ?? []);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-bombonera">Padrón</h1>
        <p className="text-sm text-gray-500">
          Búsqueda por nombre, apellido o número de socio. Solo se muestran
          campos no sensibles (sin domicilio, teléfono ni email).
        </p>
      </div>

      <form onSubmit={buscar} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o N° de socio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bombonera"
        />
        <button
          type="submit"
          disabled={buscando}
          className="bg-bombonera text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-bombonera-deep disabled:opacity-60"
        >
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && (
        <div className="mb-4 text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Apellido</th>
              <th className="text-left px-4 py-3">N° Socio</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Provincia</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Cuota al día</th>
            </tr>
          </thead>
          <tbody>
            {!buscoAlMenosUnaVez && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Escribí algo y buscá para ver resultados.
                </td>
              </tr>
            )}
            {buscoAlMenosUnaVez && resultados.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No se encontraron socios que coincidan.
                </td>
              </tr>
            )}
            {resultados.map((r, i) => (
              <tr key={`${r.numero_socio}-${i}`} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{r.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{r.apellido}</td>
                <td className="px-4 py-3 text-gray-600">{r.numero_socio}</td>
                <td className="px-4 py-3 text-gray-600">{r.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{r.provincia ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{r.email ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.cuota_al_dia === null ? (
                    "—"
                  ) : r.cuota_al_dia ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Al día
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                      Deudor
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultados.length === 100 && (
        <p className="text-xs text-gray-400 mt-2">
          Se muestran los primeros 100 resultados — refiná la búsqueda si no
          encontrás lo que buscás.
        </p>
      )}
    </div>
  );
}

