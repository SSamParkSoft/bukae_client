function hasDuplicateValues(values: number[]): boolean {
  return new Set(values).size !== values.length
}

export function reorderByIndexOrder<T>(items: T[], order: number[]): T[] {
  if (items.length !== order.length) {
    return items
  }

  if (hasDuplicateValues(order)) {
    return items
  }

  const hasOutOfRangeIndex = order.some((index) => index < 0 || index >= items.length)
  if (hasOutOfRangeIndex) {
    return items
  }

  return order.map((index) => items[index] as T)
}
