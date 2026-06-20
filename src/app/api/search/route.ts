import { listStorefrontProducts } from "@/modules/catalog/admin";
import { jsonError, jsonOk } from "@/server/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const products = await listStorefrontProducts({
      query: url.searchParams.get("q") ?? undefined,
      categorySlug: url.searchParams.get("category") ?? undefined
    });

    return jsonOk({ products });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to search products",
      500
    );
  }
}
