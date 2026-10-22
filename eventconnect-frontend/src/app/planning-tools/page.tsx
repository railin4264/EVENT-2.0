"use client";
import Link from "next/link";
import { ArrowLeft, Clock3, MessageSquareText, LockKeyhole } from "lucide-react";
import {GlobalPlanningWindow} from "@/components/planning/global-planning-window";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";
type Fields = {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  timeZone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  amount?: number;
};
type Draft = { _id: string; fields: Fields };
const labels: Record<string, string> = {
  title: "Título",
  description: "Descripción",
  date: "Fecha (AAAA-MM-DD)",
  time: "Hora (24 horas)",
  timeZone: "Zona horaria IANA",
  address: "Dirección",
  city: "Ciudad",
  country: "País",
  currency: "Moneda (DOP, USD, EUR o MXN)",
  amount: "Precio",
};
export default function PlanningTools() {
  const user = useAuthStore((s) => s.user);
  const owner = user?._id || user?.id || "";
  return <Tools key={owner} owner={owner} />;
}
function Tools({ owner }: { owner: string }) {
  const alive = useRef(true),
    lock = useRef(false);
  const [text, setText] = useState(""),
    [fields, setFields] = useState<Fields>({}),
    [warnings, setWarnings] = useState<string[]>([]),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (owner)
      apiClient
        .get("/planning-tools/drafts")
        .then((r) => {
          if (alive.current && r.data.success) setDrafts(r.data.data);
        })
        .catch(() => {
          if (alive.current)
            setError(
              "No se pudieron cargar tus borradores. Puedes reintentar al guardar.",
            );
        });
  }, [owner]);
  async function run(action: () => Promise<void>) {
    if (!alive.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
    } catch (e: any) {
      if (alive.current)
        setError(
          e.response?.data?.message || e.message || "No se pudo completar.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const input =
    "mt-2 min-h-12 min-w-0 w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  async function save() {
    await run(async () => {
      const r = selected
        ? await apiClient.put(`/planning-tools/drafts/${selected}`, { fields })
        : await apiClient.post("/planning-tools/drafts", { fields });
      if (!r.data.success) throw Error("No se guardó.");
      if (!alive.current) return;
      const d = r.data.data;
      setSelected(d._id);
      setDrafts((old) => [d, ...old.filter((v) => v._id !== d._id)]);
      setSuccess("Borrador privado guardado. Aún no es un evento publicado.");
    });
  }
  return (
    <div className="mx-auto max-w-[1360px] px-5 py-7 text-foreground sm:px-8 sm:py-10">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"><ArrowLeft size={16} aria-hidden="true" /> Volver a descubrir</Link>
      <header className="max-w-3xl pb-8 pt-6 sm:pb-10">
        <p className="text-sm font-medium text-primary">Haz que el plan encaje contigo</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">Tu tiempo libre.<br className="hidden sm:block" /> Tu próximo buen plan.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Busca una actividad para el rato que tienes o convierte ese mensaje del grupo en un borrador de evento.</p>
      </header>
      <nav aria-label="Herramientas para planificar" className="mb-7 flex flex-wrap gap-3">
        <a href="#planifica-tu-tiempo" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"><Clock3 size={17} aria-hidden="true" /> Encontrar un plan</a>
        <a href="#preparar-borrador" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"><MessageSquareText size={17} aria-hidden="true" /> Preparar una idea</a>
      </nav>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <GlobalPlanningWindow />
      <section id="preparar-borrador" aria-labelledby="draft-title" className="min-w-0 scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageSquareText size={21} aria-hidden="true" /></div>
        <h2 id="draft-title" className="text-2xl font-semibold tracking-tight">De conversación a borrador</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Pega tu propuesta, revisa los datos y guárdala en privado. Tú decides cuándo convertirla en un evento.</p>
        <details className="mt-4 rounded-xl bg-muted/50 px-4 py-1 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium">¿Qué datos puede reconocer?</summary><p className="pb-3 text-sm leading-6 text-muted-foreground">Datos explícitos: Título:, Fecha: AAAA-MM-DD, Hora: HH:mm, Zona horaria: America/Santo_Domingo, Dirección:, Ciudad:, País: y Precio: DOP 500. Revisa cada campo antes de guardar.</p></details>
        <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><p>Sólo recibimos lo que tú pegues. No leemos tus chats ni tu portapapeles automáticamente. El texto original no se guarda.</p></div>
        {!owner ? (
          <Link
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
            href="/login?redirect=%2Fplanning-tools"
          >
            Entrar para crear borradores privados
          </Link>
        ) : (
          <>
            <label className="mt-5 block">
              Mensaje para revisar
              <textarea
                className={input}
                value={text}
                maxLength={6000}
                rows={5}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button
              disabled={busy || !text.trim()}
              className="mt-3 min-h-12 rounded-xl border border-border px-5"
              onClick={() =>
                void run(async () => {
                  if (
                    Object.keys(fields).length &&
                    !window.confirm(
                      "¿Reemplazar los campos que estás editando? El borrador guardado permanece.",
                    )
                  )
                    return;
                  const r = await apiClient.post("/planning-tools/parse", {
                    text,
                  });
                  if (!r.data.success) throw Error("No se pudo preparar.");
                  if (alive.current) {
                    setFields(r.data.data.fields);
                    setWarnings(r.data.data.warnings);
                    setSelected("");
                    setText("");
                  }
                })
              }
            >
              Preparar campos para revisar
            </button>
            <ul className="mt-4 space-y-2 text-sm text-amber-600">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {Object.entries(labels).map(([key, label]) => (
                <label key={key} className="min-w-0 text-sm font-medium">
                  {label}
                  <input
                    className={input}
                    aria-label={label}
                    value={(fields as any)[key] ?? ""}
                    onChange={(e) =>
                      setFields((old) => ({
                        ...old,
                        [key]:
                          key === "amount"
                            ? e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-4">
              <button
                disabled={busy}
                onClick={() => void save()}
                className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
              >
                Guardar borrador privado
              </button>
              {selected && (
                <Link
                  href={`/events/create?draft=${selected}`}
                  className="flex min-h-12 items-center rounded-xl border border-border px-5"
                >
                  Revisar en creación de evento →
                </Link>
              )}
            </div>
            <h3 className="mt-8 text-lg font-semibold">Mis borradores</h3>
            {drafts.map((d) => (
              <div
                key={d._id}
                className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
              >
                <span className="mr-auto">
                  {d.fields.title || "Sin título"}
                </span>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      Object.keys(fields).length &&
                      !window.confirm(
                        "¿Abrir este borrador y reemplazar los campos de edición actuales?",
                      )
                    )
                      return;
                    setFields(d.fields);
                    setSelected(d._id);
                    setWarnings([]);
                  }}
                  className="min-h-11 px-3 text-primary"
                >
                  Editar
                </button>
                <button
                  disabled={busy}
                  className="min-h-11 px-3 text-red-500"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "¿Eliminar permanentemente este borrador privado?",
                      )
                    )
                      return;
                    void run(async () => {
                      const r = await apiClient.delete(
                        `/planning-tools/drafts/${d._id}`,
                      );
                      if (!r.data.success) throw Error("No se eliminó.");
                      if (alive.current) {
                        setDrafts((old) => old.filter((v) => v._id !== d._id));
                        if (selected === d._id) {
                          setSelected("");
                          setFields({});
                        }
                      }
                    });
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </>
        )}
      </section>
      </div>
      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          {success}
        </p>
      )}
    </div>
  );
}
