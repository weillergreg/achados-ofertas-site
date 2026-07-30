export async function onRequest({ request, env }) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

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
