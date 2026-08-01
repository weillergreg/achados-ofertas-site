/* QR Code Generator com logo Buynix no centro
   Dependência: QRCode.js (via CDN) */

function gerarQRComLogo(url, elementId, logoUrl = "/images/buynix/logo-buynix.png", tamanho = 256) {
  try {
    const container = document.getElementById(elementId);
    if (!container) return console.error(`Elemento ${elementId} não encontrado`);

    container.innerHTML = "";
    container.style.position = "relative";
    container.style.width = tamanho + "px";
    container.style.height = tamanho + "px";

    // A biblioteca qrcodejs desenha direto dentro do container passado
    new QRCode(container, {
      text: url,
      width: tamanho,
      height: tamanho,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    // Logo sobreposta no centro (elemento separado por cima do QR)
    const logoTamanho = tamanho * 0.22;
    const logo = document.createElement("img");
    logo.src = logoUrl;
    logo.alt = "";
    logo.style.cssText = `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:${logoTamanho}px; height:${logoTamanho}px; background:#fff; border-radius:6px; padding:4px; box-sizing:content-box; box-shadow:0 0 0 4px #fff;`;
    container.appendChild(logo);
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
