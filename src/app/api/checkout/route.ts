import { checkoutCart } from "@/modules/checkout/service";
import { jsonError, jsonOk, readJson, requireString } from "@/server/api";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      cartId?: string;
      customerEmail?: string;
      customerName?: string;
      customerPhone?: string;
      shippingAddress?: Record<string, unknown>;
    }>(request);

    const result = await checkoutCart({
      cartId: requireString(body.cartId, "cartId"),
      customerEmail: requireString(body.customerEmail, "customerEmail"),
      customerName: requireString(body.customerName, "customerName"),
      customerPhone: body.customerPhone,
      shippingAddress: body.shippingAddress ?? {}
    });

    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to checkout"
    );
  }
}
