import { fetchProductById } from "../_utils/sheets.js";

export async function onRequest(context) {
	const { params, env } = context;
	const id = params.id;

	try {
		const produto = await fetchProductById(env, id);
		if (!produto) {
			return new Response("Produto não encontrado", { status: 404 });
		}

        // Função auxiliar de formatação de preço dentro do script
        const formatMoney = (val) => {
            let num = typeof val === 'string' ? parseFloat(val.replace('R$', '').replace(',', '.')) : val;
            if(isNaN(num)) return val;
            return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };
        const precoFormatado = formatMoney(produto.preco);

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
        }
        .btn:hover { opacity: 0.9; }

        .btn-buy { background-color: #28a745; color: white; }
        .btn-share { background-color: #6c757d; color: white; }

        /* Responsividade */
        @media (max-width: 768px) {
            .container { flex-direction: column; margin: 10px; width: 95%; }
            .image-col { width: 100%; border-right: none; border-bottom: 1px solid #eee; padding: 20px; }
            .details-col { width: 100%; padding: 25px; box-sizing: border-box; }
            h1 { font-size: 1.4em; }
            .price { font-size: 2em; }
            .buttons { flex-direction: column; }
        }
	</style>
</head>
<body>

    <div class="container">
        <div class="image-col">
            <img src="${produto.imagem}" alt="${produto.nome}">
        </div>

        <div class="details-col">
            <span class="store-badge">${produto.lojaParceira || "Loja Parceira"}</span>
            <h1>${produto.nome}</h1>
            
            <div class="price">${precoFormatado}</div>
            
            <div class="info-row"><strong>Marca:</strong> ${produto.marca || "-"}</div>
            <div class="info-row"><strong>Categoria:</strong> ${produto.categoria || "-"}</div>
            
            <p style="color:#666; line-height:1.5; margin-top:15px; font-size:0.95em;">
                ${(produto.descricao || '').substring(0, 150)}...
            </p>

            <div class="buttons">
                <a href="https://wa.me/?text=${encodeURIComponent(`Olha essa oferta: ${produto.nome} por ${precoFormatado}`)}" target="_blank" class="btn btn-share">
                    Compartilhar
                </a>
                <a href="${produto.linkAfiliado || produto.facebookLink}" target="_blank" class="btn btn-buy">
                    Comprar na Loja
                </a>
            </div>
            
            <div style="margin-top:20px; text-align:center;">
                <a href="/" style="color:#007bff; text-decoration:none; font-size:0.9em;">Voltar para o catálogo</a>
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
