export function resolveSingleSearchParam(
  value: string | string[] | undefined
): string | null {
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    return trimmedValue.length > 0 ? trimmedValue : null
  }
  if (Array.isArray(value)) return resolveSingleSearchParam(value[0])
  return null
}
