export async function onRequest(context) {
  const original = await context.next();
  if (original.status !== 404) {
    return original;
  }

  const url = new URL(context.request.url);
  url.pathname = "/listamaisvendidos/produto/index.html";
  return context.env.ASSETS.fetch(new Request(url, context.request));
}
