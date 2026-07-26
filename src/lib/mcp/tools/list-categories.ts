import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "Listar categorías",
  description:
    "Lista las categorías del usuario, con sus IDs, para poder asignarlas al crear movimientos o pendientes.",
  inputSchema: {
    type: z
      .enum(["income", "expense", "savings", "transfer", "yield"])
      .optional()
      .describe("Filtrar por tipo de categoría."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ type }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    let query = supabaseForUser(ctx).from("categories").select("id,name,type").order("name");
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) return textResult(error.message, true);
    return { ...textResult(data), structuredContent: { categories: data ?? [] } };
  },
});
