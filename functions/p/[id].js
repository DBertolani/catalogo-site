import { fetchProductById } from "../_utils/sheets.js";

export async function onRequest(context) {
  const { params } = context;
  const id = params.id;

  try {
    const produto = await fetchProductById(id);
    if (!produto) {
      return new Response("Produto não encontrado", { status: 404 });
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <title>${produto.nome} — Catálogo</title>
</head>
<body>
  <h1>${produto.nome}</h1>
  ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.nome}" />` : ""}
  <p><strong>Preço:</strong> ${produto.preco}</p>
  <p><strong>Loja:</strong> ${produto.lojaParceira}</p>
  <p><strong>Marca:</strong> ${produto.marca}</p>
  <p>${produto.descricao}</p>
  <p><a href="${produto.linkAfiliado}" target="_blank">${produto.textoBotao}</a></p>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    return new Response(`Erro: ${err.message}`, { status: 500 });
  }
}
