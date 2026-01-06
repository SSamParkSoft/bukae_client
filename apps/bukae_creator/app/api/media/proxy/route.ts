import { NextResponse } from 'next/server'

/**
 * 이미지 프록시 API
 * CORS 문제가 있는 이미지를 서버에서 가져와서 클라이언트에 전달
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    console.log('[Image Proxy] 요청 받음:', imageUrl?.substring(0, 100))

    if (!imageUrl) {
      console.error('[Image Proxy] url 파라미터 없음')
      return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 })
    }

    // URL 유효성 검사
    try {
      new URL(imageUrl)
    } catch {
      console.error('[Image Proxy] 유효하지 않은 URL:', imageUrl)
      return NextResponse.json({ error: '유효하지 않은 URL입니다.' }, { status: 400 })
    }

    // 쿠팡 이미지만 허용 (보안) - coupangcdn.com, ads-partners.coupang.com 등 쿠팡 도메인 허용
    const isCoupangImage = 
      imageUrl.includes('coupangcdn.com') || 
      imageUrl.includes('ads-partners.coupang.com') ||
      (imageUrl.includes('coupang.com') && imageUrl.includes('/image'))
    
    if (!isCoupangImage) {
      console.error('[Image Proxy] 쿠팡 이미지가 아님:', imageUrl)
      return NextResponse.json({ error: '쿠팡 이미지만 프록시할 수 있습니다.' }, { status: 403 })
    }

    console.log('[Image Proxy] 이미지 가져오기 시작:', imageUrl.substring(0, 100))

    // 이미지 가져오기
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!imageResponse.ok) {
      console.error('[Image Proxy] 이미지 가져오기 실패:', imageResponse.status, imageUrl.substring(0, 100))
      return NextResponse.json(
        { error: `이미지를 가져올 수 없습니다: ${imageResponse.status}` },
        { status: imageResponse.status }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    console.log(
      '[Image Proxy] 이미지 프록시 성공:',
      imageUrl.substring(0, 100),
      `크기: ${imageBuffer.byteLength} bytes`
    )

    // 이미지 반환
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[Image Proxy] 오류:', error)
    return NextResponse.json(
      { error: '이미지를 프록시하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

