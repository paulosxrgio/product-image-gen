import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, prompt, apiKey } = await req.json()

  const key = apiKey || process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'Gemini API key não configurada' }, { status: 400 })
  if (!imageBase64) return NextResponse.json({ error: 'imageBase64 é obrigatório' }, { status: 400 })

  const fullPrompt = `${prompt}. Based on the reference product image provided, generate a high-quality professional e-commerce product photograph with the same product. Keep the product identical but improve the lighting, background, and overall presentation.`

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
        { text: fullPrompt }
      ]
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.error?.message || `Gemini HTTP ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const images: string[] = []

    for (const part of (data.candidates?.[0]?.content?.parts || [])) {
      if (part.inline_data?.mime_type?.startsWith('image/')) {
        images.push(`data:${part.inline_data.mime_type};base64,${part.inline_data.data}`)
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'Gemini não retornou nenhuma imagem. Tente ajustar o prompt.' }, { status: 422 })
    }

    return NextResponse.json({ images })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao chamar Gemini' }, { status: 500 })
  }
}
