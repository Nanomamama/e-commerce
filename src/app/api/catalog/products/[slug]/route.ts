import { getStorefrontProductBySlug } from "@/modules/catalog/admin";
import { jsonError, jsonOk, requireString } from "@/server/api";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const product = await getStorefrontProductBySlug(
      requireString(slug, "slug")
    );

    if (!product) {
      return jsonError("Product not found", 404);
    }

    return jsonOk({ product });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load product",
      500
    );
  }
}
