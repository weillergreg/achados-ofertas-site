# 📋 Instruções para Finalizar a Integração dos Ícones

## Pasta de Ícones
A pasta `/images/icones/` foi criada e está pronta para receber seus arquivos:

### Arquivos necessários:
1. **icone-whatsapp.png** — Para os botões de WhatsApp
2. **icone-telegram.jpg** — Para os botões de Telegram
3. **logo-buynix.png** — Para aparecer no centro do QR Code

Copie os 3 arquivos para:
```
/images/icones/
```

## Configuração dos Links Dinâmicos

### Arquivo: `_config/links.json`
Este arquivo controla os links de WhatsApp e Telegram em todo o site.

**Localização:** `_config/links.json`

**Conteúdo atual:**
```json
{
  "whatsapp_link": "https://chat.whatsapp.com/SEU_LINK_AQUI",
  "telegram_link": "https://t.me/SEU_CANAL_AQUI",
  "buynix_logo": "/images/logo-buynix.png"
}
```

**Para atualizar:** Edite esse arquivo no painel Decap CMS (vá em ⚙️ Configurações > Links e Contato) e mude os links. O QR Code será gerado automaticamente!

---

## O que foi feito

### ✅ 1. Decap CMS - Nova Coleção de Configurações
- Criada coleção **"⚙️ Configurações do Site"** no `admin/config.yml`
- Permite editar links de WhatsApp e Telegram direto no painel
- Campo para gerar QR Codes automaticamente

### ✅ 2. Página Principal (index.html)
- Botões de WhatsApp e Telegram agora usam os novos ícones
- Links carregados dinamicamente a partir de `_config/links.json`
- Seção de Oferta Relâmpago agora tem botões "Acessar" nas logos

### ✅ 3. Página de Grupos/Canal (grupos-canal/index.html)
- QR Code aumentado de **76x76px** para **220x220px**
- QR Code agora é gerado dinamicamente com a biblioteca QRCode.js
- Logo Buynix integrada no centro do QR Code

### ✅ 4. JavaScript
- **loja.js** — Novo carregamento de configurações
- **qrcode-generator.js** — Gerador de QR Code com logo

### ✅ 5. Estrutura de Pastas
- `/images/icones/` — Para os ícones novos
- `/_config/` — Para configurações do site

---

## Próximos Passos

1. **Copie os 3 ícones/logos** para `/images/icones/`
2. **Atualize `_config/links.json`** com os links reais
3. **Teste no Decap CMS** — Vá em ⚙️ Configurações e mude um link
4. **Verifique o QR Code** — Acesse `/grupos-canal` para ver o QR atualizado

---

## Endpoints de Teste
- **Home:** `https://achadosofertas.com.br/` — Veja os novos ícones
- **Grupos:** `https://achadosofertas.com.br/grupos-canal` — QR Code maior
- **Admin Decap:** `https://achadosofertas.com.br/admin` — Configure os links

---

**Dúvidas?** Revise a seção de Configurações no arquivo de config do Decap.
