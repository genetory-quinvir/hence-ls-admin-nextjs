# AWS Amplify 환경변수 설정 가이드

## 문제점
`.env.local` 파일의 환경변수는 로컬 개발용이며, AWS Amplify에서는 별도로 환경변수를 설정해야 합니다.

## 해결 방법

### 1. Amplify 콘솔에서 환경변수 설정

1. AWS Amplify 콘솔에 로그인
2. 해당 앱 선택
3. 왼쪽 메뉴에서 **"Environment variables"** 클릭
4. 다음 환경변수들을 추가:

#### 클라이언트 사이드 환경변수 (NEXT_PUBLIC_ 접두사)
```
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_map_client_id_here
```

#### 서버 사이드 환경변수
```
OPENAI_API_KEY=your_openai_api_key_here
GROK_API_KEY=your_grok_api_key_here
KOREA_TOURISM_API_KEY=your_korea_tourism_api_key_here
LLM_PROVIDER=xai
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
```

**중요**: xAI (Grok) API 키는 다음 중 하나를 사용할 수 있습니다:
- `GROK_API_KEY` (우선순위 1)
- `XAI_API_KEY` (우선순위 2, 대체 옵션)
- `OPENAI_API_KEY` (우선순위 3, 최후의 수단)

**참고**: 실제 API 키 값은 `.env.local` 파일을 참고하거나, Amplify 콘솔에서 직접 입력하세요.

### 2. amplify.yml 설정 확인

프로젝트의 `amplify.yml` 파일이 빌드 시 Amplify 환경변수를 `.env` 파일로 자동 생성하도록 설정되어 있습니다.

**작동 방식:**
1. Amplify 콘솔에서 환경변수 설정
2. 빌드 시 `preBuild` 단계에서 `.env` 파일 자동 생성
3. Next.js 빌드 시 `.env` 파일의 환경변수 자동 읽기

### 3. 환경변수 설정 확인

환경변수를 추가한 후:
1. **"Save"** 버튼 클릭
2. **"Redeploy this version"** 또는 새 배포 트리거
3. 빌드 로그에서 확인:
   - `.env file created successfully`
   - `Number of environment variables: X`

### 3. 중요 사항

#### NEXT_PUBLIC_ 접두사
- `NEXT_PUBLIC_` 접두사가 있는 변수는 **클라이언트 사이드**에서 접근 가능
- 빌드 타임에 주입되므로, 배포 후 변경하려면 재배포 필요

#### 서버 사이드 환경변수
- `NEXT_PUBLIC_` 접두사가 없는 변수는 **서버 사이드**에서만 접근 가능
- API 라우트 (`app/api/**`)에서만 사용 가능
- 클라이언트 사이드 코드에서는 접근 불가

### 4. xAI API 키 오류 해결

**오류 메시지**: "xAI API 키가 설정되지 않았습니다."

#### 해결 방법:

1. **Amplify 콘솔에서 환경변수 확인**
   - `GROK_API_KEY` 또는 `XAI_API_KEY`가 설정되어 있는지 확인
   - 환경변수 이름이 정확한지 확인 (대소문자 구분)

2. **빌드 로그 확인**
   - Amplify 콘솔 → Build history → 최신 빌드 → Build logs
   - `GROK_API_KEY is set (length: ...)` 메시지 확인

3. **런타임 로그 확인**
   - Amplify 콘솔 → Monitoring → Logs
   - `🔍 [LLM Config] 환경변수 확인:` 로그에서 다음 확인:
     - `hasGrokKey: true/false`
     - `hasXaiKey: true/false`
     - `selectedProvider: 'xai'`

4. **환경변수 재설정**
   - 환경변수를 삭제하고 다시 추가
   - 저장 후 **반드시 재배포** (Redeploy this version)

5. **대체 환경변수 사용**
   - `GROK_API_KEY`가 작동하지 않으면 `XAI_API_KEY`로 시도
   - 또는 `OPENAI_API_KEY`를 임시로 사용 (우선순위 3)

### 5. 문제 해결

#### 환경변수가 여전히 작동하지 않는 경우:

1. **빌드 로그 확인**
   - Amplify 콘솔 → 해당 앱 → Build history → 최신 빌드 → Build logs
   - 환경변수 확인 메시지가 나오는지 확인

2. **환경변수 이름 확인**
   - 대소문자 구분 확인
   - 오타 확인 (예: `OPENAI_API_KEY` vs `OPENAI_APIKEY`)

3. **재배포**
   - 환경변수 추가/수정 후 반드시 재배포 필요
   - Amplify 콘솔에서 "Redeploy this version" 클릭

4. **캐시 클리어**
   - Amplify 콘솔 → App settings → Build settings
   - "Clear cache and redeploy" 옵션 사용

### 5. 보안 주의사항

⚠️ **절대 `.env.local` 파일을 Git에 커밋하지 마세요!**
- `.gitignore`에 `.env.local`이 포함되어 있는지 확인
- API 키는 민감한 정보이므로 공개 저장소에 노출되지 않도록 주의

### 6. 로컬 개발 vs 프로덕션

- **로컬 개발**: `.env.local` 파일 사용
- **Amplify 배포**: Amplify 콘솔의 Environment variables 사용

두 환경의 환경변수는 별도로 관리되므로, 각각 설정해야 합니다.
