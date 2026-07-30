# Catálogo de afiliados — Cloudflare Pages + D1

Estrutura:

```
schema.sql                     -> tabela unificada de produtos
d1_import/shopee_0001.sql ...  -> 50 arquivos, 2000 produtos cada (100.000 no total)
scripts/csv_to_d1.py           -> gera novos lotes .sql a partir de um CSV
scripts/shopee_to_d1.py        -> mesma coisa, direto do CSV cru exportado da Shopee
functions/api/products.js      -> API (Pages Function) que lista os produtos do D1
```

## 1. Criar o banco D1

```bash
npx wrangler d1 create loja-afiliados
```

Copie o `database_id` retornado para o seu `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "loja-afiliados"
database_id = "COLE_AQUI_O_ID"
```

## 2. Criar a tabela

```bash
npx wrangler d1 execute loja-afiliados --remote --file=schema.sql
```

## 3. Importar os produtos (100.000, em 50 lotes de 2000)

```bash
for f in d1_import/*.sql; do
  npx wrangler d1 execute loja-afiliados --remote --file="$f"
done
```

Isso demora (50 chamadas). Se quiser mais rápido, rode em paralelo (ajuste conforme
os limites da sua conta):

```bash
ls d1_import/*.sql | xargs -P 4 -I{} npx wrangler d1 execute loja-afiliados --remote --file={}
```

## 4. Servir os produtos no seu site

Publique `functions/api/products.js` junto com o resto do seu Cloudflare Pages
(ele é detectado automaticamente pela pasta `functions/`). Depois é só chamar
no frontend:

```
GET /api/products?page=1&limit=24
GET /api/products?category=Beleza
GET /api/products?source=shopee&q=cueca
```

## 5. Atualizar os produtos no futuro

Sempre que tiver um CSV/feed novo (Shopee, Magalu, Amazon, Mercado Livre):

```bash
python3 scripts/csv_to_d1.py novo_arquivo.csv d1_import_novo shopee
for f in d1_import_novo/*.sql; do
  npx wrangler d1 execute loja-afiliados --remote --file="$f"
done
```

Como a chave primária é `(source, external_id)` e o import usa
`INSERT OR REPLACE`, produtos existentes são **atualizados** (preço, imagem,
descrição etc.) e produtos novos são **cadastrados** — nada duplica.

## 6. Adicionando Magalu, Amazon e Mercado Livre

Cada marketplace fornece os dados de um jeito diferente:

- **Shopee**: CSV de export (já resolvido acima).
- **Magalu**: normalmente via rede de afiliados (Lomadee/Awin) — pedem um feed
  CSV/XML parecido com este. É só escrever um parser equivalente a
  `csv_to_d1.py` mapeando as colunas certas, com `source = 'magalu'`.
- **Mercado Livre**: não tem export em massa; use a API oficial
  (https://developers.mercadolivre.com.br) para buscar produtos por categoria/
  busca, gerar o link de afiliado pelo Linkbuilder, e inserir com
  `source = 'mercadolivre'`.
- **Amazon**: use a Product Advertising API (PA-API) — busca por ASIN/palavra-
  chave, retorna JSON, você grava com `source = 'amazon'`.

Em todos os casos, o destino final é a mesma tabela `products`, então a API
(`/api/products`) e o frontend não precisam saber de onde veio cada item — só
filtram por `source` se você quiser mostrar separado por marketplace.

## 7. Automatizando com GitHub Actions (opcional)

Crie um workflow agendado (`.github/workflows/atualizar-produtos.yml`) que:
1. Baixa o feed mais recente de cada marketplace.
2. Roda os scripts de conversão.
3. Importa os `.sql` gerados no D1 com `wrangler d1 execute`.

Assim seu catálogo se atualiza sozinho (ex: todo dia de madrugada) sem você
precisar mexer em nada manualmente.
