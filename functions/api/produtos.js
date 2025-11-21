import { fetchProducts } from "../_utils/sheets.js";

function pickAlternatingByStore(produtos, limit = 50) {
  const grupos = {};
  produtos.forEach(p => {
    const loja = p.lojaParceira || "Desconhecida";
    if (!grupos[loja]) grupos[loja] = [];
    grupos[loja].push(p);
  });

  const lojas = Object.keys(grupos);
  let resultado = [];
  let i = 0;

  while (resultado.length < limit && lojas.length > 0) {
    const loja = lojas[i % lojas.length];
    if (grupos[loja].length > 0) {
      resultado.push(grupos[loja].shift());
    }
    i++;
  }
  return resultado;
}

export async function onRequest() {
  try {
    const produtos = await fetchProducts();

    // embaralha para variar a ordem
    const shuffled = produtos.sort(() => Math.random() - 0.5);

    const selecionados = pickAlternatingByStore(shuffled, 50);

    return new Response(JSON.stringify({
      total: produtos.length,
      produtos: selecionados
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
