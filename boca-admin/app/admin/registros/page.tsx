"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string;
  nombre: string;
  dni: string;
  numero_socio: string | null;
  categoria: string | null;
  email: string;
  pais: string | null;
  telefono: string | null;
  estado: string;
  created_at: string;
};

export default function RegistrosPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRegistros(data as Registro[]);
    }
    setLoading(false);
  }

  const filtrados = registros.filter((r) => {
    const matchTexto =
      busqueda.trim() === "" ||
      r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.dni.includes(busqueda) ||
      r.email.toLowerCase().includes(busqueda.toLowerCase());

    const matchEstado = filtroEstado === "todos" || r.estado === filtroEstado;

    return matchTexto && matchEstado;
  });

  const totalValidados = registros.filter((r) => r.estado === "validado").length;
  const totalPendientes = registros.filter((r) => r.estado === "pendiente").length;

  function exportarCSV() {
    const encabezado = "nombre,dni,numero_socio,categoria,email,pais,telefono,estado,created_at\n";
    const filas = filtrados
      .map((r) =>
        [
          r.nombre,
          r.dni,
          r.numero_socio ?? "",
          r.categoria ?? "",
          r.email,
          r.pais ?? "",
          r.telefono ?? "",
          r.estado,
          r.created_at,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([encabezado + filas], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-bbb-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-bombonera">Registros</h1>
          <p className="text-sm text-gray-500">
            {registros.length} personas registradas · {totalValidados} validadas ·{" "}
            {totalPendientes} pendientes
          </p>
        </div>
        <button
          onClick={exportarCSV}
          className="bg-bombonera text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-bombonera-deep"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, DNI o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bombonera"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          <option value="validado">Validados</option>
          <option value="pendiente">Pendientes</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">DNI</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay registros que coincidan.
                </td>
              </tr>
            )}
            {filtrados.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{r.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{r.dni}</td>
                <td className="px-4 py-3 text-gray-600">
                  {r.categoria ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{r.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      r.estado === "validado"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(r.created_at).toLocaleDateString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
