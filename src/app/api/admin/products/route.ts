import {
  archiveAdminProduct,
  createAdminProduct,
  listAdminProducts,
  updateAdminProduct
} from "@/modules/catalog/admin";
import {
  jsonError,
  jsonOk,
  readJson,
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireString,
  statusFromError
} from "@/server/api";
import { requireAdmin } from "@/server/auth/request";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const products = await listAdminProducts();
    return jsonOk({ products });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load products",
      statusFromError(error, 500)
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await readJson<{
      name?: string;
      slug?: string;
      description?: string;
      sku?: string;
      variantName?: string;
      priceAmount?: number;
      onHand?: number;
      status?: "draft" | "active" | "archived";
    }>(request);

    const product = await createAdminProduct({
      name: requireString(body.name, "name"),
      slug: requireString(body.slug, "slug"),
      description: body.description,
      sku: requireString(body.sku, "sku"),
      variantName: body.variantName,
      priceAmount: requirePositiveInteger(body.priceAmount, "priceAmount"),
      onHand: requireNonNegativeInteger(body.onHand, "onHand"),
      status: body.status ?? "active"
    });

    return jsonOk({ product }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create product",
      statusFromError(error)
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);

    const body = await readJson<{
      productId?: string;
      variantId?: string;
      name?: string;
      slug?: string;
      description?: string;
      sku?: string;
      variantName?: string;
      priceAmount?: number;
      onHand?: number;
      status?: "draft" | "active" | "archived";
    }>(request);

    const product = await updateAdminProduct({
      productId: requireString(body.productId, "productId"),
      variantId: requireString(body.variantId, "variantId"),
      name: requireString(body.name, "name"),
      slug: requireString(body.slug, "slug"),
      description: body.description,
      sku: requireString(body.sku, "sku"),
      variantName: body.variantName,
      priceAmount: requirePositiveInteger(body.priceAmount, "priceAmount"),
      onHand: requireNonNegativeInteger(body.onHand, "onHand"),
      status: body.status ?? "active"
    });

    return jsonOk({ product });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update product",
      statusFromError(error)
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const productId = requireString(
      url.searchParams.get("productId"),
      "productId"
    );

    await archiveAdminProduct(productId);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to delete product",
      statusFromError(error)
    );
  }
}
