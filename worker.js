// Worker principal do site.
// Cuida do login do painel Decap CMS (GitHub OAuth) em /auth e /callback,
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const dados = await resposta.json();

      if (dados.error) {
        return new Response("Erro ao autenticar (debug): " + JSON.stringify(dados), { status: 400 });
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

    // Qualquer outra rota: serve o site normalmente (arquivos estáticos)
    return env.ASSETS.fetch(request);
  },
};
