const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";

// Normaliza objeto de produto (mantém seu padrão)
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

// Parser robusto de CSV que respeita aspas e vírgulas dentro de campos
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

// Export 1: retorna TODOS os produtos (necessário para api/filters.js)
export async function fetchProducts() {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());

  const products = rows.slice(1).map(row => {
    if (row.length === 1 && !row[0].trim()) return null;
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");
    return normalizeProduct(obj);
  }).filter(Boolean);

  return products;
}

// Export 2: paginação simples (carrega tudo e corta os primeiros N)
export async function fetchProductsPage({ offset = 0, limit = 50 }) {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const rows = parseCSV(text);
  if (rows.length < 2) return { totalCount: 0, products: [], headers: [] };

  const headers = rows[0].map(h => h.trim().toLowerCase());

  const productsAll = rows.slice(1).map(row => {
    if (row.length === 1 && !row[0].trim()) return null;
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");
    return normalizeProduct(obj);
  }).filter(Boolean);

  const totalCount = productsAll.length;
  const products = productsAll.slice(offset, offset + limit);

  return { totalCount, products, headers };
}

// Export 3: busca simples por ID
export async function fetchProductById(targetId) {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const rows = parseCSV(text);
  if (rows.length < 2) return null;

  const headers = rows[0].map(h => h.trim().toLowerCase());

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && !row[0].trim()) continue;

    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");

    if (String(obj["id"]).trim() === String(targetId).trim()) {
      return normalizeProduct(obj);
    }
  }
  return null;
}
