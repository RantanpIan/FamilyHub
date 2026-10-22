import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./database.types";

const BrowserConfigSchema = z.object({
  url: z.url().refine((value) => {
    const { protocol, hostname } = new URL(value);
    return (
      protocol === "https:" ||
      (protocol === "http:" &&
        (hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "[::1]"))
    );
  }),
  anonKey: z.string().trim().min(1),
});

export type BrowserAuthConfig =
  | { configured: true; client: ReturnType<typeof createClient<Database>> }
  | { configured: false; client: null; reason: string };

export function createBrowserAuthConfig(
  url: string | undefined,
  anonKey: string | undefined,
): BrowserAuthConfig {
  const parsed = BrowserConfigSchema.safeParse({
    url: url?.trim(),
    anonKey: anonKey?.trim(),
  });

  if (!parsed.success) {
    return {
      configured: false,
      client: null,
      reason: "Supabase ist nicht konfiguriert. Hinterlege die Projekt-URL und den öffentlichen Publishable-/Anon-Key in der lokalen .env-Datei.",
    };
  }

  return {
    configured: true,
    client: createClient<Database>(parsed.data.url, parsed.data.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    }),
  };
}

export const browserAuthConfig = createBrowserAuthConfig(
  import.meta.env["VITE_SUPABASE_URL"],
  import.meta.env["VITE_SUPABASE_ANON_KEY"],
);
