"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ResultadoPadron = {
  nombre: string;
  apellido: string;
  numero_socio: string;
  categoria: string | null;
  provincia: string | null;
  domicilio: string | null;
  localidad: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  cuota_al_dia: boolean | null;
};

const POR_PAGINA = 50;

export default function PadronPage() {
  const [query, setQuery] = useState("");
  const [queryActiva, setQueryActiva] = useState("");
  const [resultados, setResultados] = useState<ResultadoPadron[]>([]);
  const [totalResultados, setTotalResultados] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [buscoAlMenosUnaVez, setBuscoAlMenosUnaVez] = useState(false);

  const totalPaginas = Math.max(1, Math.ceil(totalResultados / POR_PAGINA));

  async function ejecutarBusqueda(consulta: string, paginaDestino: number) {
    setBuscando(true);
    setError("");

    const desplazamiento = (paginaDestino - 1) * POR_PAGINA;

    const [{ data, error: rpcError }, { data: total, error: totalError }] =
      await Promise.all([
        supabase.rpc("buscar_padron", {
          query: consulta,
          limite: POR_PAGINA,
          desplazamiento,
        }),
        supabase.rpc("contar_resultados_padron", { query: consulta }),
      ]);

    setBuscando(false);
    setBuscoAlMenosUnaVez(true);

    if (rpcError || totalError) {
      setError(rpcError?.message ?? totalError?.message ?? "Error al buscar.");
      setResultados([]);
      setTotalResultados(0);
      return;
    }

    setResultados((data as ResultadoPadron[]) ?? []);
    setTotalResultados(typeof total === "number" ? total : 0);
    setPagina(paginaDestino);
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();

    if (query.trim().length < 3) {
      setError("Ingresá al menos 3 caracteres para buscar.");
      return;
    }

    setQueryActiva(query.trim());
    await ejecutarBusqueda(query.trim(), 1);
  }

  function irAPagina(nueva: number) {
    if (nueva < 1 || nueva > totalPaginas) return;
    ejecutarBusqueda(queryActiva, nueva);
  }

  const desdeMostrado = totalResultados === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hastaMostrado = Math.min(pagina * POR_PAGINA, totalResultados);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-bombonera">Padrón</h1>
        <p className="text-sm text-gray-500">
          Búsqueda por nombre, apellido o número de socio.
        </p>
      </div>

      <form onSubmit={buscar} className="flex gap-3 mb-4">
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

      {buscoAlMenosUnaVez && !error && totalResultados > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          Mostrando {desdeMostrado}–{hastaMostrado} de {totalResultados.toLocaleString("es-AR")}{" "}
          resultados
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Apellido</th>
              <th className="text-left px-4 py-3">N° Socio</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Provincia</th>
              <th className="text-left px-4 py-3">Domicilio</th>
              <th className="text-left px-4 py-3">Localidad</th>
              <th className="text-left px-4 py-3">Teléfono</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Cuota al día</th>
            </tr>
          </thead>
          <tbody>
            {!buscoAlMenosUnaVez && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-400">
                  Escribí algo y buscá para ver resultados.
                </td>
              </tr>
            )}
            {buscoAlMenosUnaVez && resultados.length === 0 && !error && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-400">
                  No se encontraron socios que coincidan.
                </td>
              </tr>
            )}
            {resultados.map((r, i) => (
              <tr key={`${r.numero_socio}-${i}`} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{r.nombre}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.apellido}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.numero_socio}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.provincia ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.domicilio ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.localidad ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {r.telefono ?? r.celular ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.email ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
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

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => irAPagina(1)}
            disabled={pagina === 1 || buscando}
            className="text-xs font-bold text-bombonera px-2 py-1.5 disabled:opacity-30"
          >
            « Primera
          </button>
          <button
            onClick={() => irAPagina(pagina - 1)}
            disabled={pagina === 1 || buscando}
            className="text-xs font-bold text-bombonera px-2 py-1.5 disabled:opacity-30"
          >
            ‹ Anterior
          </button>
          <span className="text-xs text-gray-500 px-3">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => irAPagina(pagina + 1)}
            disabled={pagina === totalPaginas || buscando}
            className="text-xs font-bold text-bombonera px-2 py-1.5 disabled:opacity-30"
          >
            Siguiente ›
          </button>
          <button
            onClick={() => irAPagina(totalPaginas)}
            disabled={pagina === totalPaginas || buscando}
            className="text-xs font-bold text-bombonera px-2 py-1.5 disabled:opacity-30"
          >
            Última »
          </button>
        </div>
      )}
    </div>
  );
}


