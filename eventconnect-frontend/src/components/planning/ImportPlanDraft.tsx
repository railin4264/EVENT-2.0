"use client";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";
export function ImportPlanDraft({
  id,
  onApply,
}: {
  id: string;
  onApply: (fields: any) => void;
}) {
  const user = useAuthStore((s) => s.user),
    owner = user?._id || user?.id || "";
  return (
    <OwnedImport
      key={`${owner}:${id}`}
      id={id}
      owner={owner}
      onApply={onApply}
    />
  );
}
function OwnedImport({
  id,
  owner,
  onApply,
}: {
  id: string;
  owner: string;
  onApply: (fields: any) => void;
}) {
  const alive = useRef(true),
    [fields, setFields] = useState<any>(null),
    [error, setError] = useState(""),
    [applied, setApplied] = useState(false);
  useEffect(() => {
    alive.current = true;
    if (owner && /^[a-f\d]{24}$/i.test(id))
      apiClient
        .get(`/planning-tools/drafts/${id}`)
        .then((r) => {
          if (alive.current && r.data.success) setFields(r.data.data.fields);
        })
        .catch(() => {
          if (alive.current) setError("No se pudo abrir tu borrador privado.");
        });
    return () => {
      alive.current = false;
    };
  }, [id, owner]);
  return (
    <aside className="mx-auto my-5 max-w-4xl rounded-2xl border border-violet-400/40 bg-violet-500/10 p-5">
      <h2 className="font-semibold">Importar borrador privado</h2>
      <p className="mt-2 text-sm">
        {fields?.title ||
          "Tu borrador sólo está disponible en la cuenta que lo guardó."}{" "}
        Revisa la información antes de continuar. Aplicarlo reemplaza los campos
        coincidentes; no publica el evento ni elimina el borrador guardado.
      </p>
      {error && <p role="alert">{error}</p>}
      {fields && !applied && (
        <button
          type="button"
          className="mt-3 min-h-12 rounded-xl bg-violet-600 px-4 text-white"
          onClick={() => {
            if (
              !window.confirm(
                "¿Aplicar los campos de este borrador? Si tienes datos escritos, se reemplazarán sólo los campos coincidentes.",
              )
            )
              return;
            onApply(fields);
            setApplied(true);
          }}
        >
          Aplicar borrador revisado
        </button>
      )}
      {applied && (
        <p role="status" className="mt-3">
          Datos aplicados. Completa los campos obligatorios, ubicación real y
          horario antes de enviar a revisión.
        </p>
      )}
    </aside>
  );
}
