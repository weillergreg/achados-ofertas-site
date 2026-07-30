"""
Converte um CSV de produtos (colunas: SKU, Name, Description, Regular price,
Sale price, Categories, Images, External URL) em arquivos .sql em lotes,
prontos para importar no Cloudflare D1.

Uso:
    python3 csv_to_d1.py caminho/do/arquivo.csv pasta_de_saida NOME_DA_SOURCE

Exemplo:
    python3 csv_to_d1.py shopee_woocommerce_import.csv d1_import shopee

Rodar de novo com um CSV mais recente ATUALIZA os produtos existentes
(mesma source + external_id) e CADASTRA os novos, sem duplicar
(graças ao INSERT OR REPLACE).
"""

import csv
import sys
import os
import datetime

csv.field_size_limit(sys.maxsize)

ROWS_PER_FILE = 2000


def esc(value):
    if value is None:
        return ""
    return str(value).replace("'", "''")


def to_float(value):
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def first_image(images_field):
    if not images_field:
        return ""
    return images_field.split(",")[0].strip()


def convert(src_path, out_dir, source_name):
    os.makedirs(out_dir, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

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
        path = os.path.join(out_dir, f"{source_name}_{file_index:04d}.sql")
        out_f = open(path, "w", encoding="utf-8")
        return path

    with open(src_path, encoding="utf-8-sig", newline="") as fin:
        reader = csv.DictReader(fin)
        open_new_file()

        for row in reader:
            if row_in_file >= ROWS_PER_FILE:
                open_new_file()

            external_id = row.get("SKU", "")
            title = row.get("Name", "")
            description = row.get("Description", "")
            price = to_float(row.get("Regular price"))
            sale_price = to_float(row.get("Sale price"))
            category = row.get("Categories", "")
            image_url = first_image(row.get("Images", ""))
            affiliate_link = row.get("External URL", "")

            sql = (
                "INSERT OR REPLACE INTO products "
                "(source, external_id, title, description, price, sale_price, "
                "discount_pct, category, image_url, affiliate_link, shop_name, rating, updated_at) "
                "VALUES ("
                f"'{esc(source_name)}', '{esc(external_id)}', '{esc(title)}', '{esc(description)}', "
                f"{price if price is not None else 'NULL'}, "
                f"{sale_price if sale_price is not None else 'NULL'}, "
                f"NULL, "
                f"'{esc(category)}', '{esc(image_url)}', '{esc(affiliate_link)}', "
                f"NULL, NULL, "
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
    if len(sys.argv) != 4:
        print("Uso: python3 csv_to_d1.py caminho/do/arquivo.csv pasta_de_saida nome_da_source")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
