import { fetchFilterOptions } from "../_utils/sheets.js";

export async function onRequest() {
  try {
    const options = await fetchFilterOptions();
    return new Response(JSON.stringify(options), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (err) {
    return new Response(`Erro ao carregar filtros: ${err.message}`, { status: 500 });
  }
}
