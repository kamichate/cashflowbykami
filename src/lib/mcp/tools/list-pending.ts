import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_pending",
  title: "Listar pendientes",
  description:
    "Lista los pagos pendientes (a pagar) y/o los ingresos pendientes (a cobrar) del usuario, con sus fechas de vencimiento.",
  inputSchema: {
    kind: z
      .enum(["payments", "income", "both"])
      .optional()
      .describe("Qué listar: pagos, ingresos o ambos (default both)."),
    include_settled: z
      .boolean()
      .optional()
      .describe("Incluir los ya pagados/cobrados (default false)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, include_settled }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    const which = kind ?? "both";
    const result: Record<string, unknown> = {};

    if (which === "payments" || which === "both") {
      let q = supabase
        .from("pending_payments")
        .select("id,description,amount,due_date,is_paid,category_id")
        .order("due_date");
      if (!include_settled) q = q.eq("is_paid", false);
      const { data, error } = await q;
      if (error) return textResult(error.message, true);
      result.pending_payments = data ?? [];
    }

    if (which === "income" || which === "both") {
      let q = supabase
        .from("pending_income")
        .select("id,description,amount,due_date,is_collected,category_id")
        .order("due_date");
      if (!include_settled) q = q.eq("is_collected", false);
      const { data, error } = await q;
      if (error) return textResult(error.message, true);
      result.pending_income = data ?? [];
    }

    return { ...textResult(result), structuredContent: result };
  },
});
