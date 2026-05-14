import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'url é obrigatório' }, { status: 400 })
  }

  // só permite domínios Shopify
  const allowed = ['cdn.shopify.com', 'myshopify.com', 'shopify.com']
  const urlObj = new URL(imageUrl)
  const isAllowed = allowed.some(d => urlObj.hostname.endsWith(d))
  if (!isAllowed) {
    return NextResponse.json({ error: 'Domínio não permitido' }, { status: 403 })
  }

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    return NextResponse.json({ base64, mimeType: contentType })
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar imagem' }, { status: 500 })
  }
}
