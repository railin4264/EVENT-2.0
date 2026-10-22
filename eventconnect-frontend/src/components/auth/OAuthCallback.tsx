"use client";

import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { oauthService } from "@/lib/api/oauth";
import { consumeOAuthIntent } from "@/lib/auth/oauth-state";

type Outcome = { redirect: string; tempToken?: string };

export default function OAuthCallback() {
  const params = useParams<{ provider: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const { loginOAuth, login, validateToken, isAuthenticated } = useAuthStore();
  const attempt = useRef<Promise<Outcome> | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    // React StrictMode subscribes again to the same request, without consuming
    // the one-use state or exchanging an authorization code a second time.
    if (!attempt.current)
      attempt.current = (async () => {
        const provider = params.provider;
        const state = query.get("state");
        const authorizationCode = query.get("code");
        const denied = query.has("error");
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname,
        );
        if (provider !== "google" && provider !== "facebook")
          throw new Error("Este proveedor no está disponible.");
        const intent = consumeOAuthIntent(provider, state);
        if (denied)
          throw new Error(
            "Cancelaste el acceso. Puedes intentarlo de nuevo o usar tu correo.",
          );
        if (!authorizationCode || !state)
          throw new Error(
            "La respuesta está incompleta. Vuelve a iniciar sesión.",
          );
        if (intent.mode === "link") {
          if (!isAuthenticated)
            throw new Error("Inicia sesión antes de conectar otra cuenta.");
          await oauthService.linkAccount(provider, authorizationCode, state);
          await validateToken();
          return { redirect: intent.redirect };
        }
        try {
          await loginOAuth(provider, authorizationCode, state);
          return { redirect: intent.redirect };
        } catch (failure: unknown) {
          const challenge = failure as {
            requiresTwoFactor?: boolean;
            tempToken?: string;
          };
          if (challenge.requiresTwoFactor && challenge.tempToken)
            return {
              redirect: intent.redirect,
              tempToken: challenge.tempToken,
            };
          throw failure;
        }
      })();
    attempt.current
      .then((result) => {
        if (!active) return;
        if (result.tempToken) setOutcome(result);
        else router.replace(result.redirect);
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo completar el acceso. Inténtalo otra vez.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    params.provider,
    query,
    router,
    loginOAuth,
    validateToken,
    isAuthenticated,
  ]);

  async function verifySecondFactor(event: FormEvent) {
    event.preventDefault();
    if (!outcome?.tempToken || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await login({
        email: "",
        password: "",
        tempToken: outcome.tempToken,
        code,
      });
      router.replace(outcome.redirect);
    } catch {
      setError(
        "No se pudo validar el código. Revisa tu autenticador o vuelve a iniciar sesión si la solicitud venció.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="flex min-h-[75vh] items-center justify-center px-5 py-16"
      aria-labelledby="oauth-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <ShieldCheck className="mb-5 h-9 w-9 text-primary" aria-hidden="true" />
        <h1 id="oauth-title" className="text-2xl font-semibold tracking-tight">
          {outcome?.tempToken
            ? "Un paso más para entrar"
            : error
              ? "No pudimos completar el acceso"
              : "Entrando a EventNow"}
        </h1>
        {outcome?.tempToken ? (
          <form onSubmit={verifySecondFactor} className="mt-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu cuenta tiene verificación en dos pasos. Introduce el código de
              tu aplicación de autenticación.
            </p>
            <label className="block text-sm font-medium" htmlFor="oauth-otp">
              Código de seis dígitos
            </label>
            <input
              id="oauth-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Verificar y continuar
            </button>
          </form>
        ) : (
          !error && (
            <p
              role="status"
              className="mt-4 flex items-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Estamos verificando tu cuenta de forma segura.
            </p>
          )
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {(error || outcome?.tempToken) && (
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            Volver al inicio de sesión
          </Link>
        )}
      </div>
    </section>
  );
}
