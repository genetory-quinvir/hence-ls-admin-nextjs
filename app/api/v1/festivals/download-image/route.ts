import { NextRequest, NextResponse } from 'next/server'

/**
 * 외부 이미지 URL을 다운로드하여 File로 변환
 * CORS 문제를 피하기 위해 서버 사이드에서 이미지 다운로드
 */
export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('📥 [Festival Image Download] 이미지 다운로드 요청:', {
      imageUrl,
      timestamp: new Date().toISOString(),
    })

    // 외부 이미지 다운로드
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!imageResponse.ok) {
      console.error('❌ [Festival Image Download] 이미지 다운로드 실패:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        imageUrl,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          success: false,
          error: `이미지 다운로드 실패 (${imageResponse.status})`,
        },
        { status: imageResponse.status }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'festival-image.jpg'

    console.log('✅ [Festival Image Download] 이미지 다운로드 성공:', {
      imageUrl,
      contentType,
      fileName,
      size: imageBuffer.byteLength,
      timestamp: new Date().toISOString(),
    })

    // Base64로 인코딩하여 반환
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      data: {
        base64: base64Image,
        contentType,
        fileName,
      },
    })
  } catch (error) {
    console.error('❌ [Festival Image Download] 예외 발생:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '이미지 다운로드 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

