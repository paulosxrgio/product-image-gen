# Product Image AI Generator

Gera imagens de produto para e-commerce usando **Nano Banana (Gemini)** e **DALL-E 3**, a partir das imagens da sua loja Shopify.

## Como funciona

1. Cole a URL do produto Shopify
2. Informe suas chaves de API (Gemini e/ou OpenAI)
3. Escolha o estilo de foto (studio, luxury, lifestyle, etc.)
4. Clique em gerar — os dois modelos rodam em paralelo
5. Compare lado a lado e baixe as imagens que preferir

## Deploy na Vercel (recomendado)

### Pré-requisitos
- Conta na [Vercel](https://vercel.com)
- [Git](https://git-scm.com) instalado
- [Node.js 18+](https://nodejs.org) instalado
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### Passo a passo

```bash
# 1. Clone ou baixe este projeto
cd product-image-gen

# 2. Instale dependências
npm install

# 3. Rode localmente para testar
npm run dev
# Acesse http://localhost:3000

# 4. Deploy na Vercel
vercel

# Siga as perguntas:
# - Set up and deploy? Y
# - Which scope? (sua conta)
# - Link to existing project? N
# - Project name? product-image-gen (ou o que quiser)
# - Directory? ./
# - Override settings? N
```

### Variáveis de ambiente (opcional)

Se quiser deixar as chaves fixas no servidor (sem digitar no UI):

```bash
vercel env add GEMINI_API_KEY
vercel env add OPENAI_API_KEY
```

Ou configure no painel da Vercel em **Settings → Environment Variables**.

### Deploy de atualizações

```bash
vercel --prod
```

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local
# Edite .env.local com suas chaves se quiser
npm run dev
```

## Chaves de API

| Serviço | Onde pegar | Custo aproximado |
|---------|-----------|-----------------|
| Gemini (Nano Banana) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | ~$0.003/imagem |
| OpenAI (DALL-E 3) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | ~$0.04/imagem HD |

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **API Routes** para proxy Shopify e chamadas às APIs de IA (resolve CORS)
- Deploy serverless na Vercel
