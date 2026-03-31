import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function storesModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  // 쇼핑몰
  fastify.post('/', h.createStore)
  fastify.get('/by-subdomain/:subdomain', h.getBySubdomain)
  fastify.patch('/:id', h.updateStore)

  // 쇼핑몰 상품
  fastify.get('/:id/products', h.listProducts)
  fastify.post('/:id/products', h.addProduct)

  // 장바구니
  fastify.post('/:id/cart', h.createCart)
  fastify.get('/:id/cart/:sessionId', h.getCart)
  fastify.post('/:id/cart/:cartId/items', h.addCartItem)
  fastify.patch('/:id/cart/:cartId/items/:itemId', h.updateCartItem)
  fastify.delete('/:id/cart/:cartId/items/:itemId', h.removeCartItem)

  // 결제 (토스페이먼츠 Mock)
  fastify.post('/payments/initiate', h.initiatePayment)
  fastify.post('/payments/confirm', h.confirmPayment)
  fastify.get('/payments/:paymentKey', h.getPayment)
}
