import { fetchFilterOptions } from '../_utils/sheets.js';

export async function onRequestGet(context) {
  try {
    // 1. Busca os dados limpos da função utilitária
    const data = await fetchFilterOptions();

    // 2. Retorna explicitamente uma Response HTTP com JSON
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        // Permite acesso de qualquer origem (CORS) - importante para APIs
        "Access-Control-Allow-Origin": "*", 
        // Cacheia a resposta no navegador por 1 hora para economizar requisições
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (err) {
    // Em caso de erro, retorna JSON explicando o que houve (evita o 503 mudo)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
