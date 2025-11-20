export async function onRequest(context) {
  const { request } = context;

  // --- 1. CONFIGURAÇÃO DE HEADERS CORS ---
  // Headers permissivos para garantir que não haja bloqueios de 400 ou CORS no navegador.
  const corsHeaders = {
    // Permite que qualquer origem (seu frontend) acesse a função
    "Access-Control-Allow-Origin": "*",
    // Métodos permitidos
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    // Permite que o navegador envie quaisquer cabeçalhos (Resolve o erro 400 "Formato Inválido")
    "Access-Control-Allow-Headers": "*", 
  };

  // --- 2. TRATAMENTO DE PRÉ-FLIGHT (OPTIONS) ---
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // 204 significa "No Content", mas OK
      headers: corsHeaders,
    });
  }

  // --- 3. TRATAMENTO DE REQUISIÇÃO REAL (GET) ---
  if (request.method === "GET") {
    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Teste funcionando! O Cloudflare Pages Functions está operacional.",
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Sucesso
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  // --- 4. TRATAMENTO DE OUTROS MÉTODOS ---
  return new Response(JSON.stringify({ error: "Método não permitido" }), {
    status: 405,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
