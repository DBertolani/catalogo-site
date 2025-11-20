export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET") {
    // Simulação de produtos (poderia vir de um banco ou API externa)
    const produtos = [
      { id: 1, nome: "Notebook Dell", preco: 3500.00 },
      { id: 2, nome: "Smartphone Samsung", preco: 2200.00 },
      { id: 3, nome: "Monitor LG 24\"", preco: 900.00 },
    ];

    return new Response(JSON.stringify(produtos), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Método não permitido" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
