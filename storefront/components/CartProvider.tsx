'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { Cart, CartItem } from '@/lib/types'
import { getCart, createCart, addCartItem, updateCartItem, removeCartItem } from '@/lib/api'
import { getSessionId, getCartId, setCartId } from '@/lib/cart-storage'

interface CartContextValue {
  cart: Cart | null
  itemCount: number
  isLoading: boolean
  addItem: (storeProductId: string, quantity: number, optionData?: Record<string, string>) => Promise<void>
  changeQuantity: (itemId: string, quantity: number) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadCart = useCallback(async () => {
    setIsLoading(true)
    try {
      const sessionId = getSessionId()
      const cartId = getCartId()

      if (cartId) {
        const data = await getCart(storeId, sessionId)
        setCart(data)
      }
    } catch {
      // 장바구니 없으면 null 유지
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void loadCart()
  }, [loadCart])

  const ensureCart = useCallback(async (): Promise<Cart> => {
    const sessionId = getSessionId()
    const cartId = getCartId()
    if (cart && cartId) return cart

    const newCart = await createCart(storeId, sessionId)
    setCartId(newCart.id)
    setCart(newCart)
    return newCart
  }, [storeId, cart])

  const addItem = useCallback(
    async (storeProductId: string, quantity: number, optionData: Record<string, string> = {}) => {
      setIsLoading(true)
      try {
        const currentCart = await ensureCart()
        await addCartItem(storeId, currentCart.id, storeProductId, quantity, optionData)
        await loadCart()
      } finally {
        setIsLoading(false)
      }
    },
    [storeId, ensureCart, loadCart]
  )

  const changeQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!cart) return
      setIsLoading(true)
      try {
        await updateCartItem(storeId, cart.id, itemId, quantity)
        setCart((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            ),
          }
        })
      } finally {
        setIsLoading(false)
      }
    },
    [storeId, cart]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!cart) return
      setIsLoading(true)
      try {
        await removeCartItem(storeId, cart.id, itemId)
        setCart((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.filter((item) => item.id !== itemId),
          }
        })
      } finally {
        setIsLoading(false)
      }
    },
    [storeId, cart]
  )

  const itemCount = cart?.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) ?? 0

  return (
    <CartContext.Provider
      value={{ cart, itemCount, isLoading, addItem, changeQuantity, deleteItem, refresh: loadCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
