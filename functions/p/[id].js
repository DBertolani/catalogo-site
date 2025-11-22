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
    /* CONFIGURAÇÃO GERAL: FONTE, MARGEM E COR DE FUNDO (body - Index.htmlHubAtual.txt) */
    body { font-family: sans-serif; margin:0; padding:20px; background:#f4f4f4; color:#333; }
    
    /* CONFIGURAÇÃO DO BOX PRINCIPAL (modal-content - Index.htmlHubAtual.txt) */
    .modal-content {
[cite_start]      background-color: #fff; [cite: 35]
      [cite_start]border-radius: 8px; [cite: 35]
      [cite_start]box-shadow: 0 4px 8px rgba(0,0,0,0.2); [cite: 35]
      position: relative;
      width: 95%; /* Para consistência em telas maiores/móveis */
[cite_start]      max-width: 600px; [cite: 35]
      max-height: 98vh; /* Para consistência com o modal real */
      display: flex;
      flex-direction: column;
[cite_start]      box-sizing: border-box; [cite: 36]
      [cite_start]padding: 20px; [cite: 36]
      overflow-y: auto;
      margin: 20px auto; /* Para centralizar a página estática */
    }
    
    /* CONFIGURAÇÃO DE IMAGEM: TAMANHO E POSIÇÃO (modal-content img - Index.htmlHubAtual.txt) */
    .modal-content img { 
[cite_start]      max-width: 100%; [cite: 37]
      [cite_start]height: auto; [cite: 37]
      display: block; 
[cite_start]      margin: 0 auto 15px; [cite: 37]
    }
    
    /* CONFIGURAÇÃO DO TÍTULO (h2 e #modalTitle - Index.htmlHubAtual.txt) */
    h2 { font-size: 1.4em; margin-bottom: 10px; }
    
    /* CONFIGURAÇÃO DO CORPO DA DESCRIÇÃO (modal-body - Index.htmlHubAtual.txt) */
    .modal-body {
[cite_start]      line-height: 1.6; [cite: 41]
      [cite_start]margin-bottom: 15px; [cite: 41]
    }
    
    /* CONFIGURAÇÃO DO PREÇO: TAMANHO E COR VERDE (#modalPrice - Index.htmlHubAtual.txt) */
    #modalPrice { 
[cite_start]      font-size: 1.3em; [cite: 42]
      [cite_start]font-weight: bold; [cite: 42]
      [cite_start]color: #28a745; [cite: 42]
    }
    
    /* CONFIGURAÇÃO DO CONTAINER DOS BOTÕES (modal-buttons-container - Index.htmlHubAtual.txt) */
    .modal-buttons-container { 
      display: flex; 
      flex-direction: column; 
[cite_start]      align-items: center; [cite: 43]
      [cite_start]gap: 10px; [cite: 43]
      [cite_start]margin-top: 15px; [cite: 43]
    }
    
    /* ESTILO BASE DOS BOTÕES (Propriedades comuns de #shareProductButton e #modalBuyButton) */
    .modal-buy-button {
      border: none;
[cite_start]      padding: 10px 15px; [cite: 45, 47]
      text-decoration: none;
[cite_start]      border-radius: 5px; [cite: 45, 47]
      [cite_start]font-weight: bold; [cite: 45, 47]
      [cite_start]font-size: 0.9em; [cite: 45, 47]
      cursor: pointer;
[cite_start]      transition: background-color 0.2s ease; [cite: 45, 47]
      [cite_start]text-align: center; [cite: 45, 47]
      [cite_start]width: 100%; [cite: 48]
      [cite_start]box-sizing: border-box; [cite: 48]
    }

    /* COR E ESTILO DO BOTÃO DE COMPARTILHAMENTO (#shareProductButton - Cor Cinza) */
    #shareProductButton {
[cite_start]      background-color: #6c757d; [cite: 44]
      [cite_start]color: white; [cite: 44]
    }
    #shareProductButton:hover { 
[cite_start]      background-color: #5a6268; [cite: 46]
    }
    
    /* COR E ESTILO DO BOTÃO DE COMPRA (#modalBuyButton - Cor Verde) */
    #modalBuyButton {
[cite_start]      background-color: #28a745; [cite: 47]
      [cite_start]color: white; [cite: 47]
    }
    #modalBuyButton:hover { 
[cite_start]      background-color: #218838; [cite: 49]
    }
    
    /* MEDIA QUERY PARA MOBILE (Baseado em @media (max-width: 768px) - Index.htmlHubAtual.txt) */
    @media (max-width: 768px) {
      .modal-content { 
[cite_start]        width: 98%; [cite: 69]
        [cite_start]max-width: none; [cite: 69]
      }
      h2 { 
        font-size: 1.2em; [cite_start]/* Corresponde a #modalTitle [cite: 70] */
      }
      #modalPrice { 
[cite_start]        font-size: 1.2em; [cite: 71]
      }
[cite_start]      .modal-buy-button { /* Aplica-se aos botões de compartilhamento e compra [cite: 72] */
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
