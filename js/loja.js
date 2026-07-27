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

function carregarProdutos() { return carregarPasta("_produtos"); }
function carregarCategorias() { return carregarPasta("_categorias"); }
function carregarSubcategorias() { return carregarPasta("_subcategorias"); }
function carregarPosts() { return carregarPasta("_posts"); }

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
  const estrelas = p.nota ? `<div class="produto-estrelas"><span class="estrelas">★★★★★</span><span class="num-avaliacoes">${p.nota}${p.avaliacoes ? " (" + p.avaliacoes + " avaliações)" : ""}${p.vendidos ? " · " + p.vendidos : ""}</span></div>` : "";
  const preco = p.preco ? `<div class="produto-preco">R$ ${p.preco}</div>` : "";
  return `
    <div class="prod-card">
      <img class="prod-foto" src="${foto}" alt="${p.title}">
      <div class="prod-info">
        <div class="prod-nome">${p.title}</div>
        ${p.descricao ? `<div class="prod-desc">${p.descricao}</div>` : ""}
        ${estrelas}
        ${preco}
        <button class="btn-comprar" onclick="irComCarregando('${(p.link || "").replace(/'/g, "\\'")}')">Compre aqui</button>
      </div>
    </div>
  `;
}
