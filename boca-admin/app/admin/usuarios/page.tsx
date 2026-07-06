"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminRow = {
  user_id: string;
  nombre: string | null;
  email: string;
  created_at: string;
};

export default function UsuariosPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [miUserId, setMiUserId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [usarPassword, setUsarPassword] = useState(true);
  const [password, setPassword] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [quitandoId, setQuitandoId] = useState<string | null>(null);

  function generarPassword() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 14; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(pass);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMiUserId(data.user?.id ?? null);
    });
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "manage-admins",
      { body: { accion: "listar" } }
    );
    setLoading(false);

    if (fnError || !data?.ok) {
      setError(data?.message ?? "No se pudo cargar la lista de admins.");
      return;
    }
    setAdmins(data.admins as AdminRow[]);
  }

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!email.trim()) {
      setError("Ingresá un email.");
      return;
    }
    if (usarPassword && password.trim().length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setInvitando(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "manage-admins",
      {
        body: {
          accion: "invitar",
          email: email.trim(),
          nombre: nombre.trim() || null,
          password: usarPassword ? password : null,
        },
      }
    );
    setInvitando(false);

    if (fnError || !data?.ok) {
      setError(data?.message ?? "No se pudo invitar.");
      return;
    }

    setMensaje(data.message ?? `Listo, ${email} ya tiene acceso.`);
    setEmail("");
    setNombre("");
    setPassword("");
    cargar();
  }

  async function quitar(user_id: string) {
    setQuitandoId(null);
    setError("");
    setMensaje("");

    const { data, error: fnError } = await supabase.functions.invoke(
      "manage-admins",
      { body: { accion: "quitar", user_id_a_quitar: user_id } }
    );

    if (fnError || !data?.ok) {
      setError(data?.message ?? "No se pudo quitar el acceso.");
      return;
    }

    setMensaje("Acceso revocado.");
    setAdmins((prev) => prev.filter((a) => a.user_id !== user_id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-bombonera">Usuarios</h1>
        <p className="text-sm text-gray-500">
          Administrá quién tiene acceso a este panel. Invitar manda un email
          para que la persona configure su contraseña.
        </p>
      </div>

      <form
        onSubmit={invitar}
        className="bg-white border border-gray-200 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-bold text-gray-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@ejemplo.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bombonera"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-gray-500 mb-1">
              Nombre (opcional)
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Para identificarlo en la lista"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bombonera"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 mb-3">
          <input
            type="checkbox"
            checked={usarPassword}
            onChange={(e) => setUsarPassword(e.target.checked)}
          />
          Crear con contraseña directa (no requiere email configurado — se la
          compartís vos por otro medio)
        </label>

        {usarPassword && (
          <div className="flex gap-3 items-end mb-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Contraseña temporal
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-bombonera"
              />
            </div>
            <button
              type="button"
              onClick={generarPassword}
              className="text-xs font-bold text-bombonera border border-bombonera px-3 py-2 rounded-lg hover:bg-bombonera hover:text-white"
            >
              Generar
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={invitando}
          className="bg-bombonera text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-bombonera-deep disabled:opacity-60"
        >
          {invitando
            ? "Procesando..."
            : usarPassword
            ? "Crear acceso"
            : "Invitar por email"}
        </button>
      </form>

      {error && (
        <div className="mb-4 text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="mb-4 text-sm bg-green-50 text-green-700 px-3 py-2 rounded-lg">
          {mensaje}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Admin desde</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && admins.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay admins cargados.
                </td>
              </tr>
            )}
            {admins.map((a) => (
              <tr key={a.user_id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">
                  {a.email}
                  {a.user_id === miUserId && (
                    <span className="ml-2 text-xs font-bold text-bombonera bg-oro-soft px-2 py-0.5 rounded-full">
                      Vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{a.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(a.created_at).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {a.user_id === miUserId ? (
                    <span className="text-xs text-gray-300">—</span>
                  ) : quitandoId === a.user_id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => quitar(a.user_id)}
                        className="text-xs font-bold text-white bg-red-600 px-2 py-1.5 rounded-lg"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setQuitandoId(null)}
                        className="text-xs font-bold text-gray-500 px-2 py-1.5"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setQuitandoId(a.user_id)}
                      className="text-xs font-bold text-red-600 px-2 py-1.5"
                    >
                      Quitar acceso
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


