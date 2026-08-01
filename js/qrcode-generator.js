/* QR Code Generator com logo Buynix no centro
   Dependência: QRCode.js (via CDN) */

function gerarQRComLogo(url, elementId, logoUrl = "/images/buynix/logo-buynix.png", tamanho = 256) {
  try {
    const container = document.getElementById(elementId);
    if (!container) return console.error(`Elemento ${elementId} não encontrado`);

    // Limpar conteúdo anterior
    container.innerHTML = "";

    // Criar canvas para o QR
    const canvas = document.createElement("canvas");
    canvas.id = `${elementId}-canvas`;
    container.appendChild(canvas);

    // Gerar QR code usando a biblioteca
    const qr = new QRCode({
      text: url,
      width: tamanho,
      height: tamanho,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H, // Alto nível de correção para comportar logo
    });

    // Obter a imagem do QR
    const qrImage = qr.createImage();
    const qrCanvas = qrImage.canvas || qrImage;

    // Preparar canvas final (maior para caber a logo)
    canvas.width = tamanho;
    canvas.height = tamanho;
    const ctx = canvas.getContext("2d");

    // Desenhar QR no canvas
    ctx.drawImage(qrCanvas, 0, 0, tamanho, tamanho);

    // Adicionar logo Buynix no centro
    const logoImg = new Image();
    logoImg.onload = function () {
      const logoTamanho = tamanho * 0.25; // Logo ocupa 25% do QR
      const logoX = (tamanho - logoTamanho) / 2;
      const logoY = (tamanho - logoTamanho) / 2;

      // Fundo branco para a logo (quadrado)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(logoX - 4, logoY - 4, logoTamanho + 8, logoTamanho + 8);

      // Desenhar logo
      ctx.drawImage(logoImg, logoX, logoY, logoTamanho, logoTamanho);
    };
    logoImg.src = logoUrl;
  } catch (e) {
    console.error("Erro ao gerar QR Code:", e);
  }
}

/* Versão alternativa usando qrcode.min.js (mais simples) */
function gerarQRSimples(url, elementId, tamanho = 256) {
  try {
    const container = document.getElementById(elementId);
    if (!container) return console.error(`Elemento ${elementId} não encontrado`);

    container.innerHTML = "";

    const qr = new QRCode(elementId, {
      text: url,
      width: tamanho,
      height: tamanho,
      colorDark: "#000",
      colorLight: "#fff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (e) {
    console.error("Erro ao gerar QR Code:", e);
  }
}

/* Exportar para uso em outros arquivos */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { gerarQRComLogo, gerarQRSimples };
}
