"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Noticia = {
  id: string;
  titulo: string;
  cuerpo: string;
  publicado: boolean;
  created_at: string;
};

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("noticias")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setNoticias(data as Noticia[]);
    setLoading(false);
  }

  function nuevaNoticia() {
    setEditando({
      id: "",
      titulo: "",
      cuerpo: "",
      publicado: false,
      created_at: "",
    });
    setMostrarForm(true);
  }

  function editarNoticia(n: Noticia) {
    setEditando(n);
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;

    if (editando.id) {
      await supabase
        .from("noticias")
        .update({
          titulo: editando.titulo,
          cuerpo: editando.cuerpo,
          publicado: editando.publicado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editando.id);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("noticias").insert([
        {
          titulo: editando.titulo,
          cuerpo: editando.cuerpo,
          publicado: editando.publicado,
          created_by: userData.user?.id,
        },
      ]);
    }

    setMostrarForm(false);
    setEditando(null);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta noticia? No se puede deshacer.")) return;
    await supabase.from("noticias").delete().eq("id", id);
    cargar();
  }

  async function togglePublicado(n: Noticia) {
    await supabase
      .from("noticias")
      .update({ publicado: !n.publicado })
      .eq("id", n.id);
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-bombonera">Noticias</h1>
          <p className="text-sm text-gray-500">{noticias.length} noticias cargadas</p>
        </div>
        <button
          onClick={nuevaNoticia}
          className="bg-bombonera text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-bombonera-deep"
        >
          + Nueva noticia
        </button>
      </div>

      {mostrarForm && editando && (
        <form
          onSubmit={guardar}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6"
        >
          <div className="mb-3">
            <label className="block text-xs font-bold text-bombonera mb-1">
              Título
            </label>
            <input
              required
              value={editando.titulo}
              onChange={(e) =>
                setEditando({ ...editando, titulo: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-bold text-bombonera mb-1">
              Cuerpo
            </label>
            <textarea
              required
              rows={5}
              value={editando.cuerpo}
              onChange={(e) =>
                setEditando({ ...editando, cuerpo: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="publicado"
              checked={editando.publicado}
              onChange={(e) =>
                setEditando({ ...editando, publicado: e.target.checked })
              }
            />
            <label htmlFor="publicado" className="text-sm text-gray-600">
              Publicar ya (visible en el sitio público)
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-bombonera text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setEditando(null);
              }}
              className="text-sm text-gray-500 px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading && <p className="text-gray-400 text-sm">Cargando...</p>}
        {!loading && noticias.length === 0 && (
          <p className="text-gray-400 text-sm">Todavía no hay noticias cargadas.</p>
        )}
        {noticias.map((n) => (
          <div
            key={n.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-bombonera">{n.titulo}</h3>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    n.publicado
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {n.publicado ? "Publicada" : "Borrador"}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{n.cuerpo}</p>
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={() => togglePublicado(n)}
                className="text-xs font-bold text-bombonera hover:underline"
              >
                {n.publicado ? "Despublicar" : "Publicar"}
              </button>
              <button
                onClick={() => editarNoticia(n)}
                className="text-xs font-bold text-gray-600 hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => eliminar(n.id)}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
