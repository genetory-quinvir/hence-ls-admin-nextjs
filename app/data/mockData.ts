// 목업 데이터

export type LiveSpaceCategory = '팝업' | '전시' | '이벤트' | '세일/혜택' | '맛집' | 'HENCE'

export interface LiveSpace {
  id: string
  title: string
  hostNickname: string
  hostId: string
  thumbnail?: string
  category?: LiveSpaceCategory
  status: 'live' | 'ended'
  createdAt: string
  startedAt?: string
  endedAt?: string
  scheduledStartTime?: string
  scheduledEndTime?: string
  location: {
    lat: number
    lng: number
    address: string
    district: string
  }
  checkInCount: number
  feedCount: number
  reportedCount: number
  isForceClosed?: boolean
  isHidden?: boolean
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'TESTER'

export interface User {
  id: string
  nickname: string
  profileImage?: string
  provider: 'naver' | 'kakao' | 'google' | 'apple'
  email: string
  role: UserRole
  gender?: 'female' | 'male' | 'private'
  birthDate?: string
  bio?: string
  activityScore: number
  points: number
  createdAt: string
  reportedCount: number
  isSuspended: boolean
  suspensionReason?: string
  isWarned?: boolean
  warnedAt?: string
}

export interface Feed {
  id: string
  liveSpaceId: string
  liveSpaceTitle: string
  authorId: string
  authorNickname: string
  authorProfileImage?: string
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  createdAt: string
  reportedCount: number
}

export interface Comment {
  id: string
  feedId: string
  authorId: string
  authorNickname: string
  authorProfileImage?: string
  content: string
  image?: string
  createdAt: string
  reportedCount: number
}

export interface Report {
  id: string
  type: 'live-space' | 'feed' | 'comment' | 'user'
  targetId: string
  targetTitle?: string
  reporterId: string
  reporterNickname: string
  reason: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  createdAt: string
  processedAt?: string
  processorId?: string
  result?: string
}

export interface Reward {
  id: string
  productName: string
  description: string
  thumbnail: string
  pointsRequired: number
  status: 'active' | 'inactive'
  exchangeCount: number
}

export interface RewardHistory {
  id: string
  userId: string
  userNickname: string
  rewardId: string
  rewardName: string
  pointsUsed: number
  phoneNumber: string
  status: 'pending' | 'shipped' | 'completed' | 'cancelled'
  createdAt: string
}

export interface PhoneAuthLog {
  id: string
  userId: string
  userNickname: string
  phoneNumber: string
  purpose: 'reward' | 'profile'
  status: 'success' | 'failed'
  createdAt: string
}

export interface AppVersion {
  id: string
  version: string
  platform: 'ios' | 'android'
  forceUpdate: boolean
  releaseNotes: string
  releasedAt: string
  status: 'active' | 'inactive'
}

export interface Notice {
  id: string
  title: string
  content: string
  isImportant: boolean
  createdAt: string
  updatedAt: string
}

export interface FAQ {
  id: string
  category: string
  question: string
  answer: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Operator {
  id: string
  email: string
  nickname: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  permissions: string[]
  lastLoginAt: string
  createdAt: string
}

export interface PermissionLog {
  id: string
  operatorId: string
  operatorEmail: string
  action: string
  targetType: string
  targetId: string
  details: string
  createdAt: string
}

// 목업 데이터 생성 함수들
export const generateMockLiveSpaces = (): LiveSpace[] => {
  return [
    {
      id: 'ls-001',
      title: '강남역 카페에서 작업 중',
      hostNickname: '홍길동',
      hostId: 'user-001',
      category: '맛집',
      status: 'live',
      createdAt: '2025-01-17T10:30:00Z',
      startedAt: '2025-01-17T10:30:00Z',
      location: {
        lat: 37.4980,
        lng: 127.0276,
        address: '서울특별시 강남구 강남대로 396',
        district: '강남구'
      },
      checkInCount: 12,
      feedCount: 8,
      reportedCount: 0
    },
    {
      id: 'ls-002',
      title: '홍대 걷기',
      hostNickname: '김철수',
      hostId: 'user-002',
      category: '이벤트',
      status: 'live',
      createdAt: '2025-01-17T09:15:00Z',
      startedAt: '2025-01-17T09:15:00Z',
      location: {
        lat: 37.5563,
        lng: 126.9236,
        address: '서울특별시 마포구 홍익로 3',
        district: '마포구'
      },
      checkInCount: 25,
      feedCount: 15,
      reportedCount: 1
    },
    {
      id: 'ls-003',
      title: '',
      hostNickname: '이영희',
      hostId: 'user-003',
      category: '전시',
      status: 'ended',
      createdAt: '2025-01-16T14:20:00Z',
      startedAt: '2025-01-16T14:20:00Z',
      endedAt: '2025-01-16T18:20:00Z',
      location: {
        lat: 37.5665,
        lng: 126.9780,
        address: '서울특별시 중구 세종대로 110',
        district: '중구'
      },
      checkInCount: 5,
      feedCount: 3,
      reportedCount: 0
    },
    {
      id: 'ls-004',
      title: '잠실 롯데월드 근처',
      hostNickname: '박민수',
      hostId: 'user-004',
      category: 'HENCE',
      status: 'live',
      createdAt: '2025-01-17T11:00:00Z',
      startedAt: '2025-01-17T11:00:00Z',
      location: {
        lat: 37.5133,
        lng: 127.1028,
        address: '서울특별시 송파구 올림픽로 240',
        district: '송파구'
      },
      checkInCount: 8,
      feedCount: 4,
      reportedCount: 2
    },
    {
      id: 'ls-005',
      title: '부적절한 내용의 스페이스',
      hostNickname: '신고대상',
      hostId: 'user-005',
      category: '팝업',
      status: 'live',
      createdAt: '2025-01-17T08:00:00Z',
      startedAt: '2025-01-17T08:00:00Z',
      location: {
        lat: 37.5665,
        lng: 126.9780,
        address: '서울특별시 중구 명동길 26',
        district: '중구'
      },
      checkInCount: 2,
      feedCount: 1,
      reportedCount: 5
    },
    {
      id: 'ls-006',
      title: '체크인 없는 스페이스',
      hostNickname: '문제사용자',
      hostId: 'user-006',
      category: '세일/혜택',
      status: 'live',
      createdAt: '2025-01-17T12:00:00Z',
      startedAt: '2025-01-17T12:00:00Z',
      location: {
        lat: 37.5665,
        lng: 126.9780,
        address: '서울특별시 중구 을지로 100',
        district: '중구'
      },
      checkInCount: 0,
      feedCount: 0,
      reportedCount: 0
    },
    {
      id: 'ls-007',
      title: '과거 신고된 스페이스',
      hostNickname: '과거신고',
      hostId: 'user-007',
      category: '맛집',
      status: 'ended',
      createdAt: '2025-01-15T10:00:00Z',
      startedAt: '2025-01-15T10:00:00Z',
      endedAt: '2025-01-15T14:00:00Z',
      location: {
        lat: 37.4980,
        lng: 127.0276,
        address: '서울특별시 강남구 테헤란로 123',
        district: '강남구'
      },
      checkInCount: 10,
      feedCount: 5,
      reportedCount: 3
    }
  ]
}

export const generateMockUsers = (): User[] => {
  return [
    {
      id: 'user-001',
      nickname: '홍길동',
      provider: 'kakao',
      email: 'hong@example.com',
      role: 'MEMBER',
      gender: 'male',
      bio: '안녕하세요! 강남에서 활동 중입니다.',
      activityScore: 85,
      points: 1250,
      createdAt: '2024-12-01T00:00:00Z',
      reportedCount: 0,
      isSuspended: false
    },
    {
      id: 'user-002',
      nickname: '김철수',
      provider: 'naver',
      email: 'kim@example.com',
      role: 'MEMBER',
      gender: 'male',
      activityScore: 92,
      points: 2100,
      createdAt: '2024-11-15T00:00:00Z',
      reportedCount: 1,
      isSuspended: false
    },
    {
      id: 'user-003',
      nickname: '이영희',
      provider: 'google',
      email: 'lee@example.com',
      role: 'MEMBER',
      gender: 'female',
      bio: '홍대를 좋아해요 🎨',
      activityScore: 78,
      points: 890,
      createdAt: '2024-12-20T00:00:00Z',
      reportedCount: 0,
      isSuspended: false
    },
    {
      id: 'user-004',
      nickname: '박민수',
      provider: 'apple',
      email: 'park@example.com',
      role: 'MEMBER',
      activityScore: 65,
      points: 450,
      createdAt: '2025-01-05T00:00:00Z',
      reportedCount: 2,
      isSuspended: false
    },
    {
      id: 'user-005',
      nickname: '신고대상',
      provider: 'kakao',
      email: 'reported@example.com',
      role: 'MEMBER',
      activityScore: 20,
      points: 50,
      createdAt: '2025-01-10T00:00:00Z',
      reportedCount: 8,
      isSuspended: true,
      suspensionReason: '부적절한 콘텐츠 반복 게시'
    }
  ]
}

export const generateMockFeeds = (): Feed[] => {
  return [
    {
      id: 'feed-001',
      liveSpaceId: 'ls-001',
      liveSpaceTitle: '강남역 카페에서 작업 중',
      authorId: 'user-001',
      authorNickname: '홍길동',
      content: '오늘 날씨가 정말 좋네요! 카페에서 작업하기 딱 좋은 날씨입니다 ☀️',
      images: [],
      likeCount: 12,
      commentCount: 3,
      createdAt: '2025-01-17T10:45:00Z',
      reportedCount: 0
    },
    {
      id: 'feed-002',
      liveSpaceId: 'ls-002',
      liveSpaceTitle: '홍대 걷기',
      authorId: 'user-002',
      authorNickname: '김철수',
      content: '홍대 거리 풍경이 너무 예뻐요!',
      images: [],
      likeCount: 25,
      commentCount: 8,
      createdAt: '2025-01-17T09:30:00Z',
      reportedCount: 0
    },
    {
      id: 'feed-003',
      liveSpaceId: 'ls-001',
      liveSpaceTitle: '강남역 카페에서 작업 중',
      authorId: 'user-003',
      authorNickname: '이영희',
      content: '여기 커피 맛있어요! 추천합니다 ☕',
      images: [],
      likeCount: 8,
      commentCount: 2,
      createdAt: '2025-01-17T11:00:00Z',
      reportedCount: 1
    },
    {
      id: 'feed-004',
      liveSpaceId: 'ls-005',
      liveSpaceTitle: '부적절한 내용의 스페이스',
      authorId: 'user-005',
      authorNickname: '신고대상',
      content: '부적절한 내용입니다...',
      images: [],
      likeCount: 0,
      commentCount: 0,
      createdAt: '2025-01-17T08:15:00Z',
      reportedCount: 5
    }
  ]
}

export const generateMockComments = (): Comment[] => {
  return [
    {
      id: 'comment-001',
      feedId: 'feed-001',
      authorId: 'user-002',
      authorNickname: '김철수',
      content: '저도 가고 싶어요!',
      createdAt: '2025-01-17T10:50:00Z',
      reportedCount: 0
    },
    {
      id: 'comment-002',
      feedId: 'feed-001',
      authorId: 'user-003',
      authorNickname: '이영희',
      content: '좋은 정보 감사합니다!',
      createdAt: '2025-01-17T11:05:00Z',
      reportedCount: 0
    },
    {
      id: 'comment-003',
      feedId: 'feed-002',
      authorId: 'user-001',
      authorNickname: '홍길동',
      content: '홍대 정말 좋죠!',
      createdAt: '2025-01-17T09:35:00Z',
      reportedCount: 0
    },
    {
      id: 'comment-004',
      feedId: 'feed-003',
      authorId: 'user-005',
      authorNickname: '신고대상',
      content: '부적절한 댓글 내용',
      createdAt: '2025-01-17T11:10:00Z',
      reportedCount: 3
    }
  ]
}

export const generateMockReports = (): Report[] => {
  return [
    {
      id: 'report-001',
      type: 'live-space',
      targetId: 'ls-005',
      targetTitle: '부적절한 내용의 스페이스',
      reporterId: 'user-001',
      reporterNickname: '홍길동',
      reason: '부적절한 콘텐츠',
      status: 'pending',
      createdAt: '2025-01-17T08:30:00Z'
    },
    {
      id: 'report-002',
      type: 'feed',
      targetId: 'feed-004',
      reporterId: 'user-002',
      reporterNickname: '김철수',
      reason: '스팸',
      status: 'pending',
      createdAt: '2025-01-17T08:45:00Z'
    },
    {
      id: 'report-003',
      type: 'user',
      targetId: 'user-005',
      reporterId: 'user-003',
      reporterNickname: '이영희',
      reason: '욕설 및 비방',
      status: 'processing',
      createdAt: '2025-01-17T09:00:00Z',
      processorId: 'admin-001'
    },
    {
      id: 'report-004',
      type: 'comment',
      targetId: 'comment-004',
      reporterId: 'user-001',
      reporterNickname: '홍길동',
      reason: '부적절한 댓글',
      status: 'completed',
      createdAt: '2025-01-17T11:15:00Z',
      processedAt: '2025-01-17T12:00:00Z',
      processorId: 'admin-001',
      result: '댓글 삭제 처리 완료'
    }
  ]
}

export const generateMockRewards = (): Reward[] => {
  return [
    {
      id: 'reward-001',
      productName: '스타벅스 아메리카노 Tall',
      description: '스타벅스 아메리카노 Tall 쿠폰',
      thumbnail: '',
      pointsRequired: 500,
      status: 'active',
      exchangeCount: 45
    },
    {
      id: 'reward-002',
      productName: 'CGV 영화 관람권',
      description: 'CGV 영화 관람권 1매',
      thumbnail: '',
      pointsRequired: 1000,
      status: 'active',
      exchangeCount: 23
    },
    {
      id: 'reward-003',
      productName: '편의점 상품권 5천원',
      description: '편의점 상품권 5천원권',
      thumbnail: '',
      pointsRequired: 800,
      status: 'active',
      exchangeCount: 67
    }
  ]
}

export const generateMockRewardHistory = (): RewardHistory[] => {
  return [
    {
      id: 'rh-001',
      userId: 'user-001',
      userNickname: '홍길동',
      rewardId: 'reward-001',
      rewardName: '스타벅스 아메리카노 Tall',
      pointsUsed: 500,
      phoneNumber: '010-1234-5678',
      status: 'shipped',
      createdAt: '2025-01-15T10:00:00Z'
    },
    {
      id: 'rh-002',
      userId: 'user-002',
      userNickname: '김철수',
      rewardId: 'reward-002',
      rewardName: 'CGV 영화 관람권',
      pointsUsed: 1000,
      phoneNumber: '010-2345-6789',
      status: 'completed',
      createdAt: '2025-01-10T14:30:00Z'
    },
    {
      id: 'rh-003',
      userId: 'user-003',
      userNickname: '이영희',
      rewardId: 'reward-003',
      rewardName: '편의점 상품권 5천원',
      pointsUsed: 800,
      phoneNumber: '010-3456-7890',
      status: 'pending',
      createdAt: '2025-01-17T09:00:00Z'
    }
  ]
}

export const generateMockPhoneAuthLogs = (): PhoneAuthLog[] => {
  return [
    {
      id: 'auth-001',
      userId: 'user-001',
      userNickname: '홍길동',
      phoneNumber: '010-1234-5678',
      purpose: 'reward',
      status: 'success',
      createdAt: '2025-01-15T10:00:00Z'
    },
    {
      id: 'auth-002',
      userId: 'user-002',
      userNickname: '김철수',
      phoneNumber: '010-2345-6789',
      purpose: 'reward',
      status: 'success',
      createdAt: '2025-01-10T14:30:00Z'
    },
    {
      id: 'auth-003',
      userId: 'user-003',
      userNickname: '이영희',
      phoneNumber: '010-3456-7890',
      purpose: 'profile',
      status: 'success',
      createdAt: '2025-01-12T16:20:00Z'
    }
  ]
}

export const generateMockAppVersions = (): AppVersion[] => {
  return [
    {
      id: 'version-001',
      version: '1.2.0',
      platform: 'ios',
      forceUpdate: false,
      releaseNotes: '버그 수정 및 성능 개선',
      releasedAt: '2025-01-15T00:00:00Z',
      status: 'active'
    },
    {
      id: 'version-002',
      version: '1.2.0',
      platform: 'android',
      forceUpdate: false,
      releaseNotes: '버그 수정 및 성능 개선',
      releasedAt: '2025-01-15T00:00:00Z',
      status: 'active'
    },
    {
      id: 'version-003',
      version: '1.1.5',
      platform: 'ios',
      forceUpdate: false,
      releaseNotes: '이전 버전',
      releasedAt: '2025-01-01T00:00:00Z',
      status: 'inactive'
    }
  ]
}

export const generateMockNotices = (): Notice[] => {
  return [
    {
      id: 'notice-001',
      title: '서비스 점검 안내',
      content: '2025년 1월 20일 새벽 2시부터 4시까지 서비스 점검이 진행됩니다.',
      isImportant: true,
      createdAt: '2025-01-17T00:00:00Z',
      updatedAt: '2025-01-17T00:00:00Z'
    },
    {
      id: 'notice-002',
      title: '새로운 기능 업데이트',
      content: '라이브 스페이스 기능이 업데이트되었습니다.',
      isImportant: false,
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z'
    }
  ]
}

export const generateMockFAQs = (): FAQ[] => {
  return [
    {
      id: 'faq-001',
      category: '회원가입',
      question: '소셜 로그인은 어떻게 하나요?',
      answer: '네이버, 카카오, 구글, 애플 계정으로 간편하게 로그인할 수 있습니다.',
      order: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'faq-002',
      category: '포인트',
      question: '포인트는 어떻게 얻나요?',
      answer: '라이브 스페이스 개설, 체크인, 피드 작성 등의 활동을 통해 포인트를 획득할 수 있습니다.',
      order: 2,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'faq-003',
      category: '라이브 스페이스',
      question: '라이브 스페이스는 얼마나 유지되나요?',
      answer: '기본적으로 n시간 동안 유지됩니다.',
      order: 3,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }
  ]
}

export const generateMockOperators = (): Operator[] => {
  return [
    {
      id: 'op-001',
      email: 'admin@hence.com',
      nickname: '관리자1',
      role: 'SUPER_ADMIN',
      permissions: ['all'],
      lastLoginAt: '2025-01-17T09:00:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'op-002',
      email: 'moderator@hence.com',
      nickname: '모더레이터1',
      role: 'ADMIN',
      permissions: ['moderate', 'view'],
      lastLoginAt: '2025-01-17T10:30:00Z',
      createdAt: '2024-06-01T00:00:00Z'
    }
  ]
}

export const generateMockPermissionLogs = (): PermissionLog[] => {
  return [
    {
      id: 'log-001',
      operatorId: 'op-001',
      operatorEmail: 'admin@hence.com',
      action: 'DELETE_FEED',
      targetType: 'feed',
      targetId: 'feed-004',
      details: '부적절한 콘텐츠로 인한 삭제',
      createdAt: '2025-01-17T12:00:00Z'
    },
    {
      id: 'log-002',
      operatorId: 'op-002',
      operatorEmail: 'moderator@hence.com',
      action: 'SUSPEND_USER',
      targetType: 'user',
      targetId: 'user-005',
      details: '반복적인 신고로 인한 계정 정지',
      createdAt: '2025-01-17T11:00:00Z'
    }
  ]
}

