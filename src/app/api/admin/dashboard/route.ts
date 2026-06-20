import {
  getDashboardSummary,
  getLowStockSummary,
  getRecentOrders,
  getSalesChart,
  getTopProducts,
  normalizeDashboardRange
} from "@/modules/admin/dashboard";
import { jsonError, jsonOk, statusFromError } from "@/server/api";
import { requireAdmin } from "@/server/auth/request";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const range = normalizeDashboardRange(url.searchParams.get("range"));
    const [summary, salesChart, topProducts, recentOrders, lowStock] =
      await Promise.all([
        getDashboardSummary(range),
        getSalesChart(range),
        getTopProducts(range),
        getRecentOrders(5),
        getLowStockSummary()
      ]);

    return jsonOk({
      summary,
      salesChart,
      topProducts,
      recentOrders,
      lowStock
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load dashboard",
      statusFromError(error, 500)
    );
  }
}
