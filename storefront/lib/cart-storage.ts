'use client'

const CART_SESSION_KEY = 'sellify_cart_session'
const CART_ID_KEY = 'sellify_cart_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(CART_SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CART_SESSION_KEY, id)
  }
  return id
}

export function getCartId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CART_ID_KEY)
}

export function setCartId(cartId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_ID_KEY, cartId)
}

export function clearCart(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_ID_KEY)
}
