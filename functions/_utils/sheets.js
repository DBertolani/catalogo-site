const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";

// Já existente no seu arquivo:
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

// NOVO: export que estava faltando e quebra o build se não existir
export async function fetchProducts() {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return [];

  const headersRow = lines[0].split(",");
  const headers = headersRow.map(h => h.trim().toLowerCase());

  const products = lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const row = line.split(",");
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");
    return normalizeProduct(obj);
  }).filter(Boolean);

  return products;
}

// Já existente: fetchProductsPage e fetchProductById permanecem como estão
export async function fetchProductsPage({ offset = 0, limit = 50 }) {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return { totalCount: 0, products: [], headers: [] };

  const headersRow = lines[0].split(",");
  const headers = headersRow.map(h => h.trim().toLowerCase());

  const products = lines.slice(1).map(line => {
    const row = line.split(",");
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");
    return normalizeProduct(obj);
  });

  const totalCount = products.length;
  const paginados = products.slice(offset, offset + limit);

  return { totalCount, products: paginados, headers };
}

export async function fetchProductById(targetId) {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
  if (lines.length < 2) return null;

  const headersRow = lines[0].split(",");
  const headers = headersRow.map(h => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx] || "");
    if (String(obj["id"]).trim() === String(targetId).trim()) {
      return normalizeProduct(obj);
    }
  }
  return null;
}
