import { Suspense } from "react";
import OAuthCallback from "@/components/auth/OAuthCallback";

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-center">
          Preparando tu acceso…
        </p>
      }
    >
      <OAuthCallback />
    </Suspense>
  );
}
