import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function textResult(value: unknown, isError = false) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value),
      },
    ],
    ...(isError ? { isError: true } : {}),
  };
}

export function requireAuth(ctx: ToolContext) {
  return ctx.isAuthenticated() ? null : textResult("Not authenticated", true);
}
