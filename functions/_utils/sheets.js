export async function fetchProducts() {
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt4X52USWS4EzuI7V2GvtePpZSSgNKeYdCPGhlAFKrC09XwVcoYmLeRBh5XszmfGV6_RC5J1Avw-WD/pub?gid=155082964&single=true&output=csv";

  const res = await fetch(SHEET_URL, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!res.ok) throw new Error("Falha ao baixar CSV da planilha");
  const text = await res.text();

  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  // mapa de colunas → chave padrão
  const columnMap = {
    id: ["id"],
    nome: ["title", "nome", "product_name"],
    descricao: ["description", "descricao", "detalhes"],
    preco: ["sale_price", "price", "valor"],
    linkAfiliado: ["link", "deeplink", "url"],
    imagem: ["image_link", "foto", "imagem"],
    lojaParceira: ["custom_label_1", "store", "loja"],
    categoria: ["categoria_web", "categoria", "category"],
    marca: ["brand", "marca"]
  };

  function findIndex(aliases) {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const idx = {};
  for (const key in columnMap) {
    idx[key] = findIndex(columnMap[key]);
  }

  const products = lines.slice(1).map(line => {
    const cols = line.split(",");

    // preço: se tiver sale_price válido, usa ele; senão usa price
    let preco = cols[idx.preco] || "";
    if (!preco && idx.price !== -1) preco = cols[idx.price];

    return {
      id: cols[idx.id] || "",
      nome: cols[idx.nome] || "",
      descricao: cols[idx.descricao] || "",
      preco: preco,
      linkAfiliado: cols[idx.linkAfiliado] || "",
      imagem: cols[idx.imagem] || "",
      lojaParceira: cols[idx.lojaParceira] || "",
      categoria: cols[idx.categoria] || "",
      marca: cols[idx.marca] || "",
      textoBotao: `Compre na Loja: ${cols[idx.lojaParceira] || "Parceiro"}`
    };
  });

  return products;
}
