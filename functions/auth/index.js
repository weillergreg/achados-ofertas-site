export async function onRequest({ env }) {
  const clientId = env.GITHUB_CLIENT_ID;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
  return Response.redirect(url, 302);
}
