import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SERVER_ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookie'

const UPSTREAM_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

const BODY_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

async function proxyRequest(request: NextRequest, segments: string[]): Promise<Response> {
  if (!UPSTREAM_BASE) {
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

  const upstream = await fetch(upstreamUrl, fetchOptions)

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
