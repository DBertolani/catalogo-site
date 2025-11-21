import { fetchFilters } from "../_utils/sheets.js";

export async function onRequest() {
  try {
    const { stores, categories, brands } = await fetchFilters();

    return new Response(JSON.stringify({ stores, categories, brands }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
