// Função para parsear CSV respeitando aspas
function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        field += '"'; // aspas escapadas
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

export async function fetchProducts() {
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const rows = parseCSV(text);
  const headers = rows[0].map(h => h.trim().toLowerCase());

  // Mapeia todas as colunas dinamicamente
  const products = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });

    // Normaliza alguns campos principais
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
  });

  return products;
}
