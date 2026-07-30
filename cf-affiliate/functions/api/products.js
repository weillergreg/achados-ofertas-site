// functions/api/products.js
// Cloudflare Pages Function — GET /api/products
//
// Requer um binding D1 chamado DB no wrangler.toml, ex:
//
// [[d1_databases]]
// binding = "DB"
// database_name = "loja-afiliados"
// database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
//
// Parâmetros de query suportados:
//   ?page=1&limit=24
//   ?category=Beleza
//   ?source=shopee
//   ?q=cueca   (busca por título)

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "24", 10));
  const offset = (page - 1) * limit;

  const category = url.searchParams.get("category");
  const source = url.searchParams.get("source");
  const q = url.searchParams.get("q");

  let where = [];
  let params = [];

  if (category) {
    where.push("category LIKE ?");
    params.push(`%${category}%`);
  }
  if (source) {
    where.push("source = ?");
    params.push(source);
  }
  if (q) {
    where.push("title LIKE ?");
    params.push(`%${q}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT source, external_id, title, price, sale_price, discount_pct,
           category, image_url, affiliate_link, shop_name, rating, updated_at
    FROM products
    ${whereClause}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = env.DB.prepare(query).bind(...params, limit, offset);
  const { results } = await stmt.all();

  return new Response(JSON.stringify({ page, limit, count: results.length, products: results }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
