// @vitest-environment jsdom
import { beforeEach, test, expect } from 'vitest'
import { useVideoCreateStore } from '../useVideoCreateStore'
import type { Product } from '@/lib/types/domain/product'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Test Product',
    price: 10000,
    image: 'https://example.com/image.jpg',
    images: ['https://example.com/image.jpg'],
    platform: 'coupang',
    url: 'https://example.com/product',
    ...overrides,
  }
}

beforeEach(() => {
  useVideoCreateStore.getState().reset()
})

// addProduct

test('addProduct adds product to selectedProducts', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1', name: '상품A' }))
  const state = useVideoCreateStore.getState()
  expect(state.selectedProducts).toHaveLength(1)
  expect(state.selectedProducts[0]?.id).toBe('p1')
})

test('addProduct sets productNames from product name', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1', name: '테스트 상품' }))
  expect(useVideoCreateStore.getState().productNames['p1']).toBe('테스트 상품')
})

test('addProduct ignores duplicate product', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  expect(useVideoCreateStore.getState().selectedProducts).toHaveLength(1)
})

test('addProduct preserves existing productImages when same id is added', () => {
  useVideoCreateStore.getState().setProductImages('p1', ['img1.jpg', 'img2.jpg'])
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  expect(useVideoCreateStore.getState().productImages['p1']).toEqual(['img1.jpg', 'img2.jpg'])
})

test('addProduct can add multiple different products', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p2' }))
  expect(useVideoCreateStore.getState().selectedProducts).toHaveLength(2)
})

// removeProduct

test('removeProduct removes the target product from selectedProducts', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p2' }))
  useVideoCreateStore.getState().removeProduct('p1')
  const state = useVideoCreateStore.getState()
  expect(state.selectedProducts).toHaveLength(1)
  expect(state.selectedProducts[0]?.id).toBe('p2')
})

test('removeProduct cleans up productNames, productImages, productDetailImages, productVideos', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1', name: '상품1' }))
  useVideoCreateStore.getState().setProductImages('p1', ['img.jpg'])
  useVideoCreateStore.getState().setProductDetailImages('p1', ['detail.jpg'])

  useVideoCreateStore.getState().removeProduct('p1')

  const state = useVideoCreateStore.getState()
  expect(state.productNames['p1']).toBeUndefined()
  expect(state.productImages['p1']).toBeUndefined()
  expect(state.productDetailImages['p1']).toBeUndefined()
  expect(state.productVideos['p1']).toBeUndefined()
})

test('removeProduct does not affect other products data', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p2', name: '남은 상품' }))
  useVideoCreateStore.getState().removeProduct('p1')
  expect(useVideoCreateStore.getState().productNames['p2']).toBe('남은 상품')
})

// updateProduct

test('updateProduct updates product fields', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1', name: 'Old Name' }))
  useVideoCreateStore.getState().updateProduct('p1', { name: 'New Name', price: 20000 })
  const product = useVideoCreateStore.getState().selectedProducts[0]
  expect(product?.name).toBe('New Name')
  expect(product?.price).toBe(20000)
})

test('updateProduct does not change state when productId is unknown', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  const before = useVideoCreateStore.getState().selectedProducts
  useVideoCreateStore.getState().updateProduct('unknown-id', { name: 'New Name' })
  expect(useVideoCreateStore.getState().selectedProducts).toBe(before)
})

// reset

test('reset clears selectedProducts and scenes', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1' }))
  useVideoCreateStore.getState().setScenes([
    { id: 'scene-1', script: '테스트', voiceTemplate: null, ttsDuration: null },
  ])
  useVideoCreateStore.getState().reset()
  const state = useVideoCreateStore.getState()
  expect(state.selectedProducts).toEqual([])
  expect(state.scenes).toEqual([])
})

test('reset clears videoTitle and timeline', () => {
  useVideoCreateStore.getState().setVideoTitle('My Video')
  useVideoCreateStore.getState().setTimeline({ scenes: [] })
  useVideoCreateStore.getState().reset()
  const state = useVideoCreateStore.getState()
  expect(state.videoTitle).toBe('')
  expect(state.timeline).toBeNull()
})

test('reset clears productNames and productImages', () => {
  useVideoCreateStore.getState().addProduct(makeProduct({ id: 'p1', name: '상품' }))
  useVideoCreateStore.getState().setProductImages('p1', ['img.jpg'])
  useVideoCreateStore.getState().reset()
  const state = useVideoCreateStore.getState()
  expect(state.productNames).toEqual({})
  expect(state.productImages).toEqual({})
})
