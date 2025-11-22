import { fetchProductById } from "../_utils/sheets.js";

export async function onRequest(context) {
    // CRÍTICO: Desestruturar 'params' e 'env' de context
    const { params, env } = context;
    const id = params.id;

    try {
        // PASSANDO 'env' como primeiro argumento para a função
        const produto = await fetchProductById(env, id);
        
        if (!produto) {
            return new Response("Produto não encontrado", { status: 404 });
        }

        // Mensagem padrão para WhatsApp
        const mensagemWhatsApp = `
Confira este produto!

*${produto.nome}*
*Preço:* R$ ${produto.preco}
*Loja:* ${produto.lojaParceira || "-"}
*Compre agora:* ${produto.facebookLink || produto.linkAfiliado}
        `.trim();

        const html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <title>${produto.nome} — Catálogo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: sans-serif; margin:0; padding:20px; background:#f4f4f4; color:#333; }
    .modal-content {
      background:#fff; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.2);
      max-width:600px; margin:20px auto; padding:20px; overflow-y:auto;
    }
    .modal-content img { max-width:100%; height:auto; display:block; margin:0 auto 15px; border-radius:6px; }
    h2 { font-size:1.4em; margin-bottom:10px; }
    #modalPrice { font-size:1.3em; font-weight:bold; color:#28a745; margin-bottom:10px; }
    .meta { color:#666; margin-bottom:12px; }
    .modal-buttons-container { display:flex; flex-direction:column; gap:10px; margin-top:15px; }
    .btn { padding:10px 15px; border-radius:5px; text-decoration:none; font-weight:bold; text-align:center; }
    .btn-buy { background:#28a745; color:#fff; }
    .btn-buy:hover { background:#218838; }
    .btn-share { background:#6c757d; color:#fff; }
    .btn-share:hover { background:#5a6268; }
  </style>
</head>
<body>
  <div class="modal-content">
    ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.nome}" />` : ""}
    <h2>${produto.nome}</h2>
    <p id="modalPrice">R$ ${produto.preco}</p>
    <p class="meta"><strong>Loja:</strong> ${produto.lojaParceira || "-"} | <strong>Marca:</strong> ${produto.marca || "-"}</p>
    <p>${produto.descricao || "Descrição não disponível."}</p>
    <div class="modal-buttons-container">
      <a href="${produto.linkAfiliado}" target="_blank" class="btn btn-buy">${produto.textoBotao || "Compre na Loja"}</a>
      <a href="https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}" target="_blank" class="btn btn-share">Compartilhar Produto</a>
    </div>
  </div>
</body>
</html>`;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    } catch (err) {
        // Retorna o erro 500 para qualquer falha na API/KV
        return new Response(`Erro ao carregar produto: ${err.message}`, { status: 500 });
    }
}
