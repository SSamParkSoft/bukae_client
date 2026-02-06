import { NextResponse } from 'next/server'
import sharp from 'sharp'

/**
 * 이미지 프록시 API
 * CORS 문제가 있는 이미지를 서버에서 가져와서 클라이언트에 전달
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const width = searchParams.get('w') // Next.js 이미지 최적화에서 전달되는 width
    const quality = searchParams.get('q') // Next.js 이미지 최적화에서 전달되는 quality

    console.log('[Image Proxy] 요청 받음:', imageUrl?.substring(0, 100), `width: ${width}, quality: ${quality}`)

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

    // 허용된 이미지 도메인 확인 (보안)
    // 쿠팡: coupangcdn.com, ads-partners.coupang.com 등 쿠팡 도메인
    // 알리익스프레스: aliexpress-media.com, alicdn.com 등 알리익스프레스 도메인
    const isCoupangImage = 
      imageUrl.includes('coupangcdn.com') || 
      imageUrl.includes('ads-partners.coupang.com') ||
      (imageUrl.includes('coupang.com') && imageUrl.includes('/image'))
    
    const isAliExpressImage = 
      imageUrl.includes('aliexpress-media.com') || 
      imageUrl.includes('alicdn.com')
    
    if (!isCoupangImage && !isAliExpressImage) {
      console.error('[Image Proxy] 허용되지 않은 이미지 도메인:', imageUrl)
      return NextResponse.json({ error: '쿠팡 또는 알리익스프레스 이미지만 프록시할 수 있습니다.' }, { status: 403 })
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

    let imageBuffer = await imageResponse.arrayBuffer()
    let contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const originalSize = imageBuffer.byteLength

    // 이미지 최적화 (width나 quality 파라미터가 있으면)
    if (width || quality) {
      try {
        const widthNum = width ? parseInt(width, 10) : undefined
        const qualityNum = quality ? parseInt(quality, 10) : 75
        
        let sharpInstance = sharp(Buffer.from(imageBuffer))
        
        // width가 있으면 리사이징
        if (widthNum && widthNum > 0) {
          sharpInstance = sharpInstance.resize(widthNum, undefined, {
            withoutEnlargement: true, // 원본보다 크게 만들지 않음
            fit: 'inside', // 비율 유지하며 리사이징
          })
        }
        
        // WebP로 변환하여 용량 최적화 (quality 적용)
        imageBuffer = await sharpInstance
          .webp({ quality: qualityNum })
          .toBuffer()
        
        contentType = 'image/webp'
        
        console.log(
          '[Image Proxy] 이미지 최적화 완료:',
          imageUrl.substring(0, 100),
          `원본: ${originalSize} bytes → 최적화: ${imageBuffer.byteLength} bytes (${widthNum ? `width: ${widthNum}, ` : ''}quality: ${qualityNum})`
        )
      } catch (optimizeError) {
        console.warn('[Image Proxy] 이미지 최적화 실패, 원본 반환:', optimizeError)
        // 최적화 실패 시 원본 반환
      }
    } else {
      console.log(
        '[Image Proxy] 이미지 프록시 성공 (최적화 없음):',
        imageUrl.substring(0, 100),
        `크기: ${imageBuffer.byteLength} bytes`
      )
    }

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

