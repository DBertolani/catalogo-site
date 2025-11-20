import { fetchProducts } from "../_utils/sheets.js";

export async function onRequest(context) {
  const { params } = context;
  const id = params.id;

  try {
    const produtos = await fetchProducts();
    const produto = produtos.find(p => String(p.id) === String(id));

    if (!produto) {
      return new Response("Produto não encontrado", { status: 404 });
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <title>${produto.nome} — Catálogo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${produto.descricao?.substring(0,160) || ""}" />
  <style>
    body { font-family: sans-serif; margin: 20px; background: #f4f4f4; color: #333; }
    .card { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    img { max-width: 100%; border-radius: 6px; margin-bottom: 12px; }
    h1 { margin: 0 0 10px; font-size: 1.5rem; }
    .price { color: #28a745; font-weight: 700; font-size: 1.25rem; margin-bottom: 10px; }
    .meta { color: #666; margin-bottom: 12px; }
    .btn { display: inline-block; padding: 10px 15px; border-radius: 5px; text-decoration: none; font-weight: bold; }
    .btn-buy { background-color: #28a745; color: #fff; }
    .btn-buy:hover { background-color: #218838; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${produto.nome}</h1>
    ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.nome}" />` : ""}
    <p class="price">${produto.preco}</p>
    <p class="meta"><strong>Loja:</strong> ${produto.lojaParceira} | <strong>Marca:</strong> ${produto.marca}</p>
    <p>${produto.descricao || "Descrição não disponível."}</p>
    <p><a class="btn btn-buy" href="${produto.linkAfiliado}" target="_blank" rel="noopener noreferrer">${produto.textoBotao || "Compre na Loja"}</a></p>
  </div>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    return new Response(`Erro ao carregar produto: ${err.message}`, { status: 500 });
  }
}
