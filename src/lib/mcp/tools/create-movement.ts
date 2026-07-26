import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "create_movement",
  title: "Crear movimiento",
  description:
    "Crea un movimiento financiero (ingreso, gasto, ahorro, transferencia o rendimiento) para el usuario autenticado.",
  inputSchema: {
    date: z.string().describe("Fecha del movimiento YYYY-MM-DD."),
    type: z
      .enum(["income", "expense", "savings", "transfer", "yield"])
      .describe("Tipo de movimiento."),
    amount: z.number().positive().describe("Monto en la moneda indicada."),
    detail: z.string().optional().describe("Descripción del movimiento."),
    category_id: z.string().uuid().optional().describe("ID de categoría existente."),
    currency: z.enum(["ARS", "USD"]).optional().describe("Moneda (default ARS)."),
    is_withdrawal: z
      .boolean()
      .optional()
      .describe("Para ahorros: marca un retiro en lugar de un depósito."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const { data, error } = await supabaseForUser(ctx)
      .from("movements")
      .insert({
        user_id: ctx.getUserId(),
        date: input.date,
        type: input.type,
        amount: input.amount,
        detail: input.detail ?? null,
        category_id: input.category_id ?? null,
        currency: input.currency ?? "ARS",
        is_withdrawal: input.is_withdrawal ?? false,
      })
      .select()
      .single();

    if (error) return textResult(error.message, true);
    return { ...textResult(data), structuredContent: { movement: data } };
  },
});
