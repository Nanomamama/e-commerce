import { getSearchSuggestions } from "@/modules/catalog/admin";
import { jsonError, jsonOk } from "@/server/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const suggestions = await getSearchSuggestions(
      url.searchParams.get("q") ?? ""
    );

    return jsonOk({ suggestions });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load suggestions",
      500
    );
  }
}
