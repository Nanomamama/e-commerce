import {
  deleteAddress,
  getAddress,
  setDefaultAddress,
  updateAddress
} from "@/modules/users/service";
import type { AddressType, UpdateAddressInput } from "@/modules/users/types";
import { jsonError, jsonOk, readJson, requireString, statusFromError } from "@/server/api";
import { requireAuth } from "@/server/auth/request";

function readAddressType(value: unknown): AddressType | undefined {
  if (value === undefined) return undefined;
  if (value === "shipping" || value === "billing") return value;
  throw new Error("type must be shipping or billing");
}

function nullableString(value: unknown) {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

function updateInput(body: Record<string, unknown>): UpdateAddressInput {
  return {
    type: readAddressType(body.type),
    recipientName:
      typeof body.recipientName === "string"
        ? body.recipientName.trim()
        : undefined,
    phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
    line1: typeof body.line1 === "string" ? body.line1.trim() : undefined,
    line2: "line2" in body ? nullableString(body.line2) : undefined,
    subdistrict:
      "subdistrict" in body ? nullableString(body.subdistrict) : undefined,
    district:
      typeof body.district === "string" ? body.district.trim() : undefined,
    province:
      typeof body.province === "string" ? body.province.trim() : undefined,
    postalCode:
      typeof body.postalCode === "string" ? body.postalCode.trim() : undefined,
    countryCode:
      typeof body.countryCode === "string"
        ? body.countryCode.trim().toUpperCase()
        : undefined,
    taxId: "taxId" in body ? nullableString(body.taxId) : undefined,
    companyName:
      "companyName" in body ? nullableString(body.companyName) : undefined,
    branchName:
      "branchName" in body ? nullableString(body.branchName) : undefined,
    isDefault: typeof body.isDefault === "boolean" ? body.isDefault : undefined
  };
}

type RouteContext = {
  params: Promise<{ addressId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { addressId } = await context.params;
    const address = await getAddress(user.id, requireString(addressId, "addressId"));

    if (!address) {
      return jsonError("Address not found", 404);
    }

    return jsonOk({ address });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load address",
      statusFromError(error)
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { addressId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    const type = readAddressType(body.defaultType);

    const address =
      type && body.makeDefault === true
        ? await setDefaultAddress(user.id, addressId, type)
        : await updateAddress(user.id, addressId, updateInput(body));

    return jsonOk({ address });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update address",
      statusFromError(error)
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { addressId } = await context.params;
    await deleteAddress(user.id, requireString(addressId, "addressId"));
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to delete address",
      statusFromError(error)
    );
  }
}
