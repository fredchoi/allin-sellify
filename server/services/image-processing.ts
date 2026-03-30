// 이미지 처리 서비스 — Sharp 기반
// 리사이즈, 포맷 변환, 로컬 저장 (개발용)

import sharp from 'sharp'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

export interface ProcessedImage {
  filename: string
  localPath: string
  width: number
  height: number
  sizeBytes: number
  format: string
}

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 85,
  format: 'webp',
}

export class ImageProcessingService {
  private readonly uploadDir: string

  constructor(uploadDir: string) {
    mkdirSync(uploadDir, { recursive: true })
    this.uploadDir = uploadDir
  }

  /** URL에서 이미지를 다운로드하고 처리 */
  async processFromUrl(
    imageUrl: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const res = await fetch(imageUrl)
    if (!res.ok) {
      throw new Error(`이미지 다운로드 실패 ${res.status}: ${imageUrl}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return this.processBuffer(buffer, opts)
  }

  /** Buffer를 처리하고 로컬에 저장 */
  async processBuffer(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const filename = `${randomUUID()}.${opts.format}`
    const localPath = join(this.uploadDir, filename)

    const processed = sharp(buffer)
      .resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })

    let outputBuffer: Buffer
    if (opts.format === 'webp') {
      outputBuffer = await processed.webp({ quality: opts.quality }).toBuffer()
    } else if (opts.format === 'jpeg') {
      outputBuffer = await processed.jpeg({ quality: opts.quality }).toBuffer()
    } else {
      outputBuffer = await processed.png().toBuffer()
    }

    const metadata = await sharp(outputBuffer).metadata()

    await sharp(outputBuffer).toFile(localPath)

    return {
      filename,
      localPath,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      sizeBytes: outputBuffer.length,
      format: opts.format,
    }
  }

  /** 여러 이미지를 순서대로 처리 */
  async processMultiple(
    imageUrls: string[],
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = []
    for (const url of imageUrls) {
      try {
        const img = await this.processFromUrl(url, options)
        results.push(img)
      } catch (err) {
        console.error(`이미지 처리 실패 (${url}):`, err)
        // 실패한 이미지는 건너뜀
      }
    }
    return results
  }

  /** 대표 이미지에서 perceptual hash 계산 (8x8 DCT hash) */
  async computePerceptualHash(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl)
    if (!res.ok) return ''

    const buffer = Buffer.from(await res.arrayBuffer())

    // 8x8 그레이스케일로 축소 후 픽셀 평균 계산
    const { data } = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = Array.from(data as Uint8Array)
    const avg = pixels.reduce((s, v) => s + v, 0) / pixels.length

    // 평균보다 밝으면 1, 아니면 0 → 64비트 해시
    const bits = pixels.map((v) => (v >= avg ? '1' : '0')).join('')
    return parseInt(bits, 2).toString(16).padStart(16, '0')
  }
}

/** 두 perceptual hash 간 해밍 거리 기반 유사도 (0~1) */
export function computeHashSimilarity(hashA: string, hashB: string): number {
  if (!hashA || !hashB) return 0
  const a = BigInt(`0x${hashA}`)
  const b = BigInt(`0x${hashB}`)
  const xor = a ^ b
  const bits = xor.toString(2)
  const hammingDist = bits.split('').filter((c) => c === '1').length
  return 1 - hammingDist / 64
}
