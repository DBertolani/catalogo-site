// Cache para opções de filtro (24h)
const FILTERS_CACHE = { ts: 0, data: null };

// Retorna todas as opções únicas de filtros (lojas, categorias, marcas)
export async function fetchFilterOptions() {
  // Cache em memória (24h)
  if (FILTERS_CACHE.data && (Date.now() - FILTERS_CACHE.ts) < ONE_DAY_MS) {
    return FILTERS_CACHE.data;
  }

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) {
    const empty = { stores: [], categories: [], brands: [] };
    FILTERS_CACHE.ts = Date.now();
    FILTERS_CACHE.data = empty;
    return empty;
  }

  const headersRow = parseCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  const stores = new Set();
  const categories = new Set();
  const brands = new Set();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 1 && row[0].trim() === "") continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });

    // Usa o normalizador para garantir campos corretos
    const p = normalizeProduct(obj);

    if (p.lojaParceira && p.lojaParceira.trim()) stores.add(p.lojaParceira.trim());
    if (p.categoria && p.categoria.trim()) categories.add(p.categoria.trim());
    if (p.marca && p.marca.trim()) brands.add(p.marca.trim());
  }

  const result = {
    stores: Array.from(stores).sort(),
    categories: Array.from(categories).sort(),
    brands: Array.from(brands).sort(),
  };

  FILTERS_CACHE.ts = Date.now();
  FILTERS_CACHE.data = result;

  return result;
}
