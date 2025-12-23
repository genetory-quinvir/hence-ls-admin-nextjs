import { NextRequest, NextResponse } from 'next/server'

// 동적 렌더링 강제 (searchParams 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

const API_BASE_URL = 'http://apis.data.go.kr/B551011/KorService2'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.KOREA_TOURISM_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'KOREA_TOURISM_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // URL 파라미터에서 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams
    const pageNo = searchParams.get('pageNo') || '1'
    const numOfRows = searchParams.get('numOfRows') || '100'
    const eventStartDate = searchParams.get('eventStartDate') || '' // YYYYMMDD 형식
    const eventEndDate = searchParams.get('eventEndDate') || '' // YYYYMMDD 형식
    const areaCode = searchParams.get('areaCode') || '' // 지역 코드 (선택)

    // API URL 구성
    // 공공데이터포털 API는 serviceKey를 디코딩된 상태로 URL에 직접 넣어야 함
    // URLSearchParams는 자동으로 인코딩하므로 수동으로 쿼리 문자열 구성
    
    // 날짜 필터 설정 (필수)
    let actualEventStartDate = eventStartDate
    let actualEventEndDate = eventEndDate
    
    if (!actualEventStartDate || !actualEventEndDate) {
      const today = new Date()
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
      
      if (!actualEventStartDate) {
        actualEventStartDate = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '')
      }
      if (!actualEventEndDate) {
        actualEventEndDate = oneYearLater.toISOString().slice(0, 10).replace(/-/g, '')
      }
    }

    // serviceKey는 디코딩된 상태로 URL에 직접 넣어야 함 (URLSearchParams 사용하지 않음)
    const queryParams: string[] = []
    queryParams.push(`serviceKey=${apiKey}`) // 디코딩된 키를 그대로 사용 (특수문자는 URL 인코딩됨)
    queryParams.push(`numOfRows=${numOfRows}`)
    queryParams.push(`pageNo=${pageNo}`)
    queryParams.push(`MobileOS=ETC`)
    queryParams.push(`MobileApp=HENCEAdmin`)
    queryParams.push(`_type=json`)
    queryParams.push(`arrange=C`) // 수정일순 정렬 (C)
    queryParams.push(`eventStartDate=${actualEventStartDate}`)
    queryParams.push(`eventEndDate=${actualEventEndDate}`)

    if (areaCode) {
      queryParams.push(`areaCode=${areaCode}`)
    }

    const apiUrl = `${API_BASE_URL}/searchFestival2?${queryParams.join('&')}`

    console.log('📤 [Festival API] 축제/행사 데이터 요청:', {
      url: apiUrl.replace(apiKey, '***'),
      pageNo,
      numOfRows,
      eventStartDate,
      areaCode,
      timestamp: new Date().toISOString(),
    })

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    // 응답 텍스트 먼저 읽기
    const responseText = await response.text()
    
    console.log('📥 [Festival API] 응답 받음:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      responseTextPreview: responseText.substring(0, 500),
      timestamp: new Date().toISOString(),
    })

    if (!response.ok) {
      console.error('❌ [Festival API] 응답 오류:', {
        status: response.status,
        statusText: response.statusText,
        errorText: responseText,
        timestamp: new Date().toISOString(),
      })

      // 응답이 JSON 형식일 수도 있으므로 파싱 시도
      let errorData: any = {}
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        errorData = { message: responseText || '알 수 없는 오류' }
      }

      // 공공데이터포털 API의 "Unexpected errors"는 보통 인증/승인 문제
      let errorMessage = errorData.response?.header?.resultMsg || errorData.message || `축제/행사 데이터를 불러오는데 실패했습니다. (${response.status})`
      
      if (responseText.includes('Unexpected errors') || responseText.trim() === 'Unexpected errors') {
        errorMessage = 'API 인증 오류가 발생했습니다. 다음을 확인해주세요:\n1. API 키가 올바른지 확인\n2. 공공데이터포털에서 서비스 사용 승인이 완료되었는지 확인\n3. API 서비스가 정상 작동 중인지 확인'
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: {
            httpStatus: response.status,
            responseText: responseText,
            parsedError: errorData,
          },
        },
        { status: response.status >= 500 ? 502 : response.status } // 500 -> 502 (Bad Gateway)로 변경
      )
    }

    // JSON 파싱
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ [Festival API] JSON 파싱 오류:', {
        error: parseError,
        responseText: responseText.substring(0, 1000),
        timestamp: new Date().toISOString(),
      })
      
      return NextResponse.json(
        {
          success: false,
          error: 'API 응답을 파싱할 수 없습니다.',
        },
        { status: 500 }
      )
    }

    console.log('📥 [Festival API] 응답 받음:', {
      responseCode: data.response?.header?.resultCode,
      responseMsg: data.response?.header?.resultMsg,
      itemCount: data.response?.body?.items?.item?.length || 0,
      totalCount: data.response?.body?.totalCount,
      timestamp: new Date().toISOString(),
    })

    // 응답 코드 확인
    if (data.response?.header?.resultCode !== '0000') {
      const errorMsg = data.response?.header?.resultMsg || '알 수 없는 오류'
      console.error('❌ [Festival API] API 오류:', {
        resultCode: data.response?.header?.resultCode,
        resultMsg: errorMsg,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          success: false,
          error: `API 오류: ${errorMsg}`,
        },
        { status: 400 }
      )
    }

    // 데이터 변환
    const items = data.response?.body?.items?.item || []
    const festivals = Array.isArray(items) ? items : [items]

    const convertedFestivals = festivals
      .filter((item: any) => item && item.contentid) // 유효한 데이터만 필터링
      .map((item: any) => {
        // 날짜 변환 (YYYYMMDD -> YYYY-MM-DDTHH:mm:ss)
        const formatDateFromYYYYMMDD = (dateStr: string): string => {
          if (!dateStr || dateStr.length !== 8) return ''
          const year = dateStr.substring(0, 4)
          const month = dateStr.substring(4, 6)
          const day = dateStr.substring(6, 8)
          return `${year}-${month}-${day}T10:00:00` // 기본 시간 10:00 설정
        }

        // 좌표는 이미 소수점 형태로 제공됨 (예: "128.4972037634", "35.8022230717")
        const latitude = item.mapy ? parseFloat(item.mapy) : undefined
        const longitude = item.mapx ? parseFloat(item.mapx) : undefined

        return {
          id: item.contentid?.toString() || '',
          title: item.title || '제목 없음',
          description: item.overview || '', // searchFestival2는 overview 필드 사용
          location: item.addr1 || '',
          address: item.addr2 || '',
          startDate: formatDateFromYYYYMMDD(item.eventstartdate || ''),
          endDate: item.eventenddate ? formatDateFromYYYYMMDD(item.eventenddate) : undefined,
          latitude,
          longitude,
          imageUrl: item.firstimage || undefined, // firstimage 우선 사용 (firstimage2는 제외)
          homepage: item.homepage || undefined,
          contact: item.tel || undefined,
        }
      })

    console.log('✅ [Festival API] 데이터 변환 완료:', {
      originalCount: festivals.length,
      convertedCount: convertedFestivals.length,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: convertedFestivals,
      totalCount: data.response?.body?.totalCount || convertedFestivals.length,
    })
  } catch (error) {
    console.error('❌ [Festival API] 예외 발생:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '축제/행사 데이터를 불러오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

