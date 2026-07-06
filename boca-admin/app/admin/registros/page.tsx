"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Registro = {
  id: string;
  nombre: string;
  apellido: string | null;
  numero_socio: string | null;
  categoria: string | null;
  email: string;
  pais: string | null;
  telefono: string | null;
  estado: string;
  created_at: string;
};

const CAMPOS_EDITABLES: (keyof Registro)[] = [
  "nombre",
  "apellido",
  "numero_socio",
  "categoria",
  "email",
  "pais",
  "telefono",
  "estado",
];

export default function RegistrosPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Partial<Registro>>({});
  const [guardando, setGuardando] = useState(false);

  // Borrado
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("registros")
      .select(
        "id, nombre, apellido, numero_socio, categoria, email, pais, telefono, estado, created_at"
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRegistros(data as Registro[]);
    }
    setLoading(false);
  }

  const filtrados = registros.filter((r) => {
    const nombreCompleto = `${r.nombre} ${r.apellido ?? ""}`.toLowerCase();
    const matchTexto =
      busqueda.trim() === "" ||
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      r.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.numero_socio ?? "").includes(busqueda);

    const matchEstado = filtroEstado === "todos" || r.estado === filtroEstado;

    return matchTexto && matchEstado;
  });

  const totalValidados = registros.filter((r) => r.estado === "validado").length;
  const totalPendientes = registros.filter((r) => r.estado === "pendiente").length;
  const totalNoSocios = registros.filter((r) => r.estado === "no_socio").length;

  function exportarCSV() {
    const encabezado =
      "nombre,apellido,numero_socio,categoria,email,pais,telefono,estado,created_at\n";
    const filas = filtrados
      .map((r) =>
        [
          r.nombre,
          r.apellido ?? "",
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

  function estiloEstado(estado: string) {
    if (estado === "validado") return "bg-green-100 text-green-700";
    if (estado === "no_socio") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700"; // pendiente
  }

  function abrirEdicion(r: Registro) {
    setEditandoId(r.id);
    setBorrador({ ...r });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setBorrador({});
  }

  async function guardarEdicion() {
    if (!editandoId) return;
    setGuardando(true);

    const cambios: Record<string, unknown> = {};
    CAMPOS_EDITABLES.forEach((campo) => {
      cambios[campo] = borrador[campo] ?? null;
    });

    const { error } = await supabase
      .from("registros")
      .update(cambios)
      .eq("id", editandoId);

    setGuardando(false);

    if (error) {
      alert("No se pudo guardar: " + error.message);
      return;
    }

    setRegistros((prev) =>
      prev.map((r) => (r.id === editandoId ? { ...r, ...cambios } as Registro : r))
    );
    cancelarEdicion();
  }

  async function borrarRegistro(id: string) {
    setBorrandoId(id);
    const { error } = await supabase.from("registros").delete().eq("id", id);
    setBorrandoId(null);

    if (error) {
      alert("No se pudo borrar: " + error.message);
      return;
    }

    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-bombonera">Registros</h1>
          <p className="text-sm text-gray-500">
            {registros.length} personas registradas · {totalValidados} validadas ·{" "}
            {totalPendientes} pendientes · {totalNoSocios} no socios
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
          placeholder="Buscar por nombre, apellido, email o N° de socio..."
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
          <option value="no_socio">No socios</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Apellido</th>
              <th className="text-left px-4 py-3">N° Socio</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  No hay registros que coincidan.
                </td>
              </tr>
            )}
            {filtrados.map((r) => {
              const enEdicion = editandoId === r.id;
              return (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  {enEdicion ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          value={(borrador.nombre as string) ?? ""}
                          onChange={(e) =>
                            setBorrador((b) => ({ ...b, nombre: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          value={(borrador.apellido as string) ?? ""}
                          onChange={(e) =>
                            setBorrador((b) => ({ ...b, apellido: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          value={(borrador.numero_socio as string) ?? ""}
                          onChange={(e) =>
                            setBorrador((b) => ({ ...b, numero_socio: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          value={(borrador.categoria as string) ?? ""}
                          onChange={(e) =>
                            setBorrador((b) => ({ ...b, categoria: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          value={(borrador.email as string) ?? ""}
                          onChange={(e) =>
                            setBorrador((b) => ({ ...b, email: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          value={(borrador.estado as string) ?? "pendiente"}
                          onChange={(e) =>
                            setBorrador((b) => ({ ...b, estado: e.target.value }))
                          }
                        >
                          <option value="validado">validado</option>
                          <option value="pendiente">pendiente</option>
                          <option value="no_socio">no_socio</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">
                        {new Date(r.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={guardarEdicion}
                          disabled={guardando}
                          className="text-xs font-bold text-white bg-bombonera px-3 py-1.5 rounded-lg mr-2 disabled:opacity-60"
                        >
                          {guardando ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          className="text-xs font-bold text-gray-600 px-2 py-1.5"
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{r.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{r.apellido ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.numero_socio ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.categoria ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${estiloEstado(
                            r.estado
                          )}`}
                        >
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(r.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => abrirEdicion(r)}
                          className="text-xs font-bold text-bombonera px-2 py-1.5 mr-1"
                        >
                          Editar
                        </button>
                        {borrandoId === r.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              onClick={() => borrarRegistro(r.id)}
                              className="text-xs font-bold text-white bg-red-600 px-2 py-1.5 rounded-lg"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setBorrandoId(null)}
                              className="text-xs font-bold text-gray-500 px-2 py-1.5"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setBorrandoId(r.id)}
                            className="text-xs font-bold text-red-600 px-2 py-1.5"
                          >
                            Borrar
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
