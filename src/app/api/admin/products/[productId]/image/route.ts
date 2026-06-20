import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { attachProductImage } from "@/modules/catalog/admin";
import { jsonError, jsonOk, statusFromError } from "@/server/api";
import { requireAdmin } from "@/server/auth/request";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    await requireAdmin(request);

    const { productId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("file is required");
    }

    if (!allowedTypes.has(file.type)) {
      return jsonError("Only jpg, png, and webp images are supported");
    }

    if (file.size > 5 * 1024 * 1024) {
      return jsonError("Image must be smaller than 5MB");
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "products"
    );
    await mkdir(uploadDir, { recursive: true });

    const filename = `${productId}-${Date.now()}.${extensionFor(file.type)}`;
    const objectKey = `uploads/products/${filename}`;
    const publicUrl = `/${objectKey}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(uploadDir, filename), bytes);
    await attachProductImage({
      productId,
      objectKey,
      publicUrl,
      altText:
        typeof formData.get("altText") === "string"
          ? String(formData.get("altText"))
          : undefined
    });

    return jsonOk({ imageUrl: publicUrl }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to upload image",
      statusFromError(error)
    );
  }
}
