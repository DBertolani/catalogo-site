import { fetchProducts } from "../_utils/sheets.js";

export async function onRequest() {
  try {
    const produtos = await fetchProducts();

    return new Response(JSON.stringify(produtos), {
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
