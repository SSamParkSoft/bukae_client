import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'
import { captureAppError, classifyApiError } from '@/lib/monitoring/sentry'

const UPSTREAM_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

const BODY_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function resolveEndpointGroup(segments: string[]): string {
  if (segments[0] === 'auth') return 'auth'
  if (segments[0] === 'users') return 'users'
  if (segments[0] !== 'projects') return segments[0] ?? 'unknown'

  const resource = segments[2]
  const child = segments[3]
  if (!resource) return 'projects'
  if (resource === 'planning' && child === 'messages') return 'planning_messages'
  if (resource === 'generations' && child) return 'generation_detail'
  if (resource === 'briefs' && child) return 'brief_detail'

  return resource.replace(/-/g, '_')
}

function resolveRoutePattern(segments: string[]): string {
  if (segments[0] !== 'projects') return `/${segments.join('/')}`

  const [, , ...rest] = segments
  return ['/projects/:projectId', ...rest].join('/')
}

async function proxyRequest(request: NextRequest, segments: string[]): Promise<Response> {
  if (!UPSTREAM_BASE) {
    captureAppError(new Error('Upstream API base URL is not configured'), {
      flow: 'api_proxy',
      operation: 'proxy_request',
      errorKind: 'unexpected_error',
      tags: {
        endpoint_group: resolveEndpointGroup(segments),
        method: request.method,
        status: 500,
      },
      context: {
        endpoint_group: resolveEndpointGroup(segments),
        method: request.method,
        route_pattern: resolveRoutePattern(segments),
        status: 500,
      },
    })
    return NextResponse.json(
      { message: '업스트림 API 설정이 없습니다.' },
      { status: 500 }
    )
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(SERVER_ACCESS_TOKEN_COOKIE)?.value

  if (!accessToken) {
    return NextResponse.json({ message: '인증 토큰이 없습니다.' }, { status: 401 })
  }

  const path = segments.join('/')
  const search = new URL(request.url).search
  const upstreamUrl = `${UPSTREAM_BASE}/api/v1/${path}${search}`

  const forwardHeaders = new Headers(request.headers)
  forwardHeaders.delete('host')
  forwardHeaders.delete('cookie')
  forwardHeaders.set('Authorization', `Bearer ${accessToken}`)
  if (
    BODY_METHODS.has(request.method) &&
    !forwardHeaders.has('Content-Type') &&
    !request.headers.get('content-type')?.includes('multipart')
  ) {
    forwardHeaders.set('Content-Type', 'application/json')
  }

  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'manual',
  }
  if (BODY_METHODS.has(request.method)) {
    fetchOptions.body = request.body
    fetchOptions.duplex = 'half'
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, fetchOptions)
  } catch (error) {
    captureAppError(error, {
      flow: 'api_proxy',
      operation: 'proxy_request',
      errorKind: classifyApiError(error),
      tags: {
        endpoint_group: resolveEndpointGroup(segments),
        method: request.method,
      },
      context: {
        endpoint_group: resolveEndpointGroup(segments),
        method: request.method,
        route_pattern: resolveRoutePattern(segments),
      },
    })
    throw error
  }

  if (upstream.status >= 500) {
    captureAppError(new Error('Upstream API request failed'), {
      flow: 'api_proxy',
      operation: 'proxy_request',
      errorKind: 'api_error',
      tags: {
        endpoint_group: resolveEndpointGroup(segments),
        method: request.method,
        status: upstream.status,
      },
      context: {
        endpoint_group: resolveEndpointGroup(segments),
        method: request.method,
        route_pattern: resolveRoutePattern(segments),
        status: upstream.status,
      },
    })
  }

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete('set-cookie')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path)
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path)
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path)
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path)
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path)
}
