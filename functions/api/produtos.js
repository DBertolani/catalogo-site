import { fetchProductsPage } from "../_utils/sheets.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const q = (url.searchParams.get("query") || "").trim();
  const store = (url.searchParams.get("store") || "").trim();
  const cat = (url.searchParams.get("category") || "").trim();
  const brand = (url.searchParams.get("brand") || "").trim();

  try {
    const { totalCount, products } = await fetchProductsPage({ offset, limit, q, store, cat, brand });

    return new Response(JSON.stringify({
      total: totalCount,
      offset,
      limit,
      products
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
