import { fetchProducts } from "../_utils/sheets.js";

// Seleção aleatória/alternada por loja sem embaralhar toda a lista
function pickAlternatingByStoreOptimized(produtos, limit = 50) {
  // Agrupa índices por loja para reduzir cópia de objetos
  const grupos = new Map();
  for (let i = 0; i < produtos.length; i++) {
    const loja = produtos[i].lojaParceira || "Desconhecida";
    if (!grupos.has(loja)) grupos.set(loja, []);
    grupos.get(loja).push(i);
  }

  const lojas = Array.from(grupos.keys());
  if (lojas.length === 0) return [];

  // Define um deslocamento inicial aleatório por loja
  const offsets = new Map();
  for (const loja of lojas) {
    const arr = grupos.get(loja);
    offsets.set(loja, Math.floor(Math.random() * arr.length));
  }

  const result = [];
  let round = 0;
  // Round-robin com deslocamento aleatório
  while (result.length < limit) {
    let progressed = false;

    for (const loja of lojas) {
      const arr = grupos.get(loja);
      if (!arr || arr.length === 0) continue;

      const idx = arr[(offsets.get(loja) + round) % arr.length];
      result.push(produtos[idx]);
      progressed = true;

      if (result.length >= limit) break;
    }

    if (!progressed) break; // nada mais a adicionar
    round++;
  }

  return result;
}

export async function onRequest() {
  try {
    const produtos = await fetchProducts();

    // Seleção leve, sem sort aleatório de toda a lista
    const selecionados = pickAlternatingByStoreOptimized(produtos, 50);

    return new Response(JSON.stringify({
      total: produtos.length,
      products: selecionados
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    // Retorna erro leve e não HTML para o front
    return new Response(JSON.stringify({ error: err.message || "internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
