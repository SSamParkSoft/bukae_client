export class ServiceResponseError extends Error {
  status: number
  body: string
  label: string

  constructor(label: string, status: number, body = '') {
    super(`${label} (${status})${body ? `: ${body}` : ''}`)
    this.name = 'ServiceResponseError'
    this.status = status
    this.body = body
    this.label = label
  }
}

export async function throwServiceResponseError(
  res: Response,
  label: string
): Promise<void> {
  if (res.ok) return

  const body = await res.text().catch(() => '')
  throw new ServiceResponseError(label, res.status, body)
}
