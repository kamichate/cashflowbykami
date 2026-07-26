import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_movements",
  title: "Listar movimientos",
  description:
    "Lista los movimientos financieros del usuario (ingresos, gastos, ahorros, transferencias, rendimientos) con filtros opcionales de tipo y rango de fechas.",
  inputSchema: {
    type: z
      .enum(["income", "expense", "savings", "transfer", "yield"])
      .optional()
      .describe("Filtrar por tipo de movimiento."),
    start_date: z.string().optional().describe("Fecha inicial YYYY-MM-DD."),
    end_date: z.string().optional().describe("Fecha final YYYY-MM-DD."),
    limit: z.number().int().optional().describe("Máximo de filas (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ type, start_date, end_date, limit }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    let query = supabaseForUser(ctx)
      .from("movements")
      .select("id,date,type,detail,amount,personal_amount,currency,is_withdrawal,category:categories(name)")
      .order("date", { ascending: false })
      .limit(Math.min(limit ?? 50, 200));

    if (type) query = query.eq("type", type);
    if (start_date) query = query.gte("date", start_date);
    if (end_date) query = query.lte("date", end_date);

    const { data, error } = await query;
    if (error) return textResult(error.message, true);
    return { ...textResult(data), structuredContent: { movements: data ?? [] } };
  },
});
