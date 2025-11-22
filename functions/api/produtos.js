// products.js (Corrigido)

import { fetchProductsPage, fetchFilterOptions, fetchProductById } from "../_utils/sheets.js"; // Adicione os outros exports se este for o único roteador

export async function onRequest(context) {
  // CRÍTICO: Desestruturar 'env' e 'request' de context
  const { env, request } = context; 
  const url = new URL(request.url); // Use request.url em vez de context.request.url

  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const q = (url.searchParams.get("query") || "").trim();
  const store = (url.searchParams.get("store") || "").trim();
  const cat = (url.searchParams.get("category") || "").trim();
  const brand = (url.searchParams.get("brand") || "").trim();

  // --- Adicione as Rotas de Filtro e Produto por ID, se ainda não existirem ---
  // Isso garantirá que as outras rotas funcionem corretamente com o novo código do sheets.js

  // 1. Rota de Filtros: /api/produtos?filters=true
  if (url.searchParams.has("filters")) {
    try {
      // PASSANDO 'env' como primeiro argumento
      const filters = await fetchFilterOptions(env); 
      return new Response(JSON.stringify(filters), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      console.error("Erro no fetchFilterOptions:", e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // 2. Rota de Detalhe: /api/produtos?id=...
  if (url.searchParams.has("id")) {
    try {
      // PASSANDO 'env' como primeiro argumento
      const product = await fetchProductById(env, url.searchParams.get("id")); 
      if (product) {
        return new Response(JSON.stringify(product), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
        });
      }
      return new Response('Produto não encontrado', { status: 404 });
    } catch (e) {
      console.error("Erro no fetchProductById:", e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }
  // --- Fim das Rotas Adicionadas ---


  try {
    // CRÍTICO: PASSANDO 'env' como primeiro argumento
    const { totalCount, products } = await fetchProductsPage(env, { offset, limit, q, store, cat, brand });

    return new Response(JSON.stringify({
      total: totalCount,
      offset,
      limit,
      products
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    console.error("Erro na fetchProductsPage:", err);
    return new Response(JSON.stringify({ error: "Erro interno no servidor ao buscar produtos." }), { // Mensagem mais amigável
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
