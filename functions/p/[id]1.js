import { fetchProductById } from "../_utils/sheets.js";

// URL do seu Script "Gestor de Ofertas" (Para buscar produtos manuais se não achar no KV)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfjjVm4HkUnQfUXv8U6iZx1lcJbkxwyVkLyYRjhHpap8_MunaY7goBE_Fwc-_UeNTi8w/exec";

export async function onRequest(context) {
    // CRÍTICO: Precisamos do 'request' para pegar a URL atual para o compartilhamento
    const { params, env, request } = context;
    const id = params.id;

    try {
        let produto = null;

        // 1. Busca no Catálogo Principal (KV)
        produto = await fetchProductById(env, id);

        // 2. Se não achou, busca nas Ofertas Manuais (Apps Script)
        if (!produto) {
            try {
                const res = await fetch(`${APPS_SCRIPT_URL}?type=ofertas`);
                if (res.ok) {
                    const ofertas = await res.json();
                    const ofertaEncontrada = ofertas.find(o => String(o.id).trim() === String(id).trim());
                    
                    if (ofertaEncontrada) {
                        produto = {
                            nome: ofertaEncontrada.titulo,
                            preco: ofertaEncontrada.por || ofertaEncontrada.de,
                            imagem: ofertaEncontrada.imagem,
                            lojaParceira: ofertaEncontrada.loja,
                            marca: ofertaEncontrada.marca || "Oferta",
                            categoria: "Oferta Relâmpago",
                            descricao: ofertaEncontrada.descricao,
                            linkAfiliado: ofertaEncontrada.link,
                            facebookLink: ofertaEncontrada.link 
                        };
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar ofertas manuais:", e);
            }
        }

        if (!produto) {
            return new Response("Produto não encontrado", { status: 404 });
        }

        // --- FORMATAÇÃO DE DADOS ---

        const formatMoney = (val) => {
            if (!val) return "Consulte";
            let num = typeof val === 'string' ? parseFloat(val.replace('R$', '').replace(',', '.')) : val;
            if(isNaN(num)) return val;
            return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };
        const precoFormatado = formatMoney(produto.preco);

        // Link para a loja (Afiliado)
        const buyLink = produto.linkAfiliado || '#';
        
        // Link para compartilhar: USA A URL ATUAL DA PÁGINA DO PRODUTO
        const currentPageUrl = request.url;

        const msgWhatsApp = `Olha que oferta!\n\n*${produto.nome}*\nPreço: _*${precoFormatado}*_\nLoja: _${produto.lojaParceira || "Parceiro"}_\n\nLink: ${currentPageUrl}`;

        // Lógica de Corte da Descrição
        const descCompleta = produto.descricao || '';
        const isLongDesc = descCompleta.length > 200;
        // Se for longa, corta e põe reticências. Se não, mostra tudo.
        const descCurta = isLongDesc ? descCompleta.substring(0, 200) + '...' : descCompleta;


        // --- HTML DA PÁGINA ---
        const html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>${produto.nome} — Melhor Oferta</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <meta property="og:title" content="${produto.nome}">
    <meta property="og:description" content="Confira essa oferta incrível por ${precoFormatado}">
    <meta property="og:image" content="${produto.imagem}">
    <meta property="og:url" content="${currentPageUrl}">

    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .no-scroll { overflow: hidden; }

        .container {
            background-color: #fff;
            width: 95%;
            max-width: 900px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: row;
            margin: 20px;
            position: relative;
        }

        /* Coluna Imagem */
        .image-col {
            width: 45%;
            background-color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            border-right: 1px solid #eee;
        }

        .image-col img {
            max-width: 100%;
            max-height: 500px;
            object-fit: contain;
        }

        /* Coluna Detalhes */
        .details-col {
            width: 55%;
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .store-badge {
            display: inline-block;
            background-color: #f0f4f8;
            color: #6f42c1;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
            margin-bottom: 15px;
            align-self: flex-start;
            border: 1px solid #e1e8ed;
            text-transform: uppercase;
        }

        h1 {
            font-size: 1.6em;
            margin: 0 0 10px 0;
            color: #1a1a1a;
            line-height: 1.3;
        }

        .price {
            font-size: 2.5em;
            font-weight: 800;
            color: #28a745;
            margin: 15px 0 20px 0;
            letter-spacing: -1px;
        }

        .info-row {
            margin-bottom: 8px;
            color: #555;
            font-size: 1em;
        }
        .info-row strong { color: #333; }

        /* Caixa de Descrição (Sem Scrollbar agora) */
        .description-box {
             color: #666; 
             line-height: 1.6; 
             margin-top: 15px; 
             font-size: 0.95em;
             background-color: #f9f9f9;
             padding: 15px;
             border-radius: 8px;
             text-align: left;
        }

        .read-more-link {
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
            font-weight: 600;
            display: inline-block;
            margin-top: 8px;
        }

        .buttons {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }

        .btn {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: bold;
            text-align: center;
            text-decoration: none;
            cursor: pointer;
            transition: opacity 0.2s;
            display: flex; align-items: center; justify-content: center;
        }
        .btn:hover { opacity: 0.9; }

        .btn-buy { background-color: #28a745; color: white; text-transform: uppercase; }
        .btn-share { background-color: #6c757d; color: white; }

        .back-home {
            margin-top: 20px; text-align: center;
        }
        .back-home a {
            color: #007bff; text-decoration: none; font-size: 0.9em;
        }

        /* --- MODAL (IDÊNTICO AO INDEX) --- */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            inset: 0;
            background-color: rgba(0,0,0,0.8);
            align-items: center;
            justify-content: center;
            padding: 15px;
            backdrop-filter: blur(2px);
        }

        .modal-content {
            background-color: #fff;
            padding: 25px;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
        }

        .close-modal {
            position: absolute;
            top: 15px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #999;
            cursor: pointer;
            background: none;
            border: none;
            line-height: 1;
        }
        .close-modal:hover { color: #333; }

        .modal-title {
            margin-top: 0;
            font-size: 1.4em;
            margin-bottom: 15px;
            padding-right: 30px;
            color: #222;
        }

        .full-description {
            white-space: pre-wrap; /* Respeita os Enters da planilha */
            line-height: 1.6;
            color: #444;
            font-size: 1em;
        }

        /* Responsividade */
        @media (max-width: 768px) {
            .container { flex-direction: column; width: 95%; margin: 10px; }
            .image-col { width: 100%; border-right: none; border-bottom: 1px solid #eee; padding: 20px; height: 300px; }
            
            .details-col { 
                width: 100%; padding: 25px; 
                text-align: center; 
                align-items: center; 
            }
            
            .store-badge { align-self: center; } 
            h1 { font-size: 1.5em; text-align: center; }
            .price { font-size: 2.2em; margin: 10px 0; }
            .description-box { text-align: left; } /* Descrição alinhada a esquerda para leitura */
            
            .buttons { flex-direction: column; width: 100%; }
            .btn { width: 100%; padding: 14px; }
        }
	</style>
</head>
<body>

    <div class="container">
        <div class="image-col">
            <img src="${produto.imagem || 'https://via.placeholder.com/500?text=Oferta'}" alt="${produto.nome}">
        </div>

        <div class="details-col">
            <span class="store-badge">${produto.lojaParceira || "Loja Parceira"}</span>
            <h1>${produto.nome}</h1>
            
            <div class="price">${precoFormatado}</div>
            
            <div class="info-row"><strong>Marca:</strong> ${produto.marca || "-"}</div>
            <div class="info-row"><strong>Categoria:</strong> ${produto.categoria || "-"}</div>
            
            <div class="description-box">
                ${descCurta}
                ${isLongDesc ? `<br><a id="openModalBtn" class="read-more-link">Ler mais</a>` : ''}
            </div>

            <div class="buttons">
                <a href="https://wa.me/?text=${encodeURIComponent(msgWhatsApp)}" target="_blank" class="btn btn-share">
                    Compartilhar
                </a>
                <a href="${buyLink}" target="_blank" class="btn btn-buy">
                    Ir para a Loja
                </a>
            </div>
            
            <div class="back-home">
                <a href="/">Voltar para o catálogo</a>
            </div>
        </div>
    </div>

    <div id="descriptionModal" class="modal">
        <div class="modal-content">
            <button class="close-modal" id="closeModalBtn">&times;</button>
            <h3 class="modal-title">Descrição Completa</h3>
            <div class="full-description">${descCompleta}</div>
            <button class="btn btn-share" style="margin-top:20px; padding:10px;" id="closeModalBtnBottom">Voltar</button>
        </div>
    </div>

    <script>
        // Lógica do Modal
        const modal = document.getElementById('descriptionModal');
        const openBtn = document.getElementById('openModalBtn');
        const closeBtn = document.getElementById('closeModalBtn');
        const closeBtnBottom = document.getElementById('closeModalBtnBottom');

        if (openBtn) {
            openBtn.addEventListener('click', function() {
                modal.style.display = 'flex';
                document.body.classList.add('no-scroll');
            });
        }

        function closeModal() {
            modal.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (closeBtnBottom) closeBtnBottom.addEventListener('click', closeModal);

        // Fechar ao clicar fora
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    </script>

</body>
</html>
    `;

    return new Response(html, {
        headers: { "Content-Type": "text/html" },
    });
    } catch (error) {
        return new Response(`Erro interno: ${error.message}`, { status: 500 });
    }
}
