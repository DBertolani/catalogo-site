import { fetchProductById } from "../_utils/sheets.js";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfjjVm4HkUnQfUXv8U6iZx1lcJbkxwyVkLyYRjhHpap8_MunaY7goBE_Fwc-_UeNTi8w/exec";

export async function onRequest(context) {
	const { params, env, request } = context;
	const id = params.id;

	try {
        let produto = null;
        produto = await fetchProductById(env, id);

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
            } catch (e) { console.error("Erro ofertas manuais:", e); }
        }

		if (!produto) {
			return new Response("Produto não encontrado", { status: 404 });
		}

        const formatMoney = (val) => {
            if (!val) return "Consulte";
            let num = typeof val === 'string' ? parseFloat(val.replace('R$', '').replace(',', '.')) : val;
            if(isNaN(num)) return val;
            return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };
        const precoFormatado = formatMoney(produto.preco);
        const buyLink = produto.linkAfiliado || '#';
        const shareLink = request.url; 
        const msgWhatsApp = `Olha que oferta!\n\n*${produto.nome}*\nPreço: _*${precoFormatado}*_\nLoja: _${produto.lojaParceira || "Parceiro"}_\n\nLink: ${shareLink}`;

        // Descrição curta
        const descCompleta = produto.descricao || '';
        const descCurta = descCompleta.length > 200 ? descCompleta.substring(0, 200) + '...' : descCompleta;
        const displayReadMore = descCompleta.length > 200 ? 'inline-block' : 'none';

		const html = `
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
        
        .details-col { width: 55%; padding: 40px; display: flex; flex-direction: column; }
        .store-badge { display: inline-block; background-color: #eee; color: #6f42c1; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9em; margin-bottom: 15px; align-self: flex-start; text-transform: uppercase; }
        h1 { font-size: 1.8em; margin: 0 0 10px 0; line-height: 1.3; }
        .price { font-size: 2.5em; font-weight: 800; color: #28a745; margin: 15px 0 20px 0; letter-spacing: -1px; }
        .info-row { margin-bottom: 8px; color: #555; font-size: 1em; }
        .description-box { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; color: #555; line-height: 1.6; font-size: 0.95em; }
        .read-more-link { color: #007bff; text-decoration: underline; cursor: pointer; margin-top: 5px; }

        .buttons { display: flex; gap: 15px; margin-top: 30px; }
        .btn { flex: 1; padding: 15px; border: none; border-radius: 8px; font-size: 1.1em; font-weight: bold; text-align: center; text-decoration: none; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; }
        .btn-buy { background-color: #28a745; text-transform: uppercase; }
        .btn-share { background-color: #6c757d; }
        .back-home { margin-top: 20px; text-align: center; }
        .back-home a { color: #007bff; text-decoration: none; font-size: 0.9em; }

        /* MODAL (Para descrição completa) */
        .modal { display: none; position: fixed; z-index: 2000; inset: 0; background-color: rgba(0,0,0,0.8); align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; position: relative; }
        .close-modal { position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; border: none; background: none; }

        /* MOBILE */
        @media (max-width: 768px) {
            .container { flex-direction: column; width: 95%; margin: 10px auto; }
            .image-col { width: 100%; border-right: none; border-bottom: 1px solid #eee; padding: 20px; height: 300px; }
            
            /* CORREÇÃO: Permite scroll se o conteúdo for grande */
            .details-col { width: 100%; padding: 20px; overflow-y: auto; }
            
            h1 { font-size: 1.4em; }
            .price { font-size: 2em; margin: 10px 0; }
            .buttons { flex-direction: column; width: 100%; margin-bottom: 20px; } /* Margem extra no final */
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
                <a href="https://wa.me/?text=${encodeURIComponent(msgWhatsApp)}" target="_blank" class="btn btn-share">Compartilhar</a>
                <a href="${buyLink}" target="_blank" class="btn btn-buy">Ir para a Loja</a>
            </div>
            
            <div class="back-home"><a href="/">Voltar para o catálogo</a></div>
        </div>
    </div>

    <!-- MODAL DE DESCRIÇÃO -->
    <div id="descriptionModal" class="modal">
        <div class="modal-content">
            <button class="close-modal" id="closeModalBtn">&times;</button>
            <h3>Detalhes do Produto</h3>
            <div style="white-space: pre-wrap; line-height: 1.6; color: #444;">${descCompleta}</div>
        </div>
    </div>

    <script>
        const modal = document.getElementById('descriptionModal');
        const openBtn = document.getElementById('openModalBtn');
        const closeBtn = document.getElementById('closeModalBtn');

        if(openBtn) openBtn.onclick = () => modal.style.display = 'flex';
        if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; }
    </script>

</body>
</html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
    } catch (error) {
        return new Response(`Erro interno: ${error.message}`, { status: 500 });
    }
}
