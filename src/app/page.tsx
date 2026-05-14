'use client'

import { useState, useRef } from 'react'
import styles from './page.module.css'

const PRESETS = [
  { label: 'Studio clean', value: 'Professional product photography, pure white background, soft studio lighting, sharp focus, clean commercial e-commerce shot, high resolution, no shadows, centered product' },
  { label: 'Luxury dark', value: 'Luxury product photography, deep black background, dramatic directional lighting, premium editorial feel, high contrast, cinematic quality, moody atmosphere' },
  { label: 'Lifestyle', value: 'Lifestyle product photography, natural daylight, wooden surface, neutral warm tones, organic authentic feel, magazine quality, shallow depth of field' },
  { label: 'Flat lay', value: 'Flat lay product photography, top-down view, minimalist composition, light neutral background, geometric arrangement, clean aesthetic, soft even lighting' },
  { label: 'Editorial', value: 'Editorial fashion magazine product photography, dynamic composition, dramatic shadows, bold contrast, artistic and unique, high fashion aesthetic' },
]

interface ShopifyImage { src: string; id: number }
interface ShopifyProduct { title: string; vendor: string; product_type: string; images: ShopifyImage[] }

type Status = 'idle' | 'loading' | 'done' | 'error'

interface ModelResult {
  status: Status
  images: string[]
  error?: string
}

