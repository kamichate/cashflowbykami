import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "create_pending_payment",
  title: "Crear pago pendiente",
  description:
    "Crea un pago pendiente con fecha de vencimiento. No afecta el balance hasta marcarse como pagado en la app.",
  inputSchema: {
    description: z.string().min(1).describe("Descripción del pago."),
    amount: z.number().positive().describe("Monto del pago."),
    due_date: z.string().describe("Fecha de vencimiento YYYY-MM-DD."),
    category_id: z.string().uuid().optional().describe("ID de categoría de gasto."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ description, amount, due_date, category_id }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const { data, error } = await supabaseForUser(ctx)
      .from("pending_payments")
      .insert({
        user_id: ctx.getUserId(),
        description,
        amount,
        due_date,
        category_id: category_id ?? null,
        is_paid: false,
      })
      .select()
      .single();

    if (error) return textResult(error.message, true);
    return { ...textResult(data), structuredContent: { pending_payment: data } };
  },
});
