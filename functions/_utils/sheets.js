// Cache em memória (lifetime do Worker) + cache na borda (caches.default)
let cachedProducts = null;
let cachedFilters = null;
let lastUpdated = 0;
let inflightLoad = null;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h na borda
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";
const EDGE_CACHE_KEY = "https://cache.deab.com.br/products:v1"; // chave de cache na borda

// Parser simples de CSV (respeita aspas duplas)
function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      current.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (field || current.length > 0) {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      }
    } else {
      field += char;
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

// Normaliza campos para o front
function normalizeProduct(obj) {
  return {
    id: obj["id"] || "",
    nome: obj["title"] || "",
    descricao: obj["description"] || "",
    preco: obj["sale_price"] || obj["price"] || "",
    linkAfiliado: obj["link"] || "",
    imagem: obj["image_link"] || "",
    lojaParceira: obj["custom_label_1"] || "",
    categoria: obj["categoria_web"] || "",
    marca: obj["brand"] || "",
    textoBotao: `Compre na Loja: ${obj["custom_label_1"] || "Parceiro"}`
  };
}

// Carrega e parseia CSV
async function loadProductsFromSheet() {
  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`Falha ao baixar CSV da planilha: ${res.status}`);
  const text = await res.text();

  const rows = parseCSV(text);
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => (h || "").trim().toLowerCase());
  const products = rows.slice(1).map(row => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] || "";
    }
    return normalizeProduct(obj);
  });

  return products;
}

// Tenta ler da borda; se falhar, carrega da planilha e salva no cache
async function fetchAndCacheProductsEdge() {
  const cache = caches.default;
  const cacheReq = new Request(EDGE_CACHE_KEY);
  const cached = await cache.match(cacheReq);
  if (cached) {
    const data = await cached.json();
    return data.products;
  }

  const products = await loadProductsFromSheet();

  const resp = new Response(JSON.stringify({ products }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=43200" // 12h
    }
  });
  await cache.put(cacheReq, resp.clone());
  return products;
}

async function ensureProductsLoaded() {
  const now = Date.now();
  const needsRefresh = !cachedProducts || (now - lastUpdated) > ONE_DAY_MS;

  if (!needsRefresh) return cachedProducts;

  // Evita corrida: reutiliza a mesma promessa se múltiplas requisições chegarem
  if (!inflightLoad) {
    inflightLoad = (async () => {
      const products = await fetchAndCacheProductsEdge();
      cachedProducts = products;
      lastUpdated = Date.now();
      cachedFilters = null; // invalida filtros para recomputar
      inflightLoad = null;
      return products;
    })();
  }
  return inflightLoad;
}

// PUBLIC: todos os produtos (com cache)
export async function fetchProducts() {
  await ensureProductsLoaded();
  return cachedProducts || [];
}

// PUBLIC: por ID
export async function fetchProductById(id) {
  const products = await fetchProducts();
  return products.find(p => String(p.id).trim() === String(id).trim()) || null;
}

// PUBLIC: paginação simples
export async function fetchProductsPage({ offset = 0, limit = 50 }) {
  const products = await fetchProducts();
  const paginados = products.slice(offset, offset + limit);
  return { totalCount: products.length, products: paginados };
}

// PUBLIC: filtros pré-computados e cacheados em memória
export async function fetchFilters() {
  if (cachedFilters) return cachedFilters;
  const produtos = await fetchProducts();
  const stores = [...new Set(produtos.map(p => p.lojaParceira).filter(Boolean))].sort();
  const categories = [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
  const brands = [...new Set(produtos.map(p => p.marca).filter(Boolean))].sort();
  cachedFilters = { stores, categories, brands };
  return cachedFilters;
}
