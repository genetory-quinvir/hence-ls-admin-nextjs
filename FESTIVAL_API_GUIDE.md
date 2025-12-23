# 한국 축제/행사 API 키 발급 가이드

## 🎯 추천: 공공데이터포털 (data.go.kr)

가장 확실하고 안정적인 방법입니다.

### 📍 API 키 발급 사이트
**공공데이터포털**: https://www.data.go.kr

### 🔑 API 키 발급 방법 (단계별)

#### 1단계: 회원가입
1. https://www.data.go.kr 접속
2. 우측 상단 "회원가입" 클릭
3. 일반회원으로 가입 (이메일 인증 필요)

#### 2단계: API 찾기
1. 로그인 후 상단 검색창에서 **"한국관광공사 국문 관광정보 서비스"** 검색
2. 또는 **"축제"** 또는 **"행사"**로 검색
3. 검색 결과에서 **"한국관광공사_국문 관광정보 서비스"** 클릭

#### 3단계: 활용신청
1. 데이터셋 상세 페이지에서 **"활용신청"** 버튼 클릭
2. 활용 목적 작성 (예: "라이브 스페이스 관리 시스템에서 축제/행사 정보 표시")
3. 신청 제출

#### 4단계: 승인 대기
- 보통 **1-2일** 이내 승인
- 승인 완료 후 마이페이지에서 확인 가능

#### 5단계: API 키 확인
1. 마이페이지 → "마이데이터" → "활용신청 관리"
2. 승인된 서비스의 **"서비스 키"** 확인 및 복사
3. 이 키가 바로 API 키입니다

### 📝 필요한 정보
- **서비스 키 (Service Key)**: 발급받은 API 키
- **API 엔드포인트**: `http://apis.data.go.kr/B551011/KorService1/searchFestival1`

### 📋 API 사용 예시

```typescript
// .env.local에 추가
KOREA_TOURISM_API_KEY=발급받은_서비스_키

// API 호출 예시
const fetchFestivalData = async () => {
  const apiKey = process.env.KOREA_TOURISM_API_KEY
  const url = `http://apis.data.go.kr/B551011/KorService1/searchFestival1?serviceKey=${apiKey}&numOfRows=100&pageNo=1&MobileOS=ETC&MobileApp=TestApp&_type=json&listYN=Y&arrange=A`
  
  const response = await fetch(url)
  const data = await response.json()
  
  // 응답 구조
  // data.response.body.items.item (배열)
  return data.response.body.items.item.map((item: any) => ({
    id: item.contentid,
    title: item.title,
    description: item.overview,
    location: item.addr1,
    address: item.addr2,
    startDate: item.eventstartdate,
    endDate: item.eventenddate,
    latitude: parseFloat(item.mapy) / 10000000, // 좌표 변환 필요
    longitude: parseFloat(item.mapx) / 10000000,
    imageUrl: item.firstimage || item.firstimage2,
    homepage: item.homepage,
    contact: item.tel,
  }))
}
```

### 🔧 필요한 파라미터
- `serviceKey`: 발급받은 API 키 (필수)
- `numOfRows`: 한 페이지 결과 수 (기본값: 10)
- `pageNo`: 페이지 번호 (기본값: 1)
- `MobileOS`: OS 구분 (ETC, IOS, AND, WIN) - 필수
- `MobileApp`: 앱 이름 - 필수
- `_type`: 응답 형식 (json, xml) - 기본값: xml
- `listYN`: 목록 구분 (Y, N) - 기본값: Y
- `arrange`: 정렬 구분 (A: 제목순, B: 조회순, C: 수정일순, D: 생성일순)
- `eventStartDate`: 축제 시작일 (YYYYMMDD 형식) - 선택
- `areaCode`: 지역 코드 - 선택

---

## 📚 추가 정보

### 주요 데이터셋 URL
- **한국관광공사_국문 관광정보 서비스**: 
  - 공공데이터포털에서 "한국관광공사 국문 관광정보" 검색
  - 또는 직접 검색: https://www.data.go.kr (검색창에서 "축제" 검색)

### API 문서
- 상세 API 문서는 데이터셋 상세 페이지에서 "활용 가이드" 탭 확인

### 응답 데이터 구조
```json
{
  "response": {
    "body": {
      "items": {
        "item": [
          {
            "contentid": "축제 ID",
            "title": "축제명",
            "addr1": "주소",
            "addr2": "상세주소",
            "mapx": "경도 (예: 127.0276 -> 1270276000)",
            "mapy": "위도 (예: 37.4979 -> 374979000)",
            "firstimage": "대표 이미지 URL",
            "firstimage2": "썸네일 이미지 URL",
            "eventstartdate": "시작일 (YYYYMMDD)",
            "eventenddate": "종료일 (YYYYMMDD)",
            "overview": "상세 설명",
            "homepage": "홈페이지 URL",
            "tel": "연락처"
          }
        ]
      }
    }
  }
}
```

---

## ⚡ 빠른 시작 (요약)

### 1단계: API 키 발급
1. **https://www.data.go.kr** 접속
2. 회원가입 및 로그인
3. "한국관광공사 국문 관광정보 서비스" 또는 "축제" 검색
4. 데이터셋 선택 후 "활용신청" 클릭
5. 승인 대기 (1-2일)
6. 마이페이지에서 **서비스 키** 확인

### 2단계: 환경 변수 설정
프로젝트 루트의 `.env.local` 파일에 추가:
```env
KOREA_TOURISM_API_KEY=발급받은_서비스_키_여기에_붙여넣기
```

### 3단계: 코드 연동
Next.js API Route (`app/api/v1/festivals/route.ts`)를 통해 서버 사이드에서 API 호출

---

## ⚠️ 주의사항

1. **API 키 보안**: 
   - 클라이언트에서 직접 호출하지 말고 **Next.js API Route를 통해 호출**
   - API 키는 `.env.local`에 저장하고 절대 클라이언트 코드에 노출하지 않기

2. **좌표 변환**: 
   - 한국관광공사 API는 좌표를 10000000을 곱한 값으로 제공
   - 예: 위도 37.4979 → API 응답: 374979000 → 변환: 374979000 / 10000000 = 37.4979

3. **일일 호출 제한**: 
   - API별로 제한이 있을 수 있으므로 공공데이터포털에서 확인 필요
   - 보통 1,000~10,000건/일 정도

4. **CORS 문제**: 
   - 브라우저에서 직접 호출 시 CORS 에러 발생
   - **반드시 서버 사이드(Next.js API Route)에서 호출** 필수

---

## 📞 문의
- 공공데이터포털 고객센터: 1577-3088
- API 관련 문의: 각 데이터셋의 운영기관으로 문의

