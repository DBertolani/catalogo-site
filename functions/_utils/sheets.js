// Configurações
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos de cache
const SAFE_ROW_LIMIT = 3000; // LIMITE RIGIDO: Processa apenas as primeiras 3000 linhas para não travar a CPU
const MAX_DESC_LENGTH = 150; // Descrições curtas para economizar memória

// Cache Global
let GLOBAL_CACHE = {
  timestamp: 0,
  products: [],
  headers: []
};

// --- HELPERS SIMPLES ---

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

function parseCSVLine(line) {
  // Versão simplificada e rápida do parser
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

function normalizeProduct(obj) {
  let rawDesc = obj["description"] || "";
  if (rawDesc.length > MAX_DESC_LENGTH) {
    rawDesc = rawDesc.substring(0, MAX_DESC_LENGTH) + "...";
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

// --- CARREGAMENTO BLINDADO ---

async function getAllProductsCached() {
  const now = Date.now();
  
  // Retorna cache se válido
  if (GLOBAL_CACHE.products.length > 0 && (now - GLOBAL_CACHE.timestamp) < CACHE_DURATION_MS) {
    return GLOBAL_CACHE;
  }

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 900, cacheEverything: true } });
  if (!res.ok) throw new Error("Erro no Google Sheets");
  
  let text = await res.text();

  // --- CORTE CIRÚRGICO PARA SALVAR CPU ---
  // Em vez de processar 30MB de texto, cortamos nos primeiros ~1MB (aprox 3000 linhas)
  // Calculando média de 400 caracteres por linha -> 3000 * 400 = 1.200.000 chars
  const SAFE_BYTE_LIMIT = 1200000; 
  
  if (text.length > SAFE_BYTE_LIMIT) {
    // Acha a última quebra de linha segura antes do limite
    const cutIndex = text.lastIndexOf('\n', SAFE_BYTE_LIMIT);
    if (cutIndex > 0) {
        text = text.substring(0, cutIndex); // Joga fora o resto do arquivo gigante
    }
  }

  let lines = text.split("\n");
  text = null; // Limpa memória imediatamente

  if (lines.length < 2) return { products: [], headers: [] };

  // Limpa \r
  const headersRow = parseCSVLine(lines[0].replace(/\r$/, ""));
  const headers = headersRow.map(h => h.trim().toLowerCase());
  
  // Mapeamento de índices para evitar busca repetida
  const idxMap = {};
  headers.forEach((h, i) => idxMap[h] = i);
  
  const idIdx = idxMap['id'] !== undefined ? idxMap['id'] : (idxMap['g:id'] !== undefined ? idxMap['g:id'] : 0);

  const parsedProducts = [];
  
  // Loop seguro
  const limitLoop = Math.min(lines.length, SAFE_ROW_LIMIT);

  for (let i = 1; i < limitLoop; i++) {
    let line = lines[i];
    if (!line) continue;
    line = line.replace(/\r$/, "");
    if (line.trim() === "") continue;

    // Validação rápida de tamanho antes de parsear
    // Se a linha for muito curta, nem perde tempo processando
    if (line.length < 10) continue;

    const row = parseCSVLine(line);
    
    // Validação básica de colunas
    if (row.length < headers.length * 0.5) continue;

    const obj = {};
    // Construção manual do objeto
    obj["id"] = row[idIdx] || "";
    obj["title"] = row[idxMap["title"]] || "";
    obj["description"] = row[idxMap["description"]] || "";
    obj["sale_price"] = row[idxMap["sale_price"]] || "";
    obj["price"] = row[idxMap["price"]] || "";
    obj["link"] = row[idxMap["link"]] || "";
    obj["image_link"] = row[idxMap["image_link"]] || "";
    obj["custom_label_1"] = row[idxMap["custom_label_1"]] || "";
    obj["categoria_web"] = row[idxMap["categoria_web"]] || "";
    obj["brand"] = row[idxMap["brand"]] || "";
    obj["facebook_link"] = row[idxMap["facebook_link"]] || "";

    // Validação de ID
    if (!obj["id"] || obj["id"].length > 25 || obj["id"].includes(" ")) continue;

    parsedProducts.push(normalizeProduct(obj));
  }

  lines = null; // Limpa memória

  GLOBAL_CACHE = {
    timestamp: now,
    products: parsedProducts,
    headers: headers
  };

  return GLOBAL_CACHE;
}

