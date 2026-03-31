import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import {
  createStoreSchema,
  updateStoreSchema,
  addStoreProductSchema,
  createCartSchema,
  addCartItemSchema,
  updateCartItemSchema,
  initiatePaymentSchema,
  confirmPaymentSchema,
} from './schemas.js'
import {
  createStore,
  getStoreBySubdomain,
  getStoreById,
  updateStore,
  listStoreProducts,
  addStoreProduct,
  createCart,
  getCart,
  getCartItems,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from './repository.js'
import {
  initiatePayment,
  confirmPayment,
  getPaymentByKey,
} from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  return {
    // --- Stores ---
    async createStore(request: FastifyRequest, reply: FastifyReply) {
      const body = createStoreSchema.parse(request.body)
      const store = await createStore(fastify.db, body)
      return reply.status(201).send(store)
    },

    async getBySubdomain(
      request: FastifyRequest<{ Params: { subdomain: string } }>,
      reply: FastifyReply
    ) {
      const store = await getStoreBySubdomain(fastify.db, request.params.subdomain)
      return reply.send(store)
    },

    async updateStore(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const body = updateStoreSchema.parse(request.body)
      const store = await updateStore(fastify.db, request.params.id, body)
      return reply.send(store)
    },

    // --- Store Products ---
    async listProducts(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const products = await listStoreProducts(fastify.db, request.params.id)
      return reply.send({ products })
    },

    async addProduct(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const body = addStoreProductSchema.parse(request.body)
      const product = await addStoreProduct(fastify.db, request.params.id, body)
      return reply.status(201).send(product)
    },

    // --- Cart ---
    async createCart(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const body = createCartSchema.parse(request.body)
      const cart = await createCart(fastify.db, request.params.id, body)
      return reply.status(201).send(cart)
    },

    async getCart(
      request: FastifyRequest<{ Params: { id: string; sessionId: string } }>,
      reply: FastifyReply
    ) {
      const cart = await getCart(fastify.db, request.params.id, request.params.sessionId)
      const items = await getCartItems(fastify.db, cart.id)
      return reply.send({ cart, items })
    },

    async addCartItem(
      request: FastifyRequest<{ Params: { id: string; cartId: string } }>,
      reply: FastifyReply
    ) {
      const body = addCartItemSchema.parse(request.body)
      const item = await addCartItem(fastify.db, request.params.cartId, body)
      return reply.status(201).send(item)
    },

    async updateCartItem(
      request: FastifyRequest<{ Params: { id: string; cartId: string; itemId: string } }>,
      reply: FastifyReply
    ) {
      const body = updateCartItemSchema.parse(request.body)
      const item = await updateCartItem(fastify.db, request.params.itemId, body)
      return reply.send(item)
    },

    async removeCartItem(
      request: FastifyRequest<{ Params: { id: string; cartId: string; itemId: string } }>,
      reply: FastifyReply
    ) {
      await removeCartItem(fastify.db, request.params.itemId)
      return reply.status(204).send()
    },

    // --- Payments ---
    async initiatePayment(request: FastifyRequest, reply: FastifyReply) {
      const body = initiatePaymentSchema.parse(request.body)
      const result = await initiatePayment(fastify.db, body)
      return reply.status(201).send(result)
    },

    async confirmPayment(request: FastifyRequest, reply: FastifyReply) {
      const body = confirmPaymentSchema.parse(request.body)
      const result = await confirmPayment(fastify.db, body)
      return reply.send(result)
    },

    async getPayment(
      request: FastifyRequest<{ Params: { paymentKey: string } }>,
      reply: FastifyReply
    ) {
      const payment = await getPaymentByKey(fastify.db, request.params.paymentKey)
      return reply.send(payment)
    },
  }
}
