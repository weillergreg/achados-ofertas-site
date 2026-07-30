"""
Converte o export de afiliados da Shopee (CSV) em arquivos .sql
prontos para importar no Cloudflare D1, em lotes.

Uso:
    python3 shopee_to_d1.py caminho/do/arquivo.csv pasta_de_saida

Depois, importe cada lote com:
    npx wrangler d1 execute NOME_DO_BANCO --remote --file=d1_import/shopee_0001.sql

Rodar de novo com um CSV mais recente ATUALIZA os produtos existentes
(mesmo source + external_id) e CADASTRA os novos, sem duplicar.
"""

import csv
import sys
import re
import os
import datetime

csv.field_size_limit(sys.maxsize)

ROWS_PER_FILE = 2000  # cada arquivo .sql vira uma chamada de import; ajuste se necessário


def esc(value):
    """Escapa aspas simples para uso seguro dentro de SQL."""
    if value is None:
        return ""
    return str(value).replace("'", "''")


def clean_text(text):
    if not text:
        return ""
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def convert(src_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    now = datetime.datetime.utcnow().isoformat()

    file_index = 0
    row_in_file = 0
    out_f = None
    total = 0

    def open_new_file():
        nonlocal out_f, file_index, row_in_file
        if out_f:
            out_f.close()
        file_index += 1
        row_in_file = 0
        path = os.path.join(out_dir, f"shopee_{file_index:04d}.sql")
        out_f = open(path, "w", encoding="utf-8")
        return path

    with open(src_path, encoding="utf-8-sig", newline="") as fin:
        reader = csv.DictReader(fin)
        open_new_file()

        for row in reader:
            if row_in_file >= ROWS_PER_FILE:
                open_new_file()

            title = clean_text(row.get("title", ""))
            description = clean_text(row.get("description", ""))
            price = to_float(row.get("price"))
            sale_price = to_float(row.get("sale_price"))
            discount = to_float(row.get("discount_percentage"))
            rating = to_float(row.get("item_rating"))

            cats = [
                row.get("global_category1", ""),
                row.get("global_category2", ""),
                row.get("global_category3", ""),
            ]
            category = " > ".join([c for c in cats if c])

            image_url = row.get("image_link", "") or row.get("image_link_3", "")
            affiliate_link = row.get("product_short link", "") or row.get("product_link", "")
            shop_name = clean_text(row.get("shop_name", ""))
            external_id = row.get("itemid", "")

            sql = (
                "INSERT OR REPLACE INTO products "
                "(source, external_id, title, description, price, sale_price, "
                "discount_pct, category, image_url, affiliate_link, shop_name, rating, updated_at) "
                "VALUES ("
                f"'shopee', '{esc(external_id)}', '{esc(title)}', '{esc(description)}', "
                f"{price if price is not None else 'NULL'}, "
                f"{sale_price if sale_price is not None else 'NULL'}, "
                f"{discount if discount is not None else 'NULL'}, "
                f"'{esc(category)}', '{esc(image_url)}', '{esc(affiliate_link)}', "
                f"'{esc(shop_name)}', {rating if rating is not None else 'NULL'}, "
                f"'{now}');\n"
            )
            out_f.write(sql)
            row_in_file += 1
            total += 1

    if out_f:
        out_f.close()

    print(f"Total de produtos convertidos: {total}")
    print(f"Arquivos .sql gerados em: {out_dir} ({file_index} arquivos)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python3 shopee_to_d1.py caminho/do/arquivo.csv pasta_de_saida")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
