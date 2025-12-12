import { fetchProductById } from "../_utils/sheets.js";

// URL 1: Gestor de Ofertas (Manual)
const API_MANUAL = "https://script.google.com/macros/s/AKfycbxfjjVm4HkUnQfUXv8U6iZx1lcJbkxwyVkLyYRjhHpap8_MunaY7goBE_Fwc-_UeNTi8w/exec";

// URL 2: Feeds Automáticos (Catálogo Antigo - Backup de Segurança)
// (Recuperado do seu index antigo)
const API_FEED = "https://script.google.com/macros/s/AKfycbzsLa-esaH96QQnIeQltFvgI2xFOFytbYZwOqW-w565ILJvIBUmI5RNNbNm8-_9S0IaXA/exec";

export async function onRequest(context) {
    const { params, env, request } = context;
    // Limpa o ID de qualquer espaço ou quebra de linha
    const id = String(params.id).trim(); 

    try {
        let produto = null;

        // ---------------------------------------------------------
        // TENTATIVA 1: Busca no Catálogo Rápido (KV)
        // ---------------------------------------------------------
        try {
            const produtoKV = await fetchProductById(env, id);
            if (produtoKV) {
                produto = produtoKV;
            }
        } catch (err) {
            console.error("Erro KV:", err);
        }

        // ---------------------------------------------------------
        // TENTATIVA 2: Busca nas Ofertas Manuais (Se não achou no KV)
        // ---------------------------------------------------------
        if (!produto) {
            try {
                const res = await fetch(`${API_MANUAL}?type=ofertas`);
                if (res.ok) {
                    const dados = await res.json();
                    // Busca flexível (converte tudo para string)
                    const oferta = dados.find(o => String(o.id).trim() == id);
                    if (oferta) {
                        produto = converterOfertaParaProduto(oferta);
                    }
                }
            } catch (e) { console.error("Erro API Manual:", e); }
        }

        // ---------------------------------------------------------
        // TENTATIVA 3: Busca no Feed Original (Último Recurso)
        // ---------------------------------------------------------
        if (!produto) {
            try {
                // Tenta buscar direto na API do Google (Feed)
                const res = await fetch(`${API_FEED}?api=produto&id=${id}`);
                if (res.ok) {
                    const dados = await res.json();
                    // Verifica se retornou um produto válido (tem nome/id)
                    if (dados && dados.id) {
                        produto = dados;
                    }
                }
            } catch (e) { console.error("Erro API Feed:", e); }
        }

        // ---------------------------------------------------------
        // RESPOSTA FINAL
        // ---------------------------------------------------------

        if (!produto) {
            return new Response(htmlErro(id), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
        }

        const html = gerarHtmlProduto(produto, request.url);
		return new Response(html, { headers: { "Content-Type": "text/html" } });

	} catch (error) {
		return new Response(`Erro interno: ${error.message}`, { status: 500 });
	}
}

// --- FUNÇÕES AUXILIARES ---

function converterOfertaParaProduto(oferta) {
    return {
        nome: oferta.titulo,
        preco: oferta.por || oferta.de,
        imagem: oferta.imagem,
        lojaParceira: oferta.loja,
        marca: oferta.marca || "Oferta",
        categoria: "Oferta Relâmpago",
        descricao: oferta.descricao,
        linkAfiliado: oferta.link,
        facebookLink: oferta.link 
    };
}

function formatMoney(val) {
    if (!val) return "Consulte";
    let num = typeof val === 'string' ? parseFloat(val.replace('R$', '').replace(',', '.')) : val;
    if(isNaN(num)) return val;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function htmlErro(id) {
    return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
	<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-BFZP55CRFY"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-BFZP55CRFY');
</script>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Produto não encontrado</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Open Sans', sans-serif; text-align: center; padding: 50px; color: #333; background: #f8f9fa;}
            h1 { color: #d32f2f; font-family: 'Montserrat', sans-serif; }
            a { color: #007bff; text-decoration: none; font-weight: bold; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Produto Indisponível</h1>
            <p>O produto com ID <strong>${id}</strong> não foi encontrado em nossa base atualizada.</p>
            <br>
            <p><a href="/catalogo">Ver outras ofertas no Catálogo</a></p>
        </div>
    </body>
    </html>`;
}

function gerarHtmlProduto(produto, currentUrl) {
    const precoFormatado = formatMoney(produto.preco);
    const buyLink = produto.linkAfiliado || '#';
    
    // Mensagem WhatsApp
    const msgWhatsApp = `Olha que oferta!\n\n*${produto.nome}*\nPreço: _*${precoFormatado}*_\nLoja: _${produto.lojaParceira || "Parceiro"}_\n\nLink: ${currentUrl}`;

    // Lógica de descrição
    const descCompleta = produto.descricao || '';
    const isLongDesc = descCompleta.length > 200;
    const descCurta = isLongDesc ? descCompleta.substring(0, 200) + '...' : descCompleta;
    const displayReadMore = isLongDesc ? 'inline-block' : 'none';

    return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
	<meta charset="utf-8" />
	<title>${produto.nome} — Melhor Oferta</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:title" content="${produto.nome}">
    <meta property="og:description" content="Confira essa oferta incrível por ${precoFormatado}">
    <meta property="og:image" content="${produto.imagem}">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
	<style>
        * { box-sizing: border-box; }
        body { font-family: 'Open Sans', sans-serif; margin: 0; padding: 0; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; color: #333; }
        
        .container { background-color: #fff; width: 95%; max-width: 900px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: row; margin: 20px; }
        .image-col { width: 45%; background-color: #fff; display: flex; align-items: center; justify-content: center; padding: 20px; border-right: 1px solid #eee; }
        .image-col img { max-width: 100%; max-height: 500px; object-fit: contain; }
        
        .details-col { width: 55%; padding: 40px; display: flex; flex-direction: column; justify-content: center; }
        .store-badge { display: inline-block; background-color: #eee; color: #6f42c1; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9em; margin-bottom: 15px; align-self: flex-start; text-transform: uppercase; }
        h1 { font-size: 1.8em; margin: 0 0 10px 0; line-height: 1.3; font-family: 'Montserrat', sans-serif; }
        .price { font-size: 2.5em; font-weight: 800; color: #28a745; margin: 15px 0 20px 0; letter-spacing: -1px; }
        .info-row { margin-bottom: 8px; color: #555; font-size: 1em; }
        .description-box { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; color: #555; line-height: 1.6; font-size: 0.95em; text-align: left; }
        .read-more-link { color: #007bff; text-decoration: underline; cursor: pointer; margin-top: 5px; }

        .buttons { display: flex; gap: 15px; margin-top: 30px; }
        .btn { flex: 1; padding: 15px; border: none; border-radius: 8px; font-size: 1.1em; font-weight: bold; text-align: center; text-decoration: none; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; color: white; }
        .btn-buy { background-color: #28a745; text-transform: uppercase; }
        .btn-share { background-color: #6c757d; }
        .back-home { margin-top: 20px; text-align: center; }
        .back-home a { color: #007bff; text-decoration: none; font-size: 0.9em; }

        /* MODAL */
        .modal { display: none; position: fixed; z-index: 2000; inset: 0; background-color: rgba(0,0,0,0.8); align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; position: relative; }
        .close-modal { position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; border: none; background: none; }
        .full-description { white-space: pre-wrap; line-height: 1.6; color: #444; }

        /* MOBILE */
        @media (max-width: 768px) {
            .container { flex-direction: column; width: 95%; margin: 10px auto; }
            .image-col { width: 100%; border-right: none; border-bottom: 1px solid #eee; padding: 20px; height: 300px; }
            .details-col { width: 100%; padding: 20px; text-align: center; align-items: center; }
            .store-badge { align-self: center; } 
            h1 { font-size: 1.4em; text-align: center; }
            .price { font-size: 2em; margin: 10px 0; }
            .description-box { text-align: left; width: 100%; }
            .buttons { flex-direction: column; width: 100%; margin-bottom: 20px; } 
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
                <br><a id="openModalBtn" class="read-more-link" style="display:${displayReadMore}">Ler completa</a>
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
                <a href="/catalogo">Voltar para o catálogo</a>
            </div>
        </div>
    </div>

    <div id="descriptionModal" class="modal">
        <div class="modal-content">
            <button class="close-modal" id="closeModalBtn">&times;</button>
            <h3 style="margin-top:0; font-size:1.4em; margin-bottom:15px;">Detalhes do Produto</h3>
            <div class="full-description">${descCompleta}</div>
        </div>
    </div>

    <script>
        const modal = document.getElementById('descriptionModal');
        const openBtn = document.getElementById('openModalBtn');
        const closeBtn = document.getElementById('closeModalBtn');

        if(openBtn) {
            openBtn.onclick = () => { modal.style.display = 'flex'; document.body.classList.add('no-scroll'); }
        }
        if(closeBtn) {
            closeBtn.onclick = () => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }
        }
        window.onclick = (e) => { 
            if(e.target == modal) { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }
        }
    </script>

	<script src="https://www.dwin2.com/pub.750521.min.js" defer="defer"></script>
</body>
</html>
    `;
}
