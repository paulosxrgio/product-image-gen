import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')
  const handle = searchParams.get('handle')

  if (!domain || !handle) {
    return NextResponse.json({ error: 'domain e handle são obrigatórios' }, { status: 400 })
  }

  const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '')
  const sanitizedHandle = handle.replace(/[^a-zA-Z0-9-_]/g, '')

  try {
    const res = await fetch(`https://${sanitizedDomain}/products/${sanitizedHandle}.json`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Shopify retornou ${res.status}. Verifique a URL do produto.` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: 'Não foi possível conectar à loja. Verifique se o domínio está correto.' },
      { status: 500 }
    )
  }
}
