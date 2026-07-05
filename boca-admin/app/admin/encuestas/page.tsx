"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Encuesta = {
  id: string;
  pregunta: string;
  activa: boolean;
  created_at: string;
};

type Opcion = {
  id: string;
  encuesta_id: string;
  texto: string;
  orden: number;
};

export default function EncuestasPage() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [opcionesForm, setOpcionesForm] = useState(["", ""]);

  const [verResultados, setVerResultados] = useState<Encuesta | null>(null);
  const [resultados, setResultados] = useState<
    { opcion: string; votos: number }[]
  >([]);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("encuestas")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setEncuestas(data as Encuesta[]);
    setLoading(false);
  }

  function actualizarOpcion(i: number, valor: string) {
    const nuevas = [...opcionesForm];
    nuevas[i] = valor;
    setOpcionesForm(nuevas);
  }

  function agregarOpcion() {
    setOpcionesForm([...opcionesForm, ""]);
  }

  async function crearEncuesta(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();

    const { data: nueva, error } = await supabase
      .from("encuestas")
      .insert([{ pregunta, activa: true, created_by: userData.user?.id }])
      .select()
      .single();

    if (error || !nueva) return;

    const opcionesValidas = opcionesForm
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    const filas = opcionesValidas.map((texto, i) => ({
      encuesta_id: nueva.id,
      texto,
      orden: i,
    }));

    if (filas.length > 0) {
      await supabase.from("encuesta_opciones").insert(filas);
    }

    setPregunta("");
    setOpcionesForm(["", ""]);
    setMostrarForm(false);
    cargar();
  }

  async function toggleActiva(enc: Encuesta) {
    await supabase
      .from("encuestas")
      .update({ activa: !enc.activa })
      .eq("id", enc.id);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta encuesta y sus respuestas?")) return;
    await supabase.from("encuestas").delete().eq("id", id);
    cargar();
  }

  async function abrirResultados(enc: Encuesta) {
    setVerResultados(enc);

    const { data: opciones } = await supabase
      .from("encuesta_opciones")
      .select("*")
      .eq("encuesta_id", enc.id)
      .order("orden");

    const { data: respuestas } = await supabase
      .from("encuesta_respuestas")
      .select("opcion_id")
      .eq("encuesta_id", enc.id);

    const conteo = (opciones || []).map((op: Opcion) => ({
      opcion: op.texto,
      votos: (respuestas || []).filter((r) => r.opcion_id === op.id).length,
    }));

    setResultados(conteo);
  }

  const totalVotos = resultados.reduce((acc, r) => acc + r.votos, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-bombonera">Encuestas</h1>
          <p className="text-sm text-gray-500">{encuestas.length} encuestas creadas</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-bombonera text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-bombonera-deep"
        >
          + Nueva encuesta
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={crearEncuesta}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6"
        >
          <div className="mb-3">
            <label className="block text-xs font-bold text-bombonera mb-1">
              Pregunta
            </label>
            <input
              required
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-bold text-bombonera mb-1">
              Opciones
            </label>
            {opcionesForm.map((op, i) => (
              <input
                key={i}
                value={op}
                onChange={(e) => actualizarOpcion(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
              />
            ))}
            <button
              type="button"
              onClick={agregarOpcion}
              className="text-xs font-bold text-bombonera hover:underline"
            >
              + Agregar otra opción
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="bg-bombonera text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              Crear encuesta
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-sm text-gray-500 px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading && <p className="text-gray-400 text-sm">Cargando...</p>}
        {!loading && encuestas.length === 0 && (
          <p className="text-gray-400 text-sm">Todavía no hay encuestas creadas.</p>
        )}
        {encuestas.map((enc) => (
          <div
            key={enc.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-bombonera">{enc.pregunta}</h3>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    enc.activa
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {enc.activa ? "Activa" : "Cerrada"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {new Date(enc.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => abrirResultados(enc)}
                className="text-xs font-bold text-bombonera hover:underline"
              >
                Ver resultados
              </button>
              <button
                onClick={() => toggleActiva(enc)}
                className="text-xs font-bold text-gray-600 hover:underline"
              >
                {enc.activa ? "Cerrar" : "Reabrir"}
              </button>
              <button
                onClick={() => eliminar(enc.id)}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {verResultados && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-bombonera mb-1">
              {verResultados.pregunta}
            </h3>
            <p className="text-xs text-gray-400 mb-4">{totalVotos} respuestas</p>
            <div className="space-y-3">
              {resultados.map((r, i) => {
                const pct =
                  totalVotos > 0 ? Math.round((r.votos / totalVotos) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{r.opcion}</span>
                      <span className="text-gray-500">
                        {r.votos} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-oro"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setVerResultados(null)}
              className="mt-5 w-full bg-bombonera text-white text-sm font-bold py-2 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
