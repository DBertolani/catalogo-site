export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, route: "/api/ping" }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
