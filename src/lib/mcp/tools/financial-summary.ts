import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "financial_summary",
  title: "Resumen financiero",
  description:
    "Devuelve el resumen financiero del usuario: balance disponible, ahorros, rendimientos, patrimonio total y totales por tipo en un rango de fechas opcional.",
  inputSchema: {
    start_date: z.string().optional().describe("Fecha inicial YYYY-MM-DD para los totales del período."),
    end_date: z.string().optional().describe("Fecha final YYYY-MM-DD para los totales del período."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ start_date, end_date }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const { data, error } = await supabaseForUser(ctx)
      .from("movements")
      .select("date,type,amount,is_withdrawal,currency");
    if (error) return textResult(error.message, true);

    const rows = data ?? [];
    const sum = (fn: (r: (typeof rows)[number]) => boolean) =>
      rows.filter(fn).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    const income = sum((r) => r.type === "income");
    const expense = sum((r) => r.type === "expense");
    const transfer = sum((r) => r.type === "transfer");
    const savingsIn = sum((r) => r.type === "savings" && !r.is_withdrawal);
    const savingsOut = sum((r) => r.type === "savings" && r.is_withdrawal);
    const yields = sum((r) => r.type === "yield");

    const balance = income + transfer - expense - savingsIn + savingsOut;
    const savings = savingsIn - savingsOut;
    const patrimonio = balance + savings + yields;

    const inRange = (r: (typeof rows)[number]) =>
      (!start_date || r.date >= start_date) && (!end_date || r.date <= end_date);

    const period = {
      income: sum((r) => r.type === "income" && inRange(r)),
      expense: sum((r) => r.type === "expense" && inRange(r)),
      savings: sum((r) => r.type === "savings" && !r.is_withdrawal && inRange(r)),
      transfer: sum((r) => r.type === "transfer" && inRange(r)),
      yield: sum((r) => r.type === "yield" && inRange(r)),
    };

    const summary = { balance, savings, yields, patrimonio_total: patrimonio, period };
    return { ...textResult(summary), structuredContent: summary };
  },
});
