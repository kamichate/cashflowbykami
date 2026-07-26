import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMovements from "./tools/list-movements";
import createMovement from "./tools/create-movement";
import listCategories from "./tools/list-categories";
import listPending from "./tools/list-pending";
import createPendingPayment from "./tools/create-pending-payment";
import financialSummary from "./tools/financial-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cashflow-mcp",
  title: "CashFlow MCP",
  version: "0.1.0",
  instructions:
    "Herramientas de finanzas personales de CashFlow. Usá `financial_summary` para balance y patrimonio, `list_movements` y `create_movement` para movimientos, `list_categories` para obtener IDs de categoría, y `list_pending` / `create_pending_payment` para pagos e ingresos pendientes. Todas las operaciones son del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    financialSummary,
    listMovements,
    createMovement,
    listCategories,
    listPending,
    createPendingPayment,
  ],
});
