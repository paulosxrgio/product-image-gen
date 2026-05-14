import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, productTitle, size, apiKey } = await req.json()

  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'OpenAI API key não configurada' }, { status: 400 })

  const fullPrompt = `${prompt}. Product: ${productTitle || 'e-commerce product'}. Generate a professional commercial product photograph. No text, no watermarks.`

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: size || '1024x1024',
        quality: 'hd',
        response_format: 'b64_json'
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.error?.message || `OpenAI HTTP ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const images = data.data.map((d: { b64_json: string }) => `data:image/png;base64,${d.b64_json}`)
    return NextResponse.json({ images })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao chamar OpenAI' }, { status: 500 })
  }
}
