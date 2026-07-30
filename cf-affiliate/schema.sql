-- Tabela unificada de produtos de afiliados (Shopee, Amazon, Mercado Livre, Magalu, etc.)
CREATE TABLE IF NOT EXISTS products (
  source          TEXT NOT NULL,      -- 'shopee' | 'amazon' | 'mercadolivre' | 'magalu'
  external_id     TEXT NOT NULL,      -- itemid / ASIN / MLB id / SKU do Magalu
  title           TEXT,
  description     TEXT,
  price           REAL,
  sale_price      REAL,
  discount_pct    REAL,
  category        TEXT,
  image_url       TEXT,
  affiliate_link  TEXT,               -- link já com o tracking de afiliado
  shop_name       TEXT,
  rating          REAL,
  updated_at      TEXT,               -- ISO datetime da última atualização
  PRIMARY KEY (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
