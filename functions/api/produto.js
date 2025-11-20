export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "ID não informado" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  const apiUrl = "https://script.google.com/macros/s/AKfycbyXe7CcYsJecfV7pjhtmkeDE8hMzSx9EaGNDiqSv_GYXKEvlitDqOCec0YtgX-D_RYVSw/exec?api=produto&id=" + id;

  try {
    const resp = await fetch(apiUrl);
    const data = await resp.text();

    return new Response(data, {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
