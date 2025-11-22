// Configurações
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos
const MAX_DESC_STORAGE = 100; // Guarda só 100 letras da descrição na memória (Crucial para 30k produtos!)

// Cache Global: Guarda Arrays compactos para economizar RAM
// Estrutura do array compacto: [ID, Título, Preço, Imagem, Link, Loja, Categoria, Marca, DescriçãoCurta]
let COMPACT_CACHE = {
  timestamp: 0,
  data: [] // Array de arrays (muito mais leve que array de objetos)
};

// --- PARSER CSV OTIMIZADO ---
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

// --- HELPERS DE STRINGS ---
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

// --- CORE: CARREGAMENTO COMPACTO ---

async function getCompactData() {
  const now = Date.now();
  
  // Retorna cache se válido
  if (COMPACT_CACHE.data.length > 0 && (now - COMPACT_CACHE.timestamp) < CACHE_DURATION_MS) {
    return COMPACT_CACHE.data;
  }

  // Baixa CSV
  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 900, cacheEverything: true } });
  if (!res.ok) throw new Error("Erro no Google Sheets");
  
  let text = await res.text();
  let lines = text.split("\n");
  text = null; // Limpa string gigante da memória

  if (lines.length < 2) return [];

  // Mapeia Headers
  const headersRow = parseCSVLine(lines[0].replace(/\r$/, ""));
  const headers = headersRow.map(h => h.trim().toLowerCase());
  const map = {};
  headers.forEach((h, i) => map[h] = i);

  // Índices das colunas importantes
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

  // Processa TUDO (agora cabe na memória pois guardamos arrays compactos)
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (!line || line.length < 10) continue; 
    
    // Otimização: replace simples é mais rápido que regex complexo
    line = line.replace(/\r$/, "");

    const row = parseCSVLine(line);
    if (row.length < headers.length * 0.5) continue;

    const id = row[idxId] || "";
    // Validação de ID (pula lixo)
    if (!id || id.length > 25 || id.includes(" ")) continue;

    // Trunca descrição violentamente para caber 30k itens
    let desc = row[idxDesc] || "";
    if (desc.length > MAX_DESC_STORAGE) {
      desc = desc.substring(0, MAX_DESC_STORAGE) + "...";
    }

    // ARMAZENA COMO ARRAY INDEXADO (Ordem Fixa)
    // 0:ID, 1:Title, 2:Price, 3:Img, 4:Link, 5:Store, 6:Cat, 7:Brand, 8:Desc, 9:FB
    compactList.push([
      id,                             // 0
      row[idxTitle] || "",            // 1
      row[idxPrice] || "",            // 2
      row[idxImg] || "",              // 3
      row[idxLink] || "",             // 4
      row[idxStore] || "",            // 5
      row[idxCat] || "",              // 6
      row[idxBrand] || "",            // 7
      desc,                           // 8
      row[idxFb] || ""                // 9
    ]);
  }

  lines = null; // Limpa linhas da memória

  COMPACT_CACHE = {
    timestamp: now,
    data: compactList
  };

  return compactList;
}

// --- RECONSTRUTOR (Hidratação) ---
// Transforma o array compacto de volta em objeto SÓ para os produtos exibidos
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

// --- LÓGICA DE ALEATORIEDADE ---
function getBalancedRandomMix(compactList, limit) {
  // Reservoir Sampling por Loja
  const storesMap = {};
  const SAMPLE_PER_STORE = 10; // Pega até 10 de cada loja para o sorteio

  for (let i = 0; i < compactList.length; i++) {
    const p = compactList[i];
    const store = p[5] || "Outros"; // Índice 5 é a Loja

    if (!storesMap[store]) storesMap[store] = [];

    if (storesMap[store].length < SAMPLE_PER_STORE) {
      storesMap[store].push(p);
    } else {
      // Chance de substituir para pegar produtos do final da lista
      if (Math.random() < 0.3) {
        const rand = Math.floor(Math.random() * SAMPLE_PER_STORE);
        storesMap[store][rand] = p;
      }
    }
  }

  // Coleta Round Robin
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

  return result.sort(() => Math.random() - 0.5);
}

// --- EXPORTS (API) ---

export async function fetchProductsPage({ offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
  try {
    // Pega a lista completa compacta (30k itens)
    const allCompact = await getCompactData();

    const qStr = (q || "").toLowerCase();
    const sStr = (store || "").toLowerCase();
    const cStr = (cat || "").toLowerCase();
    const bStr = (brand || "").toLowerCase();

    let filtered = allCompact;

    // Filtragem Super Rápida (Array access é mais rápido que Object access)
    if (qStr || sStr || cStr || bStr) {
      filtered = allCompact.filter(row => {
        // Row indices: 1=Title, 5=Store, 6=Cat, 7=Brand
        if (sStr && (row[5] || "").toLowerCase() !== sStr) return false;
        if (cStr && (row[6] || "").toLowerCase() !== cStr) return false;
        if (bStr && (row[7] || "").toLowerCase() !== bStr) return false;
        if (qStr) {
          // Busca apenas no Nome, Marca e Loja (ignora descrição para performance)
          const text = (row[1] + " " + row[7] + " " + row[5]).toLowerCase();
          if (!text.includes(qStr)) return false;
        }
        return true;
      });
    }

    let selection = [];
    
    // Modo Aleatório (Home)
    if (offset == 0 && !q && !store && !cat && !brand) {
      const randomCompact = getBalancedRandomMix(filtered, limit);
      selection = randomCompact.map(hydrateProduct);
    } 
    // Modo Paginação / Busca
    else {
      const sliced = filtered.slice(offset, offset + limit);
      selection = sliced.map(hydrateProduct);
    }

    return {
      totalCount: filtered.length,
      products: selection,
      headers: [] // Headers não são cruciais aqui
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
    // Busca no índice 0 (ID)
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

    // Itera sobre lista compacta (muito mais rápido)
    // Limite de segurança para dropdowns não ficarem gigantes
    const safeLimit = Math.min(allCompact.length, 30000);
    
    for(let i=0; i<safeLimit; i++) {
      const row = allCompact[i];
      // Índices: 5=Loja, 6=Cat, 7=Marca
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
