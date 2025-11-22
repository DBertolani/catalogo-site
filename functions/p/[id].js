import { fetchProductById } from "../_utils/sheets.js";

export async function onRequest(context) {
	// 1. CORREÇÃO DE FUNCIONALIDADE: Desestruturar 'params' E 'env'. 'env' é necessário para acessar o KV.
	const { params, env } = context;
	const id = params.id;

	try {
		// 1. CORREÇÃO DE FUNCIONALIDADE: Passar 'env' para a função de busca
		const produto = await fetchProductById(env, id);
		if (!produto) {
			return new Response("Produto não encontrado", { status: 404 });
		}

		// Mensagem padrão para WhatsApp, usada no botão Compartilhar
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
    /* ---------------------------------------------------------------------- */
    /* REPLICAÇÃO INTEGRAL DO LAYOUT DO MODAL (Index.htmlHubAtual.txt) */
    /* ---------------------------------------------------------------------- */

    body {
        font-family: sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f4f4f4;
        color: #333;
        display: flex; /* Para centralizar o modal-content */
        justify-content: center;
        align-items: flex-start; /* Alinha no topo, mas permite margem */
        min-height: 100vh;
    }

    /* Estrutura Principal do Modal - Replicando .modal-content */
    .modal-content {
        background-color: #fff;
        /* CONFIGURAÇÃO DE POSICIONAMENTO E CENTRALIZAÇÃO */
        margin-top: 50px; /* Margem do topo para destaque na página estática */
        padding: 20px;
        border: 1px solid #888;
        width: 90%;
        max-width: 800px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        display: flex;
        gap: 20px;
    }

    /* Estilo da Imagem */
    #modalImage {
        width: 40%;
        max-width: 300px;
        height: auto;
        object-fit: contain;
        border-radius: 8px;
        align-self: flex-start; /* Para alinhar a imagem no topo */
    }

    #modalProductDetails {
        flex-grow: 1;
        /* CONFIGURAÇÃO DE FONTES */
    }

    #modalTitle {
        font-size: 1.8em;
        margin-top: 0;
        color: #333;
    }

    /* CONFIGURAÇÃO DE FONTES (PREÇO) */
    #modalPrice {
        font-size: 1.5em;
        font-weight: bold;
        color: #007bff; /* Cor de destaque para o preço */
    }

    /* CONTAINER DE BOTÕES */
    .modal-buttons-container {
        display: flex;
        flex-direction: column; /* Coluna para empilhar em desktop */
        gap: 10px;
        margin-top: 25px;
        /* CONFIGURAÇÃO DE CENTRALIZAÇÃO */
        align-items: center; /* CENTRALIZAÇÃO de botões */
        width: 100%;
    }

    /* Estilo Base dos Botões */
    .modal-button {
        padding: 12px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1em;
        font-weight: bold;
        text-align: center;
        transition: background-color 0.3s;
        width: 100%;
        text-decoration: none;
        display: block;
    }

    /* CONFIGURAÇÃO DE CORES (Botão Comprar) */
    #modalBuyButton {
        background-color: #28a745; /* Cor: VERDE #28a745 */
        color: white;
    }
    #modalBuyButton:hover {
        background-color: #218838;
    }

    /* CONFIGURAÇÃO DE CORES (Botão Compartilhar) */
    #shareProductButton {
        background-color: #6c757d; /* Cor: CINZA #6c757d */
        color: white;
    }
    #shareProductButton:hover {
        background-color: #5a6268;
    }

    /* ---------------------------------------------------------------------- */
    /* BLOCO RESPONSIVO */
    /* ---------------------------------------------------------------------- */
    @media (max-width: 768px) {
        .modal-content {
            flex-direction: column; /* Empilha imagem e detalhes */
            width: 95%;
            margin-top: 20px;
            gap: 0;
        }

        #modalImage {
            width: 100%;
            max-width: none;
            margin-bottom: 15px;
        }

        /* Redução de Fontes (modalTitle e modalPrice) */
        #modalTitle {
            font-size: 1.5em; 
        }

        #modalPrice {
            font-size: 1.2em;
        }

        /* Botões lado a lado em telas menores */
        .modal-buttons-container {
            flex-direction: row; 
            flex-wrap: wrap; /* Permite quebras se necessário */
        }
        
        /* Ajuste de padding nos botões em telas menores */
        .modal-button {
            padding: 10px 15px;
            font-size: 0.9em;
            flex-basis: calc(50% - 5px); /* Divide o espaço igualmente - ajuste conforme a necessidade exata do modal original */
        }
    }
	</style>
</head>
<body>
    <!-- Estrutura HTML do Modal de Produto Replicada -->
    <div class="modal-content">
        ${produto.imagem ? `<img id="modalImage" src="${produto.imagem}" alt="${produto.nome}" />` : ""}
        <div id="modalProductDetails">
            <h2 id="modalTitle">${produto.nome}</h2>
            <p><strong>Preço:</strong> <span id="modalPrice">R$ ${produto.preco}</span></p>
            <p><strong>Loja Parceira:</strong> <span id="modalStore">${produto.lojaParceira || "-"}</span></p>
            <p><strong>Marca:</strong> <span id="modalBrand">${produto.marca || "-"}</span></p>
            <p><strong>Descrição:</strong> <span id="modalDescription">${produto.descricao || "-"}</span></p>
            <p><strong>Categoria:</strong> <span id="modalCategory">${produto.categoria || "-"}</span></p>
            <p><strong>Subcategoria:</strong> <span id="modalSubcategory">${produto.subCategoria || "-"}</span></p>

            <!-- Container de Botões (Replicação Exata) -->
            <div class="modal-buttons-container">
                <!-- Botão Compartilhar: cor cinza #6c757d -->
                <a id="shareProductButton" class="modal-button" href="https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}" target="_blank">
                    Compartilhar
                </a>
                <!-- Botão Comprar: cor verde #28a745 -->
                <a id="modalBuyButton" class="modal-button" href="${produto.linkAfiliado || produto.facebookLink}" target="_blank">
                    Comprar Agora
                </a>
            </div>
        </div>
    </div>
</body>
</html>
    `;

		return new Response(html, {
			headers: { "Content-Type": "text/html" },
		});
	} catch (error) {
		console.error("Erro ao buscar ou renderizar produto:", error);
		return new Response(`Erro interno do servidor: ${error.message}`, { status: 500 });
	}
}
