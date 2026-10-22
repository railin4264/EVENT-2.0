import { safeRedirect } from "./redirect";

export type OAuthIntent = {
  state: string;
  mode: "login" | "register" | "link";
  redirect: string;
  createdAt: number;
};
const key = (provider: string) => `eventnow:oauth:${provider}`;

/** Bind the provider callback to the tab that initiated it. Never store tokens. */
export function rememberOAuthIntent(
  provider: string,
  intent: Omit<OAuthIntent, "createdAt">,
) {
  if (!/^[a-f0-9]{64}$/.test(intent.state))
    throw new Error(
      "No se pudo verificar el inicio de sesión. Inténtalo otra vez.",
    );
  sessionStorage.setItem(
    key(provider),
    JSON.stringify({
      ...intent,
      redirect: safeRedirect(intent.redirect),
      createdAt: Date.now(),
    }),
  );
}

export function consumeOAuthIntent(
  provider: string,
  state: string | null,
): OAuthIntent {
  const raw = sessionStorage.getItem(key(provider));
  sessionStorage.removeItem(key(provider));
  const invalid = () =>
    new Error(
      "Esta solicitud venció o se inició en otra pestaña. Vuelve a iniciar sesión.",
    );
  if (!raw || !state) throw invalid();
  let intent: OAuthIntent;
  try {
    intent = JSON.parse(raw);
  } catch {
    throw invalid();
  }
  if (
    !intent ||
    !/^[a-f0-9]{64}$/.test(state) ||
    intent.state !== state ||
    !Number.isFinite(intent.createdAt) ||
    Date.now() - intent.createdAt > 600000 ||
    intent.createdAt > Date.now() + 5000 ||
    !["login", "register", "link"].includes(intent.mode)
  )
    throw invalid();
  return { ...intent, redirect: safeRedirect(intent.redirect) };
}
