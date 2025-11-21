export async function onRequest() {
  // Resposta mínima para validar rota sem tocar na planilha
  return new Response(JSON.stringify({
    total: 3,
    products: [
      {
        id: "1",
        nome: "Produto Exemplo A",
        descricao: "Descrição curta",
        preco: "R$ 99,90",
        linkAfiliado: "https://exemplo.com/a",
        imagem: "https://via.placeholder.com/600x400",
        lojaParceira: "Loja A",
        categoria: "Categoria X",
        marca: "Marca 1",
        textoBotao: "Compre na Loja: Loja A"
      },
      {
        id: "2",
        nome: "Produto Exemplo B",
        descricao: "Descrição curta",
        preco: "R$ 149,90",
        linkAfiliado: "https://exemplo.com/b",
        imagem: "https://via.placeholder.com/600x400",
        lojaParceira: "Loja B",
        categoria: "Categoria Y",
        marca: "Marca 2",
        textoBotao: "Compre na Loja: Loja B"
      },
      {
        id: "3",
        nome: "Produto Exemplo C",
        descricao: "Descrição curta",
        preco: "R$ 59,90",
        linkAfiliado: "https://exemplo.com/c",
        imagem: "https://via.placeholder.com/600x400",
        lojaParceira: "Loja C",
        categoria: "Categoria Z",
        marca: "Marca 3",
        textoBotao: "Compre na Loja: Loja C"
      }
    ]
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
