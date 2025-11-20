export async function onRequest(context) {
  const { request } = context;

  // Respond to preflight for browsers (útil para testes CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  try {
    console.log('Function /api/test called. Method:', request.method);
    console.log('Full request URL:', request.url);
    console.log('Headers:', Array.from(request.headers.entries()));

    const payload = { ok: true, ts: new Date().toISOString() };

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      // Ajuste o CORS para seu domínio em produção. Aqui usamos * para facilitar debug.
      'Access-Control-Allow-Origin': '*',
    };

    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch (err) {
    console.error('Erro interno na Function:', err);
    return new Response(JSON.stringify({ error: 'internal', message: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
