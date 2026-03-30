import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  CollectProductsSchema,
  ListWholesaleProductsSchema,
  ListProcessedProductsSchema,
  ProcessProductSchema,
  UpdateProcessedProductSchema,
  CreateMarketListingSchema,
} from './schemas.js'
import * as svc from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  return {
    // POST /api/products/collect
    collect: async (req: FastifyRequest, reply: FastifyReply) => {
      const input = CollectProductsSchema.parse(req.body)
      const result = await svc.collectProducts(fastify.db, input, fastify.log)
      return reply.code(200).send({ ok: true, ...result })
    },

    // GET /api/products/wholesale
    listWholesale: async (req: FastifyRequest, reply: FastifyReply) => {
      const q = ListWholesaleProductsSchema.parse(req.query)
      const data = await svc.listWholesale(fastify.db, {
        source: q.source,
        supplyStatus: q.supplyStatus,
        page: q.page,
        pageSize: q.pageSize,
      })
      return reply.send(data)
    },

    // GET /api/products/processed
    listProcessed: async (req: FastifyRequest, reply: FastifyReply) => {
      const q = ListProcessedProductsSchema.parse(req.query)
      const data = await svc.listProcessed(fastify.db, {
        sellerId: q.sellerId,
        processingStatus: q.processingStatus,
        page: q.page,
        pageSize: q.pageSize,
      })
      return reply.send(data)
    },

    // POST /api/products/process
    process: async (req: FastifyRequest, reply: FastifyReply) => {
      const input = ProcessProductSchema.parse(req.body)
      const processedId = await svc.processProduct(fastify.db, input, fastify.log)
      return reply.code(202).send({ ok: true, processedProductId: processedId })
    },

    // GET /api/products/processed/:id
    getProcessed: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const product = await svc.getProcessedDetail(fastify.db, req.params.id)
      if (!product) return reply.code(404).send({ error: '상품을 찾을 수 없습니다' })
      return reply.send(product)
    },

    // PATCH /api/products/processed/:id
    updateProcessed: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const data = UpdateProcessedProductSchema.parse(req.body)
      await svc.updateProcessed(fastify.db, req.params.id, data)
      return reply.send({ ok: true })
    },

    // POST /api/products/listings
    createListing: async (req: FastifyRequest, reply: FastifyReply) => {
      const data = CreateMarketListingSchema.parse(req.body)
      const listingId = await svc.createListing(fastify.db, data)
      return reply.code(201).send({ ok: true, listingId })
    },
  }
}
