import type { Pool } from 'pg'
import type { FastifyBaseLogger } from 'fastify'
import { createWholesaleAdapter } from '../../adapters/wholesale-adapter-factory.js'
import {
  processProductWithAi,
  mockProcessProduct,
} from '../../services/ai-processing.js'
import { ImageProcessingService } from '../../services/image-processing.js'
import {
  computeTextFingerprint,
  isDuplicate,
} from '../../services/fingerprint.js'
import * as repo from './repository.js'
import type {
  CollectProductsInput,
  ProcessProductInput,
  UpdateProcessedProductInput,
  CreateMarketListingInput,
} from './schemas.js'
import { config } from '../../config.js'

const imageService = new ImageProcessingService(config.UPLOAD_DIR)

// ── 도매 상품 수집 ─────────────────────────────────────────────────────────

export async function collectProducts(
  db: Pool,
  input: CollectProductsInput,
  log: FastifyBaseLogger
): Promise<{ collected: number; skipped: number; duplicates: number }> {
  const adapter = createWholesaleAdapter(input.source)
  log.info({ source: input.source }, '도매 상품 수집 시작')

  const result = await adapter.searchProducts({
    keyword: input.keyword,
    category: input.category,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    page: input.page,
    pageSize: input.pageSize,
  })

  let collected = 0
  let skipped = 0
  let duplicates = 0

  for (const product of result.products) {
    try {
      // 텍스트 핑거프린팅
      const textFp = computeTextFingerprint(product.name)

      // 이미지 해시 (첫 번째 이미지만)
      let imageHash = ''
      if (product.images[0]) {
        try {
          imageHash = await imageService.computePerceptualHash(product.images[0])
        } catch {
          log.warn({ url: product.images[0] }, '이미지 해시 계산 실패')
        }
      }

      // DB 저장/업데이트
      const id = await repo.upsertWholesaleProduct(db, { ...product, source: input.source })
      await repo.updateWholesaleFingerprint(db, id, textFp, imageHash)

      collected++
    } catch (err) {
      log.error({ err, product: product.sourceProductId }, '상품 저장 실패')
      skipped++
    }
  }

  log.info({ collected, skipped, duplicates }, '도매 상품 수집 완료')
  return { collected, skipped, duplicates }
}

// ── AI 가공 ────────────────────────────────────────────────────────────────

export async function processProduct(
  db: Pool,
  input: ProcessProductInput,
  log: FastifyBaseLogger
): Promise<string> {
  const wholesale = await repo.getWholesaleProductById(db, input.wholesaleProductId)
  if (!wholesale) throw new Error('도매 상품을 찾을 수 없습니다')

  // 가공 상품 레코드 생성(또는 기존 레코드 반환)
  const processedId = await repo.createProcessedProduct(db, {
    sellerId: input.sellerId,
    wholesaleProductId: input.wholesaleProductId,
    sellingPrice: input.sellingPrice,
    marginRate: input.marginRate,
  })

  // 비동기 AI 처리 (상태 업데이트 포함)
  processInBackground(db, processedId, wholesale, log).catch((err) => {
    log.error({ err, processedId }, 'AI 가공 백그라운드 처리 실패')
  })

  return processedId
}

async function processInBackground(
  db: Pool,
  processedId: string,
  wholesale: repo.WholesaleProductRow,
  log: FastifyBaseLogger
): Promise<void> {
  const checkpoints: Record<string, unknown> = {}

  // Step 1: AI 제목/후킹 생성
  try {
    const options = Array.isArray(wholesale.options) ? wholesale.options : []
    const aiInput = {
      productName: wholesale.name,
      category: wholesale.category ?? undefined,
      price: wholesale.price,
      options: options as Array<{ name: string; values: string[] }>,
    }

    const aiResult = config.ANTHROPIC_API_KEY
      ? await processProductWithAi(aiInput, config.ANTHROPIC_API_KEY)
      : mockProcessProduct(aiInput)

    checkpoints['title'] = { done: true, model: aiResult.model, at: new Date().toISOString() }

    await repo.updateProcessedProduct(db, processedId, {
      title: aiResult.title,
      hookingText: aiResult.hookingText,
      processedOptions: aiResult.processedOptions,
      processingStatus: 'title_done',
      processingCheckpoints: { ...checkpoints },
    })
    log.info({ processedId }, 'AI 제목/후킹 완료')
  } catch (err) {
    log.error({ err, processedId }, 'AI 제목 생성 실패')
    await repo.updateProcessedProduct(db, processedId, {
      processingStatus: 'failed',
      processingCheckpoints: { ...checkpoints, title: { done: false, error: String(err) } },
    })
    return
  }

  // Step 2: 이미지 처리
  try {
    const images = Array.isArray(wholesale.images) ? (wholesale.images as string[]) : []
    const processed = await imageService.processMultiple(images.slice(0, 5))

    checkpoints['image'] = { done: true, count: processed.length, at: new Date().toISOString() }

    const processedImages = processed.map((img) => ({
      filename: img.filename,
      path: img.localPath,
      width: img.width,
      height: img.height,
      format: img.format,
    }))

    await repo.updateProcessedProduct(db, processedId, {
      processedImages,
      processingStatus: 'image_done',
      processingCheckpoints: { ...checkpoints },
    })
    log.info({ processedId, count: processed.length }, '이미지 처리 완료')
  } catch (err) {
    log.error({ err, processedId }, '이미지 처리 실패 (계속 진행)')
    checkpoints['image'] = { done: false, error: String(err) }
  }

  // Step 3: 완료
  await repo.updateProcessedProduct(db, processedId, {
    processingStatus: 'completed',
    processingCheckpoints: { ...checkpoints, completed_at: new Date().toISOString() },
  })
  log.info({ processedId }, 'AI 가공 완료')
}

// ── 조회/수정 ──────────────────────────────────────────────────────────────

export async function listWholesale(
  db: Pool,
  opts: { source?: string; supplyStatus?: string; page: number; pageSize: number }
) {
  return repo.listWholesaleProducts(db, opts)
}

export async function listProcessed(
  db: Pool,
  opts: { sellerId?: string; processingStatus?: string; page: number; pageSize: number }
) {
  return repo.listProcessedProducts(db, opts)
}

export async function getProcessedDetail(db: Pool, id: string) {
  const product = await repo.getProcessedProductById(db, id)
  if (!product) return null
  const listings = await repo.listMarketListings(db, id)
  return { ...product, listings }
}

export async function updateProcessed(
  db: Pool,
  id: string,
  data: UpdateProcessedProductInput
): Promise<void> {
  await repo.updateProcessedProduct(db, id, {
    title: data.title,
    hookingText: data.hookingText,
    description: data.description,
    sellingPrice: data.sellingPrice,
    marginRate: data.marginRate,
    processedOptions: data.processedOptions,
  })
}

export async function createListing(
  db: Pool,
  data: CreateMarketListingInput
): Promise<string> {
  return repo.createOrUpdateMarketListing(db, {
    processedProductId: data.processedProductId,
    marketplace: data.marketplace,
    marketProductId: data.marketProductId,
    listingPrice: data.listingPrice,
    listingData: data.listingData as Record<string, unknown> | undefined,
  })
}
