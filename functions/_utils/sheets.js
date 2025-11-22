// Configurações
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos
const HARD_ROW_LIMIT = 10000; // LIMITE CRÍTICO: Máximo de 10.000 linhas processadas para EVITAR ERRO 1102
const MAX_DESC_STORAGE = 100; // Descrições curtas para salvar RAM.

// Cache Global: Array de arrays (baixa memória)
let COMPACT_CACHE = {
  timestamp: 0,
  data: [] // [ID, Título, Preço, Imagem, Link, Loja, Categoria, Marca, DescriçãoCurta, FBLink]
};

// --- PARSER E HELPERS ---
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

function cleanValue(str) {
  if (!str) return "";
  return str.replace(/^["',]+|["',]+$/g, '').trim();
}

function isValidFilter(str) {
  if (!str) return false;
  const s = str.trim();
  if (s.length < 2 || s.length > 50) return false;
  if (s.includes("http") || s.includes(",,") || s.split(" ").length > 8) return false;
  return true;
}

// Transforma o array compacto de volta em objeto
function hydrateProduct(arr) {
  const store = arr[5] || "Parceiro";
  return {
    id: arr[0],
    nome: arr[1],
    preco: arr[2],
    imagem: arr[3],
    linkAfiliado: arr[4],
    lojaParceira: store,
    categoria: arr[6],
    marca: arr[7],
    descricao: arr[8],
    facebookLink: arr[9],
    textoBotao: `Compre na Loja: ${store}`
  };
}

// --- CORE: CARREGAMENTO COMPACTO E LIMITADO ---

async function getCompactData() {
  const now = Date.now();
  
  if (COMPACT_CACHE.data.length > 0 && (now - COMPACT_CACHE.timestamp) < CACHE_DURATION_MS) {
    return COMPACT_CACHE.data;
  }

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 900, cacheEverything: true } });
  if (!res.ok) throw new Error("Erro no Google Sheets");
  
  let text = await res.text();
  let lines = text.split("\n");
  text = null; 

  if (lines.length < 2) return [];

  const headersRow = parseCSVLine(lines[0].replace(/\r$/, ""));
  const headers = headersRow.map(h => h.trim().toLowerCase());
  const map = {};
  headers.forEach((h, i) => map[h] = i);

  // Índices fixos
  const idxId = map['id'] !== undefined ? map['id'] : map['g:id'];
  const idxTitle = map['title'];
  const idxDesc = map['description'];
  const idxPrice = map['sale_price'] !== undefined ? map['sale_price'] : map['price'];
  const idxLink = map['link'];
  const idxImg = map['image_link'];
  const idxStore = map['custom_label_1'];
  const idxCat = map['categoria_web'];
  const idxBrand = map['brand'];
  const idxFb = map['facebook_link'];

  const compactList = [];
  
  // OTIMIZAÇÃO CRÍTICA: Limita o loop
  const limitLoop = Math.min(lines.length, HARD_ROW_LIMIT);

  for (let i = 1; i < limitLoop; i++) {
    let line = lines[i];
    if (!line || line.length < 10) continue; 
    line = line.replace(/\r$/, "");

    const row = parseCSVLine(line);
    if (row.length < headers.length * 0.5) continue;

    const id = row[idxId] || "";
    if (!id || id.length > 25 || id.includes(" ")) continue;

    let desc = row[idxDesc] || "";
    if (desc.length > MAX_DESC_STORAGE) {
      desc = desc.substring(0, MAX_DESC_STORAGE) + "...";
    }

    // ARMAZENA COMO ARRAY INDEXADO
    compactList.push([
      id, row[idxTitle] || "", row[idxPrice] || "", row[idxImg] || "", row[idxLink] || "", 
      row[idxStore] || "", row[idxCat] || "", row[idxBrand] || "", desc, row[idxFb] || ""
    ]);
  }

  lines = null; 

  COMPACT_CACHE = {
    timestamp: now,
    data: compactList
  };

  return compactList;
}

// --- LÓGICA DE ALEATORIEDADE E AMOSTRAGEM POR LOJA ---

