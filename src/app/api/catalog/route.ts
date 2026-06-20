import { jsonError, jsonOk } from "@/server/api";
import { listStorefrontProducts } from "@/modules/catalog/admin";

function readMoneyParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Math.round(Number(value) * 100);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort");
    const products = await listStorefrontProducts({
      query: url.searchParams.get("q") ?? undefined,
      categorySlug: url.searchParams.get("category") ?? undefined,
      minPriceAmount: readMoneyParam(url.searchParams.get("minPrice")),
      maxPriceAmount: readMoneyParam(url.searchParams.get("maxPrice")),
      sort:
        sort === "price_asc" ||
        sort === "price_desc" ||
        sort === "name" ||
        sort === "newest"
          ? sort
          : "newest"
    });
    return jsonOk({ products });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load catalog",
      500
    );
  }
}
