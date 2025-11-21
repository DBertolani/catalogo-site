import { fetchProducts } from "../_utils/sheets.js";

export async function onRequest() {
  try {
    const produtos = await fetchProducts();

    const stores = [...new Set(produtos.map(p => p.lojaParceira).filter(Boolean))].sort();
    const categories = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    const brands = [...new Set(produtos.map(p => p.marca).filter(Boolean))].sort();

    return new Response(JSON.stringify({ stores, categories, brands }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
