let cachedProducts = null;
let lastUpdated = 0;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";

// Parser simples de CSV respeitando aspas
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

// Normaliza objeto de produto
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
    textoBotao: `Compre na Loja: ${obj["custom_label_1"] || "Parceiro"}`
  };
}

// Carrega todos os produtos da planilha
async function loadProductsFromSheet() {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const rows = parseCSV(text);
  const headers = rows[0].map(h => h.trim().toLowerCase());

  const products = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || "");
    return normalizeProduct(obj);
  });

  cachedProducts = products;
  lastUpdated = Date.now();
  return products;
}

// Export principal: retorna todos os produtos (com cache de 1 dia)
export async function fetchProducts() {
  if (!cachedProducts || (Date.now() - lastUpdated) > ONE_DAY_MS) {
    await loadProductsFromSheet();
  }
  return cachedProducts;
}

// Busca produto por ID
export async function fetchProductById(id) {
  const products = await fetchProducts();
  return products.find(p => String(p.id).trim() === String(id).trim()) || null;
}

// Paginação simples (offset/limit)
export async function fetchProductsPage({ offset = 0, limit = 50 }) {
  const products = await fetchProducts();
  const paginados = products.slice(offset, offset + limit);
  return { totalCount: products.length, products: paginados };
}
