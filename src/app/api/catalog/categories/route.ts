import { listCategories } from "@/modules/catalog/admin";
import { jsonError, jsonOk } from "@/server/api";

export async function GET() {
  try {
    const categories = await listCategories();
    return jsonOk({ categories });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load categories",
      500
    );
  }
}
