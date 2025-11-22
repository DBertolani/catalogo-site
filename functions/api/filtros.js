// filters.js (Corrigido)

import { fetchFilterOptions } from '../_utils/sheets.js';

export async function onRequestGet(context) {
  // CRÍTICO: Desestruturar 'env' de context
  const { env } = context; 

  try {
    // 1. Busca os dados limpos da função utilitária, PASSANDO o 'env'
    const data = await fetchFilterOptions(env);

    // 2. Retorna explicitamente uma Response HTTP com JSON
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        // Permite acesso de qualquer origem (CORS)
        "Access-Control-Allow-Origin": "*", 
        // Cacheia a resposta no navegador por 1 hora
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (err) {
    // Em caso de erro, retorna JSON explicando o que houve
    console.error("Erro no roteador de filtros:", err);
    return new Response(JSON.stringify({ error: "Erro interno no servidor ao carregar filtros." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
