"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Google Sign-In button using Google Identity Services (GIS).
 *
 * Why GIS and not a React lib?
 * ─────────────────────────────
 * - Static export friendly: no server-side OAuth callback needed.
 * - First-party JS, never re-deprecated, ~5 KB on the wire.
 * - Renders a Material-spec button that respects Google's brand
 *   guidelines, including locale + dark/light + custom width — most
 *   third-party wrappers fall behind on those.
 *
 * How it works:
 *   1. We inject https://accounts.google.com/gsi/client once at app
 *      mount (handled by next/script in app/layout.tsx — `gis-loader`).
 *   2. On mount we poll for `window.google` (script may still be
 *      downloading) and call `google.accounts.id.initialize` with our
 *      Google client ID + a callback that hands the ID token to the
 *      parent.
 *   3. We render the button via `google.accounts.id.renderButton`
 *      into our ref div.
 *
 * The parent gets the raw ID token in `onSuccess(idToken)` and is
 * responsible for calling `authApi.googleAuth({ token, role })` and
 * navigating. This component is intentionally just a shell.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitConfig) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          prompt?: () => void;
          cancel?: () => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleInitConfig {
  client_id: string;
  callback: (resp: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  ux_mode?: "popup" | "redirect";
  context?: "signin" | "signup" | "use";
  use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number | string;
  logo_alignment?: "left" | "center";
  locale?: string;
}

export interface GoogleSignInButtonProps {
  /** Called with the raw Google ID token (a JWT) on successful sign-in. */
  onSuccess: (idToken: string) => void;
  /** Called when the user dismisses the popup or GIS errors out. */
  onError?: (msg: string) => void;
  /** Hint to GIS — controls the localised button label. */
  context?: "signin" | "signup";
  /** Pixel width to render. GIS clamps to 200..400. */
  width?: number;
  /** Disabled passes through to the rendered button via opacity / pointer-events. */
  disabled?: boolean;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
// How long to wait for the GIS script before declaring it missing.
// The script is small (~5 KB) but slow networks have been observed
// taking 2-3 s. We give it 5 s and then surface a friendly fallback.
const GIS_TIMEOUT_MS = 5000;

export default function GoogleSignInButton({
  onSuccess,
  onError,
  context = "signin",
  width = 320,
  disabled,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Capture latest callbacks in refs so we don't re-init GIS every
  // time the parent re-renders (which would flicker the button).
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) {
      setScriptError(
        "Google Sign-In is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
      );
      return;
    }

    let cancelled = false;
    const start = Date.now();

    // Poll for window.google. We can't rely on the next/script onLoad
    // because we may mount after the script has already loaded —
    // in which case we'd never get the event.
    const tick = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: CLIENT_ID,
            ux_mode: "popup",
            // FedCM is the new browser-native flow that replaces
            // third-party cookies. Chrome forces it on by default in
            // 2024+; we opt-in explicitly to avoid the deprecation
            // warning in the console.
            use_fedcm_for_prompt: true,
            context,
            callback: (resp) => {
              const token = resp?.credential;
              if (token) {
                onSuccessRef.current?.(token);
              } else {
                onErrorRef.current?.("No credential returned from Google.");
              }
            },
          });
          if (containerRef.current) {
            // Clear before render — re-mounts (e.g. when switching
            // Login/Signup tabs) would otherwise stack two buttons.
            containerRef.current.innerHTML = "";
            window.google.accounts.id.renderButton(containerRef.current, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: context === "signup" ? "signup_with" : "continue_with",
              shape: "pill",
              logo_alignment: "left",
              width,
            });
          }
          setReady(true);
        } catch (err: any) {
          setScriptError(
            err?.message || "Could not initialise Google Sign-In.",
          );
        }
        return;
      }
      if (Date.now() - start > GIS_TIMEOUT_MS) {
        setScriptError(
          "Google Sign-In script failed to load. Please retry or use email.",
        );
        return;
      }
      // Re-check every 100 ms.
      window.setTimeout(tick, 100);
    };
    tick();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, width]);

  if (scriptError) {
    return (
      <div className="text-[0.78rem] text-[var(--text-muted)] text-center py-2">
        {scriptError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`google-signin-host flex justify-center ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${!ready ? "min-h-[40px]" : ""}`}
      // Reserve the button height while GIS renders so the form
      // doesn't jump on first paint.
      style={{ minHeight: ready ? undefined : 40 }}
    />
  );
}
