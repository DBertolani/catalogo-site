// Configurações
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos
const MAX_CACHE_ITEMS = 35000; // Trava de segurança para o Cloudflare (128MB RAM limit)
const MAX_DESC_LENGTH_CACHE = 250; // Truncagem de descrição para economizar RAM

// --- CACHE GLOBAL EM MEMÓRIA ---
let GLOBAL_CACHE = {
  timestamp: 0,
  products: [],
  headers: []
};

// --- HELPERS ---

function cleanValue(str) {
  if (!str) return "";
  return str.replace(/^["',]+|["',]+$/g, '').trim();
}

function isValidFilter(str) {
  if (!str) return false;
  const s = str.trim();
  if (s.length < 2 || s.length > 50) return false;
  if (s.includes("http") || s.includes(",,") || s.split(" ").length > 6) return false;
  return true;
}

function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (insideQuotes && line[i + 1] === '"') { field += '"'; i++; } 
      else { insideQuotes = !insideQuotes; }
    } else if (ch === "," && !insideQuotes) {
      fields.push(field);
      field = "";
    } else { field += ch; }
  }
  fields.push(field);
  return fields;
}

// Normaliza economizando memória
function normalizeProduct(obj) {
  let rawDesc = obj["description"] || "";
  // Corta descrição se for muito longa
  if (rawDesc.length > MAX_DESC_LENGTH_CACHE) {
    rawDesc = rawDesc.substring(0, MAX_DESC_LENGTH_CACHE) + "...";
  }

  return {
    id: obj["id"] || obj["g:id"] || "", 
    nome: obj["title"] || "",
    descricao: rawDesc, 
    preco: obj["sale_price"] || obj["price"] || "",
    linkAfiliado: obj["link"] || "",
    imagem: obj["image_link"] || "",
    lojaParceira: obj["custom_label_1"] || "",
    categoria: obj["categoria_web"] || "",
    marca: obj["brand"] || "",
    facebookLink: obj["facebook_link"] || "",
    textoBotao: `Compre na Loja: ${obj["custom_label_1"] || "Parceiro"}`
  };
}

// --- CARREGAMENTO OTIMIZADO ---

async function getAllProductsCached() {
  const now = Date.now();
  
  if (GLOBAL_CACHE.products.length > 0 && (now - GLOBAL_CACHE.timestamp) < CACHE_DURATION_MS) {
    return GLOBAL_CACHE;
  }

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) throw new Error("Erro no Google Sheets");
  
  let text = await res.text(); 
  let lines = text.split("\n");
  text = null; // Libera memória

  if (lines.length < 2) return { products: [], headers: [] };

  // Remove \r
  for(let k=0; k<lines.length; k++) {
      lines[k] = lines[k].replace(/\r$/, "");
  }

  const headersRow = parseCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());
  const idIndex = headers.findIndex(h => h === 'id' || h === 'g:id');
  const checkIndex = idIndex >= 0 ? idIndex : 0;

  const parsedProducts = [];
  const limitLoop = Math.min(lines.length, MAX_CACHE_ITEMS + 1);

  for (let i = 1; i < limitLoop; i++) {
    const rawLine = lines[i];
    if (!rawLine || rawLine.trim() === "") continue;

    const row = parseCSVLine(rawLine);
    if (row.length < headers.length * 0.5) continue;

    const obj = {};
    for (let h = 0; h < headers.length; h++) {
        obj[headers[h]] = row[h] || "";
    }

    const idValue = obj["id"] || obj["g:id"] || row[checkIndex];
    if (!idValue || idValue.length > 25 || idValue.includes(" ")) continue;

    parsedProducts.push(normalizeProduct(obj));
  }

  lines = null; // Libera memória

  GLOBAL_CACHE = {
    timestamp: now,
    products: parsedProducts,
    headers: headers
  };

  return GLOBAL_CACHE;
}

// --- ALEATORIEDADE COM DIVERSIDADE GARANTIDA ---

