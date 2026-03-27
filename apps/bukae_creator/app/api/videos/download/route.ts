import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const filename = request.nextUrl.searchParams.get('filename') ?? 'result.mp4'

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  // 보안: Supabase Storage URL만 허용
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !url.startsWith(supabaseUrl + '/storage/')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream fetch failed', status: upstream.status }, { status: 502 })
    }

    const contentType = upstream.headers.get('Content-Type') ?? 'video/mp4'
    const contentLength = upstream.headers.get('Content-Length')

    // egress 추적 로그 (fire-and-forget)
    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/`
    if (url.startsWith(publicPrefix)) {
      const objectPath = url.slice(publicPrefix.length)
      const slashIdx = objectPath.indexOf('/')
      const bucketId = slashIdx !== -1 ? objectPath.slice(0, slashIdx) : objectPath
      const filePath = slashIdx !== -1 ? objectPath.slice(slashIdx + 1) : ''
      const fileSize = contentLength ? parseInt(contentLength, 10) : null
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
      const userAgent = request.headers.get('user-agent') ?? null

      void getSupabaseServiceClient()
        .from('storage_access_logs')
        .insert({ bucket_id: bucketId, object_path: filePath, file_size_bytes: fileSize, ip_address: ip, user_agent: userAgent })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(upstream.body, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'download failed' }, { status: 500 })
  }
}
