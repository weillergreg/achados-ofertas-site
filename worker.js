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

    // Qualquer outra rota: serve o site normalmente (arquivos estáticos)
    return env.ASSETS.fetch(request);
  },
};
