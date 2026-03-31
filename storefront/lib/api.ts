import type { Store, StoreProduct, Cart, CartItem, PaymentInitResult } from './types'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// 쇼핑몰 조회
export async function getStoreBySubdomain(subdomain: string): Promise<Store> {
  return apiFetch<Store>(`/api/stores/by-subdomain/${subdomain}`)
}

// 쇼핑몰 상품 목록
export async function listStoreProducts(storeId: string): Promise<StoreProduct[]> {
  return apiFetch<StoreProduct[]>(`/api/stores/${storeId}/products`)
}

// 장바구니 조회
export async function getCart(storeId: string, sessionId: string): Promise<Cart> {
  return apiFetch<Cart>(`/api/stores/${storeId}/cart/${sessionId}`)
}

// 장바구니 생성
export async function createCart(storeId: string, sessionId: string): Promise<Cart> {
  return apiFetch<Cart>(`/api/stores/${storeId}/cart`, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

// 장바구니 아이템 추가
export async function addCartItem(
  storeId: string,
  cartId: string,
  storeProductId: string,
  quantity: number,
  optionData: Record<string, string> = {}
): Promise<CartItem> {
  return apiFetch<CartItem>(`/api/stores/${storeId}/cart/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({ storeProductId, quantity, optionData }),
  })
}

// 장바구니 아이템 수량 변경
export async function updateCartItem(
  storeId: string,
  cartId: string,
  itemId: string,
  quantity: number
): Promise<CartItem> {
  return apiFetch<CartItem>(`/api/stores/${storeId}/cart/${cartId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

// 장바구니 아이템 삭제
export async function removeCartItem(
  storeId: string,
  cartId: string,
  itemId: string
): Promise<void> {
  await apiFetch<void>(`/api/stores/${storeId}/cart/${cartId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

// 결제 시작
export async function initiatePayment(payload: {
  cartId: string
  storeId: string
  method: 'card' | 'transfer' | 'virtual_account' | 'phone'
  buyerName: string
  buyerPhone: string
  buyerAddress: string
}): Promise<PaymentInitResult> {
  return apiFetch<PaymentInitResult>('/api/stores/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// 결제 확인
export async function confirmPayment(payload: {
  paymentKey: string
  orderId: string
  amount: number
}): Promise<{ paymentKey: string; status: string; approvedAt: string; totalAmount: number }> {
  return apiFetch('/api/stores/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