function getBalancedRandomMix(products, limit) {
  // Mapa de "Cestinhas" por loja
  const storesMap = {};
  
  // Quantos produtos de cada loja guardamos para o sorteio?
  // 10 é suficiente para garantir variedade sem gastar memória.
  const SAMPLE_PER_STORE = 15; 

  // 1. SCANNER: Percorre TODOS os produtos (sejam 30 ou 30.000)
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const store = p.lojaParceira || "Outros";

    if (!storesMap[store]) {
      storesMap[store] = [];
    }

    // Se a cestinha da loja ainda tem espaço, adiciona.
    if (storesMap[store].length < SAMPLE_PER_STORE) {
      storesMap[store].push(p);
    } 
    else {
      // RESERVOIR SAMPLING:
      // Se a cestinha está cheia, temos uma chance aleatória de trocar um item antigo
      // por este novo. Isso garante que produtos do FINAL da lista (linha 30.000)
      // tenham chance de aparecer, mesmo se a loja já encheu no começo.
      if (Math.random() < 0.2) { // 20% de chance de troca
         const randomIndex = Math.floor(Math.random() * SAMPLE_PER_STORE);
         storesMap[store][randomIndex] = p;
      }
    }
  }

  // 2. EMBARALHA O CONTEÚDO DAS CESTINHAS
  Object.keys(storesMap).forEach(store => {
    storesMap[store].sort(() => Math.random() - 0.5);
  });

  // 3. ROUND ROBIN: Pega um de cada loja alternadamente
  const result = [];
  const storeNames = Object.keys(storesMap);
  
  // Embaralha a ordem das lojas (para não começar sempre pela mesma)
  storeNames.sort(() => Math.random() - 0.5);

  let added = true;
  while (result.length < limit && added) {
    added = false;
    for (const store of storeNames) {
      if (result.length >= limit) break;
      if (storesMap[store].length > 0) {
        result.push(storesMap[store].pop());
        added = true;
      }
    }
  }
  
  // Mistura final para não ficar agrupado visualmente (Loja A, Loja B, Loja C...)
  return result.sort(() => Math.random() - 0.5);
}

// --- EXPORTS ---

export async function fetchProductsPage({ offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
  const data = await getAllProductsCached();
  let allProds = data.products;

  const qStr = (q || "").toLowerCase();
  const sStr = (store || "").toLowerCase();
  const cStr = (cat || "").toLowerCase();
  const bStr = (brand || "").toLowerCase();

  let filtered = allProds;

  // Só filtra se tiver parâmetros
  if (qStr || sStr || cStr || bStr) {
      filtered = allProds.filter(p => {
        if (sStr && (p.lojaParceira || "").toLowerCase() !== sStr) return false;
        if (cStr && (p.categoria || "").toLowerCase() !== cStr) return false;
        if (bStr && (p.marca || "").toLowerCase() !== bStr) return false;
        if (qStr) {
          // Busca otimizada: removemos descrição para performance em 30k itens
          const haystack = `${p.nome} ${p.marca} ${p.lojaParceira}`.toLowerCase();
          if (!haystack.includes(qStr)) return false;
        }
        return true;
      });
  }

  const totalFiltered = filtered.length;
  let finalSelection = [];

  // Lógica de Página Inicial Aleatória e Diversificada
  if (offset == 0 && !q && !store && !cat && !brand) {
    finalSelection = getBalancedRandomMix(filtered, limit);
  } else {
    // Paginação normal para busca ou páginas seguintes
    finalSelection = filtered.slice(offset, offset + limit);
  }

  return {
    totalCount: totalFiltered,
    products: finalSelection,
    headers: data.headers
  };
}

export async function fetchProductById(targetId) {
  const data = await getAllProductsCached();
  const idKey = String(targetId).trim();
  return data.products.find(p => String(p.id).trim() === idKey) || null;
}

export async function fetchFilterOptions() {
  const data = await getAllProductsCached();
  const stores = new Set();
  const categories = new Set();
  const brands = new Set();

  // Limita a iteração de filtros para evitar travamento em listas gigantes
  const limit = Math.min(data.products.length, 25000); 
  for(let i=0; i<limit; i++) {
      const p = data.products[i];
      if (isValidFilter(p.lojaParceira)) stores.add(cleanValue(p.lojaParceira));
      if (isValidFilter(p.categoria)) categories.add(cleanValue(p.categoria));
      if (isValidFilter(p.marca)) brands.add(cleanValue(p.marca));
  }

  return {
    stores: Array.from(stores).sort(),
    categories: Array.from(categories).sort(),
    brands: Array.from(brands).sort(),
  };
}
