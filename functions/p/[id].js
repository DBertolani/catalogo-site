import { fetchProductById } from "../_utils/sheets.js";

export async function onRequest(context) {
  // CORREÇÃO CRÍTICA: Desestruturar 'params' E 'env'. 'env' é necessário para acessar o KV.
  const { params, env } = context;
  const id = params.id;

  try {
    // CORREÇÃO CRÍTICA: Passar 'env' para a função de busca
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
    /* CONFIGURAÇÃO GERAL: FONTE, MARGEM E COR DE FUNDO (Igual a body no Index.htmlHubAtual.txt) */
    body { font-family: sans-serif; margin:0; padding:20px; background:#f4f4f4; color:#333; }
    
    /* CONFIGURAÇÃO DO BOX PRINCIPAL (Baseado em .modal-content do Index.htmlHubAtual.txt) */
    .modal-content {
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      max-width: 600px; /* Mantido o max-width para desktop */
      margin: 20px auto; /* Centraliza na página */
      padding: 20px;
      overflow-y: auto;
      display: flex; /* Adicionado para consistência */
      flex-direction: column; /* Adicionado para consistência */
    }
    
    /* CONFIGURAÇÃO DE IMAGEM: TAMANHO E POSIÇÃO (Baseado em .modal-content img) */
    .modal-content img { 
      max-width: 100%; 
      height: auto; 
      display: block; 
      margin: 0 auto 15px; 
    }
    
    /* CONFIGURAÇÃO DO TÍTULO (H2) */
    h2 { font-size: 1.4em; margin-bottom: 10px; }
    
    /* CONFIGURAÇÃO DO PARÁGRAFO DE DETALHES (Baseado em .modal-body) */
    .modal-body {
      line-height: 1.6;
      margin-bottom: 15px;
    }
    
    /* CONFIGURAÇÃO DO PREÇO: TAMANHO E COR VERDE (#28a745) */
    #modalPrice { 
      font-size: 1.3em; 
      font-weight: bold; 
      color: #28a745;
      margin-bottom: 10px; /* Adicionado para espaçamento, se necessário */
    }
    
    /* CONFIGURAÇÃO DO CONTAINER DOS BOTÕES: POSIÇÃO E ESPAÇAMENTO */
    .modal-buttons-container { 
      display: flex; 
      flex-direction: column; 
      align-items: center; /* Alinha ao centro, como no modal */
      gap: 10px; 
      margin-top: 15px; 
    }
    
    /* ESTILO BASE DOS BOTÕES (Usando a classe .modal-buy-button do seu Index.htmlHubAtual.txt) */
    .modal-buy-button {
      border: none;
      padding: 10px 15px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 0.9em;
      cursor: pointer;
      transition: background-color 0.2s ease;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
    }

    /* COR E ESTILO DO BOTÃO DE COMPARTILHAMENTO (Baseado em #shareProductButton - Cor Cinza) */
    #shareProductButton {
      background-color: #6c757d;
      color: white;
    }
    #shareProductButton:hover { 
      background-color: #5a6268; 
    }
    
    /* COR E ESTILO DO BOTÃO DE COMPRA (Baseado em #modalBuyButton - Cor Verde) */
    #modalBuyButton {
      background-color: #28a745;
      color: white;
    }
    #modalBuyButton:hover { 
      background-color: #218838; 
    }
    
    /* Media Query para Mobile (Baseado em @media (max-width: 768px) do modal) */
    @media (max-width: 768px) {
      .modal-buy-button { padding: 10px 15px; font-size: 0.9em; }
    }
  </style>
</head>
<body>
  <div class="modal-content">
        <div id="modalProductDetails">
      ${produto.imagem ? `<img id="modalImage" src="${produto.imagem}" alt="${produto.nome}" />` : ""}
      <h2 id="modalTitle">${produto.nome}</h2>
            <p><strong>Preço:</strong> <span id="modalPrice">R$ ${produto.preco}</span></p>
      <p><strong>Loja Parceira:</strong> <span id="modalStore">${produto.lojaParceira || "-"}</span></p>
      <p><strong>Marca:</strong> <span id="modalBrand">${produto.marca || "-"}</span></p>

      <div class="modal-body">
        <p id="modalDescription">${produto.descricao || "Descrição não disponível."}</p>
              </div>

      <div class="modal-buttons-container">
                <a href="https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}" target="_blank" class="modal-buy-button" id="shareProductButton">Compartilhar Produto</a>
                <a href="${produto.linkAfiliado}" target="_blank" class="modal-buy-button" id="modalBuyButton">${produto.textoBotao || "Compre na Loja"}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    return new Response(`Erro ao carregar produto: ${err.message}`, { status: 500 });
  }
}
