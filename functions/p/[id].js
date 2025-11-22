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
[cite_start]    /* CONFIGURAÇÃO GERAL: FONTE, MARGEM E COR DE FUNDO [cite: 1, 2] */
    body { font-family: sans-serif; margin:0; padding:20px; background:#f4f4f4; color:#333; }
    
[cite_start]    /* CONFIGURAÇÃO DO BOX PRINCIPAL (modal-content) [cite: 34, 35, 36] */
    .modal-content {
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      position: relative;
      width: 95%; 
      max-width: 600px;
      max-height: 98vh; 
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 20px;
      overflow-y: auto;
      margin: 20px auto; /* Para centralizar a página estática */
    }
    
[cite_start]    /* CONFIGURAÇÃO DE IMAGEM: TAMANHO E POSIÇÃO [cite: 37] */
    .modal-content img { 
      max-width: 100%;
      height: auto;
      display: block; 
      margin: 0 auto 15px;
    }
    
[cite_start]    /* CONFIGURAÇÃO DO TÍTULO (h2 e #modalTitle) [cite: 70] */
    h2 { font-size: 1.4em; margin-bottom: 10px; }
    
[cite_start]    /* COR DO PREÇO: TAMANHO E COR VERDE (#28a745) [cite: 42] */
    #modalPrice { 
      font-size: 1.3em;
      font-weight: bold;
      color: #28a745;
    }
    
[cite_start]    /* CONFIGURAÇÃO DA DESCRIÇÃO (modal-body) [cite: 41] */
    .modal-body {
      line-height: 1.6;
      margin-bottom: 15px;
    }
    
[cite_start]    /* POSIÇÃO DOS BOTÕES: Centraliza os itens (align-items: center) e define gap [cite: 43] */
    .modal-buttons-container { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      gap: 10px;
      margin-top: 15px;
    }
    
[cite_start]    /* ESTILO BASE DOS BOTÕES (modal-buy-button) - APLICA-SE AOS DOIS BOTÕES [cite: 44, 47, 48] */
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
      width: 100%; /* Garante que ocupem 100% do container */
      box-sizing: border-box;
    }

[cite_start]    /* COR E ESTILO DO BOTÃO DE COMPARTILHAMENTO (#shareProductButton) - COR CINZA (#6c757d) [cite: 44, 46] */
    #shareProductButton {
      background-color: #6c757d;
      color: white;
    }
    #shareProductButton:hover { 
      background-color: #5a6268;
    }
    
[cite_start]    /* COR E ESTILO DO BOTÃO DE COMPRA (#modalBuyButton) - COR VERDE (#28a745) [cite: 47, 49] */
    #modalBuyButton {
      background-color: #28a745;
      color: white;
    }
    #modalBuyButton:hover { 
      background-color: #218838;
    }
    
[cite_start]    /* MEDIA QUERY PARA MOBILE [cite: 69, 70, 71, 72] */
    @media (max-width: 768px) {
      .modal-content { 
        width: 98%;
        max-width: none;
      }
      #modalTitle { 
        font-size: 1.2em; 
      }
      #modalPrice { 
        font-size: 1.2em;
      }
      .modal-buy-button { 
        padding: 10px 15px; 
        font-size: 0.9em;
      }
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
