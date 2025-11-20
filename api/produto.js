export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "ID ausente" });
    }

    const apiUrl = `https://script.google.com/macros/s/AKfycbzsLa-esaH96QQnIeQltFvgI2xFOFytbYZwOqW-w565ILJvIBUmI5RNNbNm8-_9S0IaXA/exec?api=produto&id=${encodeURIComponent(id)}`;

    const resposta = await fetch(apiUrl);

    if (!resposta.ok) {
      return res.status(500).json({
        error: "Erro na API Apps Script",
        status: resposta.status
      });
    }

    const dados = await resposta.json();

    return res.status(200).json(dados);

  } catch (e) {
    return res.status(500).json({ error: `Falha: ${e.message}` });
  }
}
