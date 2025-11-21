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

// Utilitário simples (split por vírgula) — suficiente para destravar o build.
// Se sua planilha tiver vírgulas dentro de campos com aspas, considere trocar por um parser com suporte a aspas.
function splitCSVLine(line) {
  return line.split(",");
}

// Export 1: retorna TODOS os produtos (necessário para api/filters.js)
export async function fetchProducts() {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return [];

  const headersRow = splitCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  const products = lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const row = splitCSVLine(line);
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

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return { totalCount: 0, products: [], headers: [] };

  const headersRow = splitCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  const productsAll = lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const row = splitCSVLine(line);
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

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return null;

  const headersRow = splitCSVLine(lines[0]);
  const headers = headersRow.map(h => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const row = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");

    if (String(obj["id"]).trim() === String(targetId).trim()) {
      return normalizeProduct(obj);
    }
  }
  return null;
}
