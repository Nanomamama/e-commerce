import {
  getCategoryBySlug,
  listStorefrontProducts
} from "@/modules/catalog/admin";
import { jsonError, jsonOk, requireString } from "@/server/api";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const categorySlug = requireString(slug, "slug");
    const category = await getCategoryBySlug(categorySlug);

    if (!category) {
      return jsonError("Category not found", 404);
    }

    const products = await listStorefrontProducts({ categorySlug });
    return jsonOk({ category, products });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load category",
      500
    );
  }
}