// --- ALEATORIEDADE LEVE ---

function getBalancedRandomMix(products, limit) {
  // Embaralhamento simples e rápido (Fisher-Yates shuffle parcial)
  // Como já filtramos a entrada, podemos apenas embaralhar o array.
  
  // Cria uma cópia para não bagunçar o cache original
  let pool = products.slice(); 
  
  // Agrupa por loja para tentar pegar um de cada
  const storesMap = {};
  pool.forEach(p => {
    const s = p.lojaParceira || "Outros";
    if(!storesMap[s]) storesMap[s] = [];
    storesMap[s].push(p);
  });

  // Embaralha cada loja internamente
  Object.keys(storesMap).forEach(k => {
     storesMap[k].sort(() => Math.random() - 0.5);
  });

  const result = [];
  const keys = Object.keys(storesMap).sort(() => Math.random() - 0.5);
  
  let added = true;
  while(result.length < limit && added) {
      added = false;
      for(const k of keys) {
          if(result.length >= limit) break;
          if(storesMap[k].length > 0) {
              result.push(storesMap[k].pop());
              added = true;
          }
      }
  }
  
  return result.sort(() => Math.random() - 0.5);
}

// --- EXPORTS ---

export async function fetchProductsPage({ offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
  try {
      const data = await getAllProductsCached();
      let allProds = data.products;

      const qStr = (q || "").toLowerCase();
      const sStr = (store || "").toLowerCase();
      const cStr = (cat || "").toLowerCase();
      const bStr = (brand || "").toLowerCase();

      let filtered = allProds;

      if (qStr || sStr || cStr || bStr) {
          filtered = allProds.filter(p => {
            if (sStr && (p.lojaParceira || "").toLowerCase() !== sStr) return false;
            if (cStr && (p.categoria || "").toLowerCase() !== cStr) return false;
            if (bStr && (p.marca || "").toLowerCase() !== bStr) return false;
            if (qStr) {
              const haystack = `${p.nome} ${p.marca} ${p.lojaParceira}`.toLowerCase();
              if (!haystack.includes(qStr)) return false;
            }
            return true;
          });
      }

      let finalSelection = [];
      if (offset == 0 && !q && !store && !cat && !brand) {
        finalSelection = getBalancedRandomMix(filtered, limit);
      } else {
        finalSelection = filtered.slice(offset, offset + limit);
      }

      return {
        totalCount: filtered.length,
        products: finalSelection,
        headers: data.headers
      };
  } catch (e) {
      // Em caso de erro fatal, retorna vazio para não dar erro 500 na tela
      return { totalCount: 0, products: [], headers: [] };
  }
}

export async function fetchProductById(targetId) {
  try {
      const data = await getAllProductsCached();
      const idKey = String(targetId).trim();
      return data.products.find(p => String(p.id).trim() === idKey) || null;
  } catch (e) { return null; }
}

export async function fetchFilterOptions() {
  try {
      const data = await getAllProductsCached();
      const stores = new Set();
      const categories = new Set();
      const brands = new Set();

      data.products.forEach(p => {
          if (isValidFilter(p.lojaParceira)) stores.add(cleanValue(p.lojaParceira));
          if (isValidFilter(p.categoria)) categories.add(cleanValue(p.categoria));
          if (isValidFilter(p.marca)) brands.add(cleanValue(p.marca));
      });

      return {
        stores: Array.from(stores).sort(),
        categories: Array.from(categories).sort(),
        brands: Array.from(brands).sort(),
      };
  } catch (e) {
      return { stores: [], categories: [], brands: [] };
  }
}
