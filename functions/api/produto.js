
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "ID ausente" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // URL do seu Apps Script WebApp
    const apiUrl = `https://script.google.com/macros/s/AKfycbyXe7CcYsJecfV7pjhtmkeDE8hMzSx9EaGNDiqSv_GYXKEvlitDqOCec0YtgX-D_RYVSw/exec?api=produto&id=${encodeURIComponent(id)}`;

    const resposta = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!resposta.ok) {
      return new Response(JSON.stringify({
        error: "Erro na API Apps Script",
        status: resposta.status
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const dados = await resposta.json();

    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: `Falha: ${e.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
