import { createAddress, listAddresses } from "@/modules/users/service";
import type { AddressInput, AddressType } from "@/modules/users/types";
import { jsonError, jsonOk, readJson, requireString, statusFromError } from "@/server/api";
import { requireAuth } from "@/server/auth/request";

function readAddressType(value: unknown): AddressType {
  if (value === "shipping" || value === "billing") return value;
  throw new Error("type must be shipping or billing");
}

function nullableString(value: unknown) {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

function addressInput(body: Record<string, unknown>): AddressInput {
  return {
    type: readAddressType(body.type),
    recipientName: requireString(body.recipientName, "recipientName"),
    phone: requireString(body.phone, "phone"),
    line1: requireString(body.line1, "line1"),
    line2: nullableString(body.line2),
    subdistrict: nullableString(body.subdistrict),
    district: requireString(body.district, "district"),
    province: requireString(body.province, "province"),
    postalCode: requireString(body.postalCode, "postalCode"),
    countryCode:
      typeof body.countryCode === "string" && body.countryCode.trim()
        ? body.countryCode.trim().toUpperCase()
        : "TH",
    taxId: nullableString(body.taxId),
    companyName: nullableString(body.companyName),
    branchName: nullableString(body.branchName),
    isDefault: body.isDefault === true
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const addresses = await listAddresses(user.id);
    return jsonOk({ addresses });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load addresses",
      statusFromError(error)
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await readJson<Record<string, unknown>>(request);
    const address = await createAddress(user.id, addressInput(body));
    return jsonOk({ address }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create address",
      statusFromError(error)
    );
  }
}
