/* Achadinhos Super Espiã — carregamento de dados cadastrados no painel (Decap CMS)
   Lê os arquivos JSON direto do GitHub (repositório público), sem precisar de servidor. */

const REPO = "weillergreg/achados-ofertas-site";
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

async function carregarPasta(pasta) {
  try {
    const resp = await fetch(`${API_BASE}/${pasta}`);
    if (!resp.ok) return [];
    const arquivos = await resp.json();
    const itens = await Promise.all(
      arquivos
        .filter(a => a.name.endsWith(".json"))
        .map(async a => {
          const r = await fetch(a.download_url);
          const dados = await r.json();
          return dados;
        })
    );
    return itens;
  } catch (e) {
    console.error("Erro ao carregar " + pasta, e);
    return [];
  }
}

async function carregarProdutos() {
  const [individuais, lote] = await Promise.all([
    carregarPasta("_produtos"),
    fetch("/_data/lote-shopee.json").then(r => r.ok ? r.json() : { produtos: [] }).then(d => d.produtos || []).catch(() => [])
  ]);
  return [...individuais, ...lote];
}
function carregarCategorias() { return carregarPasta("_categorias"); }
function carregarSubcategorias() { return carregarPasta("_subcategorias"); }
function carregarPosts() { return carregarPasta("_posts"); }
function carregarBanners() { return carregarPasta("_banners"); }

/* Carregar configurações (links de WhatsApp e Telegram) */
async function carregarConfiguracao() {
  try {
    const resp = await fetch("/_config/links.json");
    if (resp.ok) return await resp.json();
    return { whatsapp_link: "", telegram_link: "" };
  } catch (e) {
    console.error("Erro ao carregar configuração:", e);
    return { whatsapp_link: "", telegram_link: "" };
  }
}

/* Armazenar configurações globais */
let CONFIG_SITE = { whatsapp_link: "", telegram_link: "" };

async function inicializarConfiguracao() {
  CONFIG_SITE = await carregarConfiguracao();
}

/* Redirecionamento com telinha de carregando, sem expor o link de destino no hover */
function irComCarregando(url) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:#FAFAFA;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Inter,sans-serif;";
  overlay.innerHTML = `
    <div style="width:56px;height:56px;border:5px solid #ECECEC;border-top-color:#D9A441;border-radius:50%;animation:girar 0.9s linear infinite;"></div>
    <p style="margin-top:20px;font-weight:600;color:#1B3A6B;">Redirecionando para a loja...</p>
    <style>@keyframes girar{to{transform:rotate(360deg);}}</style>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => { window.location.href = url; }, 1400);
}

/* Monta o HTML de um card de produto, reaproveitado em todas as páginas */
function cardProdutoHTML(p) {
  const foto = (p.fotos && p.fotos[0] && p.fotos[0].foto) ? p.fotos[0].foto : "/images/logo-achadinhos.jpg";
  const estrelas = p.nota ? `<div class="produto-estrelas"><span class="estrelas">★★★★★</span><span class="num-avaliacoes">${p.nota}${p.avaliacoes ? " (" + p.avaliacoes + ")" : ""}${p.vendidos ? " · " + p.vendidos : ""}</span></div>` : "";
  const preco = p.preco ? `<div class="produto-preco">R$ ${p.preco}</div>` : "";
  const urlDetalhe = `/produto/${p.slug}`;
  return `
    <div class="prod-card">
      <a class="prod-link" href="${urlDetalhe}">
        <img class="prod-foto" src="${foto}" alt="${p.title}">
        <div class="prod-info">
          <div class="prod-nome">${p.title}</div>
          ${estrelas}
          ${preco}
        </div>
      </a>
      <button class="btn-comprar" onclick="window.location.href='${urlDetalhe}'">Compre aqui</button>
    </div>
  `;
}