export default function Home() {
  const [shopifyUrl, setShopifyUrl] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [prompt, setPrompt] = useState(PRESETS[0].value)
  const [activePreset, setActivePreset] = useState(0)
  const [numImages, setNumImages] = useState(2)
  const [size, setSize] = useState('1024x1024')
  const [log, setLog] = useState('')
  const [error, setError] = useState('')
  const [product, setProduct] = useState<ShopifyProduct | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [geminiResult, setGeminiResult] = useState<ModelResult>({ status: 'idle', images: [] })
  const [dalleResult, setDalleResult] = useState<ModelResult>({ status: 'idle', images: [] })

  function parseUrl(url: string) {
    try {
      const u = new URL(url.trim())
      const m = u.pathname.match(/\/products\/([^/?#]+)/)
      if (!m) return null
      return { domain: u.hostname, handle: m[1] }
    } catch { return null }
  }

  async function fetchProduct(domain: string, handle: string): Promise<ShopifyProduct> {
    setLog(`Buscando produto em ${domain}...`)
    const res = await fetch(`/api/shopify?domain=${encodeURIComponent(domain)}&handle=${encodeURIComponent(handle)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar produto')
    return data.product
  }

  async function getImageBase64(imageUrl: string) {
    setLog('Carregando imagem original...')
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar imagem')
    return { base64: data.base64, mimeType: data.mimeType }
  }

  async function runGemini(imgUrl: string, prod: ShopifyProduct) {
    setGeminiResult({ status: 'loading', images: [] })
    const allImages: string[] = []
    try {
      const { base64, mimeType } = await getImageBase64(imgUrl)
      for (let i = 0; i < numImages; i++) {
        setLog(`Nano Banana: gerando imagem ${i + 1} de ${numImages}...`)
        const res = await fetch('/api/generate/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType, prompt, apiKey: geminiKey })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        allImages.push(...data.images)
      }
      setGeminiResult({ status: 'done', images: allImages })
    } catch (e: any) {
      setGeminiResult({ status: 'error', images: [], error: e.message })
    }
  }

  async function runDalle(prod: ShopifyProduct) {
    setDalleResult({ status: 'loading', images: [] })
    const allImages: string[] = []
    try {
      for (let i = 0; i < numImages; i++) {
        setLog(`DALL-E 3: gerando imagem ${i + 1} de ${numImages}...`)
        const res = await fetch('/api/generate/dalle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, productTitle: prod.title, size, apiKey: openaiKey })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        allImages.push(...data.images)
      }
      setDalleResult({ status: 'done', images: allImages })
    } catch (e: any) {
      setDalleResult({ status: 'error', images: [], error: e.message })
    }
  }

  async function run() {
    setError('')
    setLog('')
    setProduct(null)
    setGeminiResult({ status: 'idle', images: [] })
    setDalleResult({ status: 'idle', images: [] })

    if (!shopifyUrl) return setError('Cole a URL do produto Shopify.')
    if (!geminiKey && !openaiKey) return setError('Informe pelo menos uma chave de API.')

    const parsed = parseUrl(shopifyUrl)
    if (!parsed) return setError('URL inválida. Exemplo: https://loja.myshopify.com/products/nome-produto')

    setRunning(true)
    let prod: ShopifyProduct
    try {
      prod = await fetchProduct(parsed.domain, parsed.handle)
      setProduct(prod)
      const mainImg = prod.images?.[0]?.src || ''
      setSelectedImageUrl(mainImg)

      const tasks: Promise<void>[] = []
      if (geminiKey && mainImg) tasks.push(runGemini(mainImg, prod))
      else if (geminiKey && !mainImg) setGeminiResult({ status: 'error', images: [], error: 'Produto sem imagens' })
      else setGeminiResult({ status: 'error', images: [], error: 'Sem chave Gemini' })

      if (openaiKey) tasks.push(runDalle(prod))
      else setDalleResult({ status: 'error', images: [], error: 'Sem chave OpenAI' })

      await Promise.allSettled(tasks)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLog('')
      setRunning(false)
    }
  }

  function downloadImage(src: string, name: string) {
    const a = document.createElement('a')
    a.href = src; a.download = name; a.click()
  }

  function downloadAll(images: string[], prefix: string) {
    images.forEach((src, i) => setTimeout(() => downloadImage(src, `${prefix}-${i + 1}.png`), i * 400))
  }

  const statusLabel = (r: ModelResult) => {
    if (r.status === 'idle') return { cls: 'wait', txt: 'aguardando' }
    if (r.status === 'loading') return { cls: 'gen', txt: 'gerando...' }
    if (r.status === 'done') return { cls: 'ok', txt: `${r.images.length} gerada(s)` }
    return { cls: 'err', txt: 'erro' }
  }

  const gStatus = statusLabel(geminiResult)
  const dStatus = statusLabel(dalleResult)

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>✦ Product Image AI Generator</h1>
          <p>Gera imagens de produto com Nano Banana e DALL-E 3 usando as imagens da sua loja Shopify como referência</p>
        </div>

        <div className={styles.field}>
          <label>URL do produto Shopify</label>
          <input
            type="text"
            placeholder="https://sua-loja.myshopify.com/products/nome-do-produto"
            value={shopifyUrl}
            onChange={e => setShopifyUrl(e.target.value)}
          />
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label>Gemini API Key (Nano Banana)</label>
            <input type="password" placeholder="AIza..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
            <span className={styles.hint}>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Pegar chave →</a>
            </span>
          </div>
          <div className={styles.field}>
            <label>OpenAI API Key (DALL-E 3)</label>
            <input type="password" placeholder="sk-..." value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} />
            <span className={styles.hint}>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Pegar chave →</a>
            </span>
          </div>
        </div>

        <div className={styles.field}>
          <label>Prompt de geração</label>
          <div className={styles.chips}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                className={`${styles.chip} ${activePreset === i ? styles.chipActive : ''}`}
                onClick={() => { setPrompt(p.value); setActivePreset(i) }}
              >{p.label}</button>
            ))}
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label>Imagens por modelo</label>
            <select value={numImages} onChange={e => setNumImages(Number(e.target.value))}>
              <option value={1}>1 imagem</option>
              <option value={2}>2 imagens</option>
              <option value={3}>3 imagens</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Tamanho DALL-E 3</label>
            <select value={size} onChange={e => setSize(e.target.value)}>
              <option value="1024x1024">1:1 — 1024×1024</option>
              <option value="1792x1024">16:9 — 1792×1024</option>
              <option value="1024x1792">9:16 — 1024×1792</option>
            </select>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {log && <div className={styles.log}>{log}</div>}

        <button className={styles.runBtn} onClick={run} disabled={running}>
          {running ? <span className={styles.spinner} /> : '✦'}
          {running ? 'Gerando...' : 'Buscar produto e gerar imagens'}
        </button>

        {product && (
          <div className={styles.prodBox}>
            <div className={styles.prodTitle}>{product.title}</div>
            <div className={styles.prodMeta}>
              {[product.vendor, product.product_type].filter(Boolean).join(' · ')} · {product.images?.length || 0} imagem(ns)
            </div>
            <div className={styles.thumbs}>
              {product.images?.slice(0, 6).map((img, i) => (
                <img
                  key={img.id}
                  src={img.src}
                  alt=""
                  className={selectedImageUrl === img.src ? styles.thumbSel : styles.thumb}
                  onClick={() => setSelectedImageUrl(img.src)}
                  title="Usar como referência"
                />
              ))}
            </div>
            {product.images?.length > 0 && (
              <p className={styles.hint} style={{marginTop: 6}}>Clique numa imagem para usá-la como referência no Nano Banana e regenerar</p>
            )}
          </div>
        )}

        {(geminiResult.status !== 'idle' || dalleResult.status !== 'idle') && (
          <div className={styles.results}>
            <div className={styles.sectionLabel}>Imagens geradas</div>
            <div className={styles.cmpGrid}>
              {/* Nano Banana */}
              <div className={styles.genCard}>
                <div className={styles.gcHead}>
                  <span className={styles.gcTitle}>Nano Banana (Gemini)</span>
                  <span className={`${styles.badge} ${styles['badge_' + gStatus.cls]}`}>{gStatus.txt}</span>
                </div>
                <div className={styles.gcImgs}>
                  {geminiResult.status === 'loading' && (
                    <div className={styles.ph}><span className={styles.spinner} /><span>Gerando com Gemini...</span></div>
                  )}
                  {geminiResult.status === 'error' && (
                    <div className={`${styles.ph} ${styles.phErr}`}>{geminiResult.error}</div>
                  )}
                  {geminiResult.status === 'done' && geminiResult.images.map((src, i) => (
                    <div key={i} className={styles.giWrap}>
                      <img src={src} alt={`Nano Banana ${i + 1}`} />
                      <button className={styles.dlBtn} onClick={() => downloadImage(src, `nano-banana-${i + 1}.png`)}>
                        ↓ Baixar
                      </button>
                    </div>
                  ))}
                </div>
                {geminiResult.status === 'done' && (
                  <div className={styles.gcFoot}>
                    <button className={styles.dlAll} onClick={() => downloadAll(geminiResult.images, 'nano-banana')}>
                      ↓ Baixar todas
                    </button>
                  </div>
                )}
              </div>

              {/* DALL-E 3 */}
              <div className={styles.genCard}>
                <div className={styles.gcHead}>
                  <span className={styles.gcTitle}>DALL-E 3 (OpenAI)</span>
                  <span className={`${styles.badge} ${styles['badge_' + dStatus.cls]}`}>{dStatus.txt}</span>
                </div>
                <div className={styles.gcImgs}>
                  {dalleResult.status === 'loading' && (
                    <div className={styles.ph}><span className={styles.spinner} /><span>Gerando com DALL-E 3...</span></div>
                  )}
                  {dalleResult.status === 'error' && (
                    <div className={`${styles.ph} ${styles.phErr}`}>{dalleResult.error}</div>
                  )}
                  {dalleResult.status === 'done' && dalleResult.images.map((src, i) => (
                    <div key={i} className={styles.giWrap}>
                      <img src={src} alt={`DALL-E ${i + 1}`} />
                      <button className={styles.dlBtn} onClick={() => downloadImage(src, `dalle3-${i + 1}.png`)}>
                        ↓ Baixar
                      </button>
                    </div>
                  ))}
                </div>
                {dalleResult.status === 'done' && (
                  <div className={styles.gcFoot}>
                    <button className={styles.dlAll} onClick={() => downloadAll(dalleResult.images, 'dalle3')}>
                      ↓ Baixar todas
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
