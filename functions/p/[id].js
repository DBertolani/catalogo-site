import { fetchProductById } from "../_utils/sheets.js";

// URL do seu Script "Gestor de Ofertas"
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfjjVm4HkUnQfUXv8U6iZx1lcJbkxwyVkLyYRjhHpap8_MunaY7goBE_Fwc-_UeNTi8w/exec";

export async function onRequest(context) {
	const { params, env } = context;
	const id = params.id;

	try {
        let produto = null;

        // TENTATIVA 1: Busca no Catálogo Principal (KV - Feeds Automáticos)
        produto = await fetchProductById(env, id);

        // TENTATIVA 2: Se não achou, busca nas Ofertas Manuais (Apps Script)
        if (!produto) {
            try {
                // Chama a API da sua planilha nova
                const res = await fetch(`${APPS_SCRIPT_URL}?type=ofertas`);
                if (res.ok) {
                    const ofertas = await res.json();
                    // Procura o ID na lista de ofertas (ex: OFT-1234)
                    const ofertaEncontrada = ofertas.find(o => String(o.id).trim() === String(id).trim());
                    
                    if (ofertaEncontrada) {
                        // Converte o formato da oferta para o formato padrão do site
                        produto = {
                            nome: ofertaEncontrada.titulo,
                            preco: ofertaEncontrada.por || ofertaEncontrada.de,
                            imagem: ofertaEncontrada.imagem,
                            lojaParceira: ofertaEncontrada.loja,
                            marca: ofertaEncontrada.marca || "Oferta",
                            categoria: "Oferta Relâmpago",
                            descricao: ofertaEncontrada.descricao,
                            linkAfiliado: ofertaEncontrada.link,
                            facebookLink: ofertaEncontrada.link // Usa o mesmo link para compartilhar
                        };
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar ofertas manuais:", e);
            }
        }

        // Se não achou em nenhum dos dois, retorna 404
		if (!produto) {
			return new Response("Produto não encontrado", { status: 404 });
		}

        // --- DAQUI PRA BAIXO É O LAYOUT (MANTIDO IGUAL) ---

        // Função auxiliar de formatação de preço
        const formatMoney = (val) => {
            if (!val) return "Consulte";
            let num = typeof val === 'string' ? parseFloat(val.replace('R$', '').replace(',', '.')) : val;
            if(isNaN(num)) return val;
            return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };
        const precoFormatado = formatMoney(produto.preco);

        // LINK DE COMPRA
        const buyLink = produto.linkAfiliado || '#';
        
        // LINK DE COMPARTILHAMENTO
        const shareLink = produto.facebookLink || produto.linkAfiliado;

        // MENSAGEM WHATSAPP
        const msgWhatsApp = `Olha que oferta!

*${produto.nome}*
Preço: _*${precoFormatado}*_
Loja: _${produto.lojaParceira || "Parceiro"}_

Link: ${shareLink}`;

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
            position: relative; /* Para o botão fechar/voltar */
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
            font-size: 1.8em;
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

        .description-text {
             color: #666; 
             line-height: 1.5; 
             margin-top: 15px; 
             font-size: 0.95em;
             max-height: 150px;
             overflow-y: auto;
			 white-space: pre-wrap;
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
            .description-text { text-align: center; }
            
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
            
            <div class="description-text">
                ${produto.descricao || ''}
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