function getBalancedRandomMix(compactList, limit) {
  const storesMap = {};
  const SAMPLE_PER_STORE = 15; 

  // 1. Amostragem por Loja (Scanner nas 10.000 linhas)
  for (let i = 0; i < compactList.length; i++) {
    const p = compactList[i];
    const store = p[5] || "Outros";

    if (!storesMap[store]) storesMap[store] = [];

    if (storesMap[store].length < SAMPLE_PER_STORE) {
      storesMap[store].push(p);
    } else {
      if (Math.random() < 0.3) {
        const rand = Math.floor(Math.random() * SAMPLE_PER_STORE);
        storesMap[store][rand] = p;
      }
    }
  }

  // 2. Coleta Round Robin
  const result = [];
  const storeNames = Object.keys(storesMap).sort(() => Math.random() - 0.5); 
  
  let added = true;
  while(result.length < limit && added) {
    added = false;
    for(const name of storeNames) {
      if(result.length >= limit) break;
      if(storesMap[name].length > 0) {
        result.push(storesMap[name].pop());
        added = true;
      }
    }
  }
  
  return result; // Retorna o array compacto misturado
}

// --- EXPORTS (API) ---

export async function fetchProductsPage({ offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
  try {
    const allCompact = await getCompactData(); // Pega apenas os 10k produtos

    const qStr = (q || "").toLowerCase();
    const sStr = (store || "").toLowerCase();
    const cStr = (cat || "").toLowerCase();
    const bStr = (brand || "").toLowerCase();

    let filtered = allCompact;

    // Filtragem Rápida (funciona apenas nos 10k produtos lidos)
    if (qStr || sStr || cStr || bStr) {
      filtered = allCompact.filter(row => {
        // Índices: 5=Loja, 6=Cat, 7=Marca, 1=Título
        if (sStr && (row[5] || "").toLowerCase() !== sStr) return false;
        if (cStr && (row[6] || "").toLowerCase() !== cStr) return false;
        if (bStr && (row[7] || "").toLowerCase() !== bStr) return false;
        if (qStr) {
          const text = (row[1] + " " + row[7] + " " + row[5]).toLowerCase();
          if (!text.includes(qStr)) return false;
        }
        return true;
      });
    }

    let selection = [];
    
    // Modo Aleatório (Home) - Usa amostragem balanceada
    if (offset == 0 && !q && !store && !cat && !brand) {
      const randomCompact = getBalancedRandomMix(filtered, limit);
      selection = randomCompact.map(hydrateProduct);
    } 
    // Modo Paginação / Busca - Usa slice normal
    else {
      const sliced = filtered.slice(offset, offset + limit);
      selection = sliced.map(hydrateProduct);
    }

    return {
      totalCount: filtered.length, // Total Count é o total de produtos filtrados DENTRO dos 10k lidos
      products: selection,
      headers: []
    };

  } catch (e) {
    console.error(e);
    return { totalCount: 0, products: [], headers: [] };
  }
}

export async function fetchProductById(targetId) {
  try {
    const allCompact = await getCompactData();
    const idKey = String(targetId).trim();
    const found = allCompact.find(row => String(row[0]).trim() === idKey);
    return found ? hydrateProduct(found) : null;
  } catch (e) { return null; }
}

export async function fetchFilterOptions() {
  try {
    const allCompact = await getCompactData();
    const stores = new Set();
    const categories = new Set();
    const brands = new Set();
    
    // Apenas os 10k produtos lidos serão usados para gerar a lista de filtros
    for(const row of allCompact) {
      const s = row[5];
      const c = row[6];
      const b = row[7];

      if (isValidFilter(s)) stores.add(cleanValue(s));
      if (isValidFilter(c)) categories.add(cleanValue(c));
      if (isValidFilter(b)) brands.add(cleanValue(b));
    }

    return {
      stores: Array.from(stores).sort(),
      categories: Array.from(categories).sort(),
      brands: Array.from(brands).sort(),
    };
  } catch (e) {
    return { stores: [], categories: [], brands: [] };
  }
}
