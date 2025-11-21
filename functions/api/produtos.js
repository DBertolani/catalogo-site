import { fetchProductsPage } from "../_utils/sheets.js";

export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const { totalCount, products } = await fetchProductsPage({ offset, limit });

    return new Response(JSON.stringify({
      total: totalCount,
      products
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
