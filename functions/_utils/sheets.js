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
  // 1. Verifica Cache
  if (FILTERS_CACHE.data && (Date.now() - FILTERS_CACHE.ts) < ONE_DAY_MS) {
    return FILTERS_CACHE.data;
  }

  // 2. Fetch da Planilha
  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  // CUIDADO AQUI: O split("\n") simples é o causador do problema original,
  // mas vamos mitigar filtrando as linhas ruins abaixo.
  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));

  if (lines.length < 2) {
    return { stores: [], categories: [], brands: [] };
  }

  const headersRow = parseCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  const stores = new Set();
  const categories = new Set();
  const brands = new Set();

  // Identifica índice do ID (geralmente 'id' ou 'g:id') para validação
  // Se não encontrar, assume que a primeira coluna é o ID
  const idIndex = headers.findIndex(h => h === 'id' || h === 'g:id');
  const checkIndex = idIndex >= 0 ? idIndex : 0; 

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    
    // Pula linhas vazias
    if (!rawLine || rawLine.trim() === "") continue;

    const row = parseCSVLine(rawLine);

    // --- CORREÇÃO PRINCIPAL ---
    // Se a linha explodiu por causa de um \n na descrição, ela terá poucas colunas
    // ou a primeira coluna (ID) não parecerá um ID.
    
    // 1. Checagem de colunas: Se tiver muito menos colunas que o header, é lixo.
    if (row.length < headers.length * 0.5) continue;

    // 2. Monta o Objeto
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });

    // 3. Validação Rígida: Se não tem ID, é resto de descrição de outra linha.
    // Adapte 'obj.id' para o nome exato da sua coluna de ID no CSV se for diferente.
    const idValue = obj["id"] || obj["g:id"] || row[checkIndex];
    if (!idValue || idValue.length > 20 || idValue.includes(" ")) {
       // IDs geralmente são curtos e sem espaços no meio (ex: "1234", "SKU-99").
       // Se o ID for "propiciando mais tempo...", é lixo.
       continue;
    }

    // --- COLETA DOS DADOS ---

    // Usa normalizeProduct se possível, ou limpa manualmente
    // Se normalizeProduct retornar null para dados inválidos, melhor ainda.
    // const product = normalizeProduct(obj); 

    // Adiciona Lojas (custom_label_1)
    if (obj["custom_label_1"]) {
      const val = cleanValue(obj["custom_label_1"]);
      if (isValidFilter(val)) stores.add(val);
    }

    // Adiciona Categorias (categoria_web)
    if (obj["categoria_web"]) {
      const val = cleanValue(obj["categoria_web"]);
      if (isValidFilter(val)) categories.add(val);
    }

    // Adiciona Marcas (brand)
    if (obj["brand"]) {
      const val = cleanValue(obj["brand"]);
      if (isValidFilter(val)) brands.add(val);
    }
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

// --- FUNÇÕES AUXILIARES (Adicione no mesmo arquivo ou fora da func) ---

function cleanValue(str) {
  if (!str) return "";
  // Remove aspas extras, espaços e caracteres estranhos do início/fim
  return str.replace(/^["',]+|["',]+$/g, '').trim();
}

function isValidFilter(str) {
  // Filtra valores que claramente não são nomes de filtros válidos
  if (!str) return false;
  if (str.length < 2) return false; // Muito curto
  if (str.length > 50) return false; // Muito longo (provável erro de parsing)
  if (str.includes("http")) return false; // É uma URL
  if (str.includes(",,") || str.includes("  ")) return false; // Lixo de CSV
  return true;
}
