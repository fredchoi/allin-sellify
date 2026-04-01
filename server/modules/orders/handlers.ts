import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import {
  listOrdersSchema,
  updateOrderStatusSchema,
  createTrackingSchema,
  mockCollectOrderSchema,
} from './schemas.js'
import {
  listOrders,
  getOrderById,
  updateOrderStatus,
  createShipment,
  getOrderStats,
} from './repository.js'
import { collectMockOrders } from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  const db = fastify.db

  return {
    list: async (req: FastifyRequest, reply: FastifyReply) => {
      const query = listOrdersSchema.parse(req.query)
      const result = await listOrders(db, query)
      reply.send(result)
    },

    stats: async (req: FastifyRequest, reply: FastifyReply) => {
      const { sellerId } = req.query as { sellerId: string }
      const stats = await getOrderStats(db, sellerId)
      reply.send(stats)
    },

    getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const order = await getOrderById(db, req.params.id)
      reply.send(order)
    },

    updateStatus: async (
      req: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const data = updateOrderStatusSchema.parse(req.body)
      const order = await updateOrderStatus(db, req.params.id, data)
      reply.send(order)
    },

    createTracking: async (
      req: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const data = createTrackingSchema.parse(req.body)
      const shipment = await createShipment(db, req.params.id, data)
      reply.code(201).send(shipment)
    },

    mockCollect: async (req: FastifyRequest, reply: FastifyReply) => {
      const data = mockCollectOrderSchema.parse(req.body)
      const result = await collectMockOrders(db, data)
      reply.send(result)
    },
  }
}
