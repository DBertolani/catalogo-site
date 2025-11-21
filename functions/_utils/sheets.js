// Cache leve em memória (por instância)
const PAGE_CACHE = new Map(); // chave: `${offset}:${limit}:${q}:${store}:${cat}:${brand}`
const ID_CACHE = new Map();   // chave: id
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";

// Parser de uma única linha CSV respeitando aspas
function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (ch === "," && !insideQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

// Normaliza objeto de produto com base nos nomes de coluna da planilha
function normalizeProduct(obj) {
  return {
    ...obj,
    id: obj["id"] || "",
    nome: obj["title"] || "",
    descricao: obj["description"] || "",
    preco: obj["sale_price"] || obj["price"] || "",
    linkAfiliado: obj["link"] || "",
    imagem: obj["image_link"] || "",
    lojaParceira: obj["custom_label_1"] || "",
    categoria: obj["categoria_web"] || "",
    marca: obj["brand"] || "",
    facebookLink: obj["facebook_link"] || "",   // <-- novo campo
    textoBotao: `Compre na Loja: ${obj["custom_label_1"] || "Parceiro"}`
  };
}

// Aplica filtros e busca
function matchesFilters(prod, q, store, cat, brand) {
  const toStr = v => (v || "").toString().toLowerCase();

  const qv = toStr(q);
  const storeV = toStr(store);
  const catV = toStr(cat);
  const brandV = toStr(brand);

  const haystack = [
    toStr(prod["title"]),
    toStr(prod["description"]),
    toStr(prod["brand"]),
    toStr(prod["custom_label_1"]),
    toStr(prod["categoria_web"]),
    toStr(prod["id"])
  ].join(" ");

  const passesQuery = qv ? haystack.includes(qv) : true;
  const passesStore = storeV ? toStr(prod["custom_label_1"]) === storeV : true;
  const passesCat = catV ? toStr(prod["categoria_web"]) === catV : true;
  const passesBrand = brandV ? toStr(prod["brand"]) === brandV : true;

  return passesQuery && passesStore && passesCat && passesBrand;
}

// Lê a planilha, aplica filtros, pula offset e coleta limit
export async function fetchProductsPage({ offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
  const cacheKey = `${offset}:${limit}:${q}:${store}:${cat}:${brand}`;
  const cached = PAGE_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < ONE_DAY_MS) {
    return cached.data;
  }

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return { totalCount: 0, products: [], headers: [] };

  const headersRow = parseCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  let collected = [];
  let totalFiltered = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 1 && row[0].trim() === "") continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });

    if (!matchesFilters(obj, q, store, cat, brand)) continue;

    totalFiltered++;
    if (totalFiltered <= offset) continue;

    if (collected.length < limit) {
      collected.push(normalizeProduct(obj));
    }
  }

  const result = { totalCount: totalFiltered, products: collected, headers };
  PAGE_CACHE.set(cacheKey, { ts: Date.now(), data: result });
  return result;
}

// Busca direta por ID
export async function fetchProductById(targetId) {
  const idKey = String(targetId).trim();
  const cached = ID_CACHE.get(idKey);
  if (cached && (Date.now() - cached.ts) < ONE_DAY_MS) {
    return cached.data;
  }

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return null;

  const headersRow = parseCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 1 && row[0].trim() === "") continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });

    if (String(obj["id"]).trim() === idKey) {
      const product = normalizeProduct(obj);
      ID_CACHE.set(idKey, { ts: Date.now(), data: product });
      return product;
    }
  }

  return null;
}

// Cache para opções de filtro (24h)
const FILTERS_CACHE = { ts: 0, data: null };

// Retorna todas as opções únicas de filtros (lojas, categorias, marcas)
export async function fetchFilterOptions() {
  // Se cache em memória estiver fresco, retorna
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

    // Usa o normalizador para garantir consistência
    const p = normalizeProduct(obj);

    if (p.lojaParceira) {
      stores.add(p.lojaParceira.trim());
    }
    if (p.categoria) {
      categories.add(p.categoria.trim());
    }
    if (p.marca) {
      brands.add(p.marca.trim());
    }
  }

  const result = {
    stores: Array.from(stores).sort(),
    categories: Array.from(categories).sort(),
    brands: Array.from(brands).sort(),
  };

  // Armazena em cache por 24h
  FILTERS_CACHE.ts = Date.now();
  FILTERS_CACHE.data = result;

  return result;
}

