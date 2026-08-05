// Worker principal do site.
// Cuida do login do painel Decap CMS (GitHub OAuth) em /auth e /callback,
// faz proxy autenticado pra API do GitHub em /gh-api/* (evita limite de 60 pedidos/hora
// por visitante, usando um token compartilhado com limite de 5.000/hora),
// e entrega o resto do site normalmente como arquivos estáticos.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Passo 1 do login: redireciona pro GitHub autorizar o app
    if (url.pathname === "/auth") {
      const clientId = env.GITHUB_CLIENT_ID;
      const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
      return Response.redirect(oauthUrl, 302);
    }

    // Passo 2 do login: troca o código pelo token de acesso e devolve pro painel
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      const resposta = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "achados-ofertas-site-worker" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const dados = await resposta.json();

      if (dados.error) {
        return new Response("Erro ao autenticar: " + dados.error_description, { status: 400 });
      }

      const html = `
        <script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({ token: dados.access_token, provider: "github" })}',
                e.origin
              );
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })();
        </script>
      `;

      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    // Proxy autenticado pra API do GitHub — evita o limite de 60/hora por visitante
    if (url.pathname.startsWith("/gh-api/")) {
      const caminhoGitHub = url.pathname.replace("/gh-api", "");
      const urlGitHub = `https://api.github.com${caminhoGitHub}${url.search}`;

      const headersGitHub = {
        "User-Agent": "achados-ofertas-site-worker",
        "Accept": request.headers.get("Accept") || "application/vnd.github+json",
      };
      // Só manda o cabeçalho de autenticação se o token existir de verdade —
      // assim, se a variável sumir por engano, o site continua funcionando
      // (só volta a valer o limite de 60/hora em vez de 5.000/hora).
      if (env.GITHUB_API_TOKEN) {
        headersGitHub["Authorization"] = `Bearer ${env.GITHUB_API_TOKEN}`;
      }

      const respostaGitHub = await fetch(urlGitHub, { headers: headersGitHub });

      return new Response(respostaGitHub.body, {
        status: respostaGitHub.status,
        headers: {
          "Content-Type": respostaGitHub.headers.get("Content-Type") || "application/json",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // Busca a foto principal de um produto (Shopee/Mercado Livre) — usado pelo importador de CSV
    if (url.pathname === "/buscar-imagem") {
      const urlProduto = url.searchParams.get("url");

      if (!urlProduto) {
        return new Response(JSON.stringify({ erro: "Faltou o parâmetro 'url'" }), {
          status: 400, headers: { "Content-Type": "application/json" }
        });
      }

      // Só aceita domínios conhecidos, pra essa "portinha" não virar um jeito de
      // buscar qualquer site da internet através do nosso servidor
      const dominiosPermitidos = ["shopee.com.br", "s.shopee.com.br", "mercadolivre.com.br", "produto.mercadolivre.com.br", "www.mercadolivre.com.br"];
      let hostProduto;
      try {
        hostProduto = new URL(urlProduto).hostname;
      } catch (e) {
        return new Response(JSON.stringify({ erro: "URL inválida" }), {
          status: 400, headers: { "Content-Type": "application/json" }
        });
      }
      const permitido = dominiosPermitidos.some(d => hostProduto === d || hostProduto.endsWith("." + d));
      if (!permitido) {
        return new Response(JSON.stringify({ erro: "Domínio não permitido" }), {
          status: 403, headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const respostaPagina = await fetch(urlProduto, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          redirect: "follow",
        });
        const html = await respostaPagina.text();

        const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                   || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

        if (!match) {
          return new Response(JSON.stringify({ erro: "Não achei imagem nessa página" }), {
            status: 404, headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ imagem: match[1] }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ erro: "Falha ao buscar a página: " + e.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Recebe um produto capturado pela extensão e publica direto no site
    if (url.pathname === "/api/adicionar-produto" && request.method === "POST") {
      // Confere o segredo — só a extensão sabe esse valor
      const segredoRecebido = request.headers.get("X-Extensao-Secret");
      if (!env.EXTENSAO_SECRET || segredoRecebido !== env.EXTENSAO_SECRET) {
        return new Response(JSON.stringify({ erro: "Não autorizado" }), {
          status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      try {
        const produtoNovo = await request.json();

        if (!produtoNovo.title || !produtoNovo.link) {
          return new Response(JSON.stringify({ erro: "Faltou título ou link" }), {
            status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const caminhoArquivo = "_data/lote-shopee.json";
        const urlConteudo = `https://api.github.com/repos/weillergreg/achados-ofertas-site/contents/${caminhoArquivo}`;

        // 1) Busca o arquivo atual (precisa do SHA pra poder atualizar)
        const respAtual = await fetch(urlConteudo, {
          headers: {
            "Authorization": `Bearer ${env.GITHUB_WRITE_TOKEN}`,
            "User-Agent": "achados-ofertas-site-worker",
            "Accept": "application/vnd.github+json",
          },
        });
        if (!respAtual.ok) {
          return new Response(JSON.stringify({ erro: "Não consegui ler o arquivo atual no GitHub" }), {
            status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        const dadosAtuais = await respAtual.json();
        const conteudoAtual = JSON.parse(atob(dadosAtuais.content));
        const produtosAtuais = conteudoAtual.produtos || [];

        // 2) Gera o slug e monta o produto no formato do site
        const slug = (produtoNovo.title || "")
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim().replace(/\s+/g, "-").replace(/-+/g, "-")
          .slice(0, 70);

        if (produtosAtuais.some(p => p.slug === slug)) {
          return new Response(JSON.stringify({ erro: "Esse produto já existe no site (slug repetido)" }), {
            status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const produtoFormatado = {
          title: produtoNovo.title,
          slug,
          categoria: produtoNovo.categoria || null,
          subcategoria: produtoNovo.subcategoria || null,
          fotos: produtoNovo.foto ? [{ foto: produtoNovo.foto }] : [],
          preco: produtoNovo.preco || null,
          pagamento: null,
          link: produtoNovo.link,
          nota: produtoNovo.nota || null,
          avaliacoes: produtoNovo.avaliacoes || null,
          vendidos: produtoNovo.vendidos || null,
          descricao: null,
          posicao_top100: null,
        };

        const conteudoNovo = { produtos: [...produtosAtuais, produtoFormatado] };

        // 3) Grava de volta no GitHub (commit direto)
        const respGravar = await fetch(urlConteudo, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${env.GITHUB_WRITE_TOKEN}`,
            "User-Agent": "achados-ofertas-site-worker",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `feat: adiciona produto via extensão — ${produtoNovo.title}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(conteudoNovo, null, 2)))),
            sha: dadosAtuais.sha,
          }),
        });

        if (!respGravar.ok) {
          const erroTexto = await respGravar.text();
          return new Response(JSON.stringify({ erro: "Falha ao gravar no GitHub: " + erroTexto }), {
            status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        return new Response(JSON.stringify({ sucesso: true, slug }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ erro: "Erro inesperado: " + e.message }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // Responde o "pré-voo" (CORS) que o navegador manda antes do POST da extensão
    if (url.pathname === "/api/adicionar-produto" && request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Extensao-Secret",
        },
      });
    }

    // Qualquer outra rota: serve o site normalmente (arquivos estáticos)
    return env.ASSETS.fetch(request);
  },
};
