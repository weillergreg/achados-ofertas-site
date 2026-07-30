export async function onRequest(context) {
  // Primeiro tenta servir um arquivo real (como o post "presentes-dia-dos-pais-2026",
  // que tem pasta própria) — só usa o modelo dinâmico se não achar nada real.
  const original = await context.next();
  if (original.status !== 404) {
    return original;
  }

  const url = new URL(context.request.url);
  url.pathname = "/blognoticia/post/index.html";
  return context.env.ASSETS.fetch(new Request(url, context.request));
}
