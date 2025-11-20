// Product API React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/lib/api/products'
import type { ProductRequest, ProductResponse } from '@/lib/types/api/product'

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAllProducts(),
    staleTime: 30 * 1000, // 30초
  })
}

export const useProduct = (id: string | null) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => {
      if (!id) throw new Error('Product ID is required')
      return productsApi.getProductById(id)
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProductRequest) => productsApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductRequest }) =>
      productsApi.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] })
    },
  })
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

