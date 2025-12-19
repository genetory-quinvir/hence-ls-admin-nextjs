'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useMockData } from '../context/MockDataContext'
import { User } from '../data/mockData'
import { getUsersAdmin, UserListMeta, getUserDetail, UserDetail, UserListFilterOptions, getReportedUsersAdmin, getPenaltyUsersAdmin } from '../lib/api'
import Modal from './Modal'
import styles from './UserList.module.css'
import * as XLSX from 'xlsx'

interface UserListProps {
  menuId: string
}

export default function UserList({ menuId }: UserListProps) {
  const { users, updateUsers } = useMockData()
  const [searchKeyword, setSearchKeyword] = useState('') // 검색어 입력
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined) // 실제 API에 전달되는 검색어
  const [filterRole, setFilterRole] = useState<'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'TESTER'>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NORMAL' | 'SUSPEND' | 'WARNING'>('ALL')
  const [filterMarketingConsent, setFilterMarketingConsent] = useState<string>('all') // 'all' | 'true' | 'false'
  const [joinStartDate, setJoinStartDate] = useState<string>('')
  const [joinEndDate, setJoinEndDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<UserListMeta | null>(null)
  const [apiUsers, setApiUsers] = useState<User[]>([]) // API에서 받은 사용자 리스트
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'suspend' | 'unsuspend' | 'warn' | 'unwarn' | 'detail' | null
    user: User | null
  }>({
    isOpen: false,
    type: null,
    user: null,
  })
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)
  const [sortField, setSortField] = useState<'createdAt' | 'nickname' | 'email' | 'provider' | 'activityScore' | 'points' | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  
  // 중복 API 호출 방지를 위한 ref
  const lastApiCallRef = useRef<{
    menuId: string | null
    currentPage: number
    filterOptionsKey: string
  } | null>(null)
  const isLoadingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 정렬 핸들러
  const handleSort = (field: 'createdAt' | 'nickname' | 'email' | 'provider' | 'activityScore' | 'points') => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 순서 토글
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      // 다른 필드를 클릭하면 해당 필드로 정렬 (기본 내림차순)
      setSortField(field)
      setSortOrder('DESC')
    }
    setCurrentPage(1) // 정렬 변경 시 첫 페이지로
  }
  
  // 검색 버튼 클릭 핸들러
  const handleSearch = () => {
    const trimmedKeyword = searchKeyword.trim()
    setAppliedKeyword(trimmedKeyword || undefined)
    setCurrentPage(1) // 검색 시 첫 페이지로
  }
  
  // 취소 버튼 클릭 핸들러
  const handleCancelSearch = () => {
    setSearchKeyword('')
    setAppliedKeyword(undefined)
    setCurrentPage(1) // 취소 시 첫 페이지로
  }
  
  // 필터 옵션 생성
  const filterOptions = useMemo<UserListFilterOptions>(() => {
    const options: UserListFilterOptions = {}
    
    // 검색어 (적용된 검색어만 사용)
    if (appliedKeyword) {
      options.keyword = appliedKeyword
    }
    
    // 역할 필터
    if (filterRole !== 'ALL') {
      options.role = filterRole
    }
    
    // 상태 필터
    if (filterStatus !== 'ALL') {
      options.status = filterStatus
    }
    
    // 마케팅 동의 필터
    if (filterMarketingConsent === 'true') {
      options.marketContent = true
    } else if (filterMarketingConsent === 'false') {
      options.marketContent = false
    }
    
    // 가입 기간 필터
    if (joinStartDate) {
      options.joinStartDate = joinStartDate
    }
    if (joinEndDate) {
      options.joinEndDate = joinEndDate
    }
    
    // 정렬
    if (sortField) {
      options.orderBy = sortField
      options.direction = sortOrder
    }
    
    return options
  }, [appliedKeyword, filterRole, filterStatus, filterMarketingConsent, joinStartDate, joinEndDate, sortField, sortOrder])
  
  // API에서 사용자 리스트 불러오기
  useEffect(() => {
    // users-list, users-reported, users-sanctions일 때만 API 호출
    if (menuId !== 'users-list' && menuId !== 'users-reported' && menuId !== 'users-sanctions') {
      return
    }

    // filterOptions를 문자열로 변환하여 비교 (객체 참조 변경 방지)
    const filterOptionsKey = JSON.stringify(filterOptions)
    
    console.log('[UserList] useEffect 실행:', {
      menuId,
      currentPage,
      filterOptionsKey,
      isLoadingRef: isLoadingRef.current,
      lastApiCall: lastApiCallRef.current,
      timestamp: new Date().toISOString(),
    })
    
    // 이전 호출과 동일한 파라미터인지 확인
    if (
      lastApiCallRef.current &&
      lastApiCallRef.current.menuId === menuId &&
      lastApiCallRef.current.currentPage === currentPage &&
      lastApiCallRef.current.filterOptionsKey === filterOptionsKey
    ) {
      // 동일한 파라미터로 이미 호출했으면 중복 호출 방지
      console.log('[UserList] 동일한 파라미터로 이미 호출됨, 중복 호출 방지')
      return
    }
    
    // 이미 로딩 중이면 중복 호출 방지
    if (isLoadingRef.current) {
      console.log('[UserList] 이미 로딩 중, 중복 호출 방지')
      return
    }
    
    // 이전 요청이 있으면 취소
    if (abortControllerRef.current) {
      console.log('[UserList] 이전 요청 취소')
      abortControllerRef.current.abort()
    }
    
    // 새로운 AbortController 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // 현재 호출 정보 저장
    lastApiCallRef.current = {
      menuId,
      currentPage,
      filterOptionsKey,
    }
    
    // 로딩 플래그 설정
    isLoadingRef.current = true
    
    console.log('[UserList] API 호출 시작:', {
      menuId,
      currentPage,
      filterOptionsKey,
      timestamp: new Date().toISOString(),
    })

    const loadUsers = async () => {
      // 로딩 상태는 설정하지만 화면은 변경하지 않음 (기존 데이터 유지)
      setIsLoading(true)
      setLoadError(null)
      
      try {
        let response: any
        
        // AbortSignal이 취소되었는지 확인
        if (abortController.signal.aborted) {
          return
        }
        
        console.log('[UserList] API 실제 호출:', {
          menuId,
          currentPage,
          timestamp: new Date().toISOString(),
        })
        
        if (menuId === 'users-reported') {
          // 신고 접수된 사용자 리스트는 별도 API 사용
          response = await getReportedUsersAdmin()
        } else if (menuId === 'users-sanctions') {
          // 제재/정지 관리 사용자 리스트는 별도 API 사용
          response = await getPenaltyUsersAdmin()
        } else if (menuId === 'users-list') {
          // 전체 사용자 리스트는 필터 옵션과 함께 API 호출
          response = await getUsersAdmin(currentPage, 20, filterOptions)
        }
        
        console.log('[UserList] API 응답 받음:', {
          menuId,
          success: response.success,
          dataLength: response.data?.length,
          isAborted: abortController.signal.aborted,
          timestamp: new Date().toISOString(),
        })
        
        // 응답이 성공적으로 받아졌다면 abort 상태와 관계없이 처리
        // (cleanup이 실행되어도 이미 받은 응답은 처리해야 함)
        if (response.success && response.data) {
          // API 데이터를 User 타입으로 변환
          const apiUsers: User[] = response.data.map((u: any) => ({
            id: u.id,
            nickname: u.nickname,
            profileImage: u.profileImage,
            provider: u.provider,
            email: u.email,
            role: u.role as User['role'],
            gender: u.gender,
            birthDate: u.birthDate,
            bio: u.bio,
            activityScore: u.activityScore,
            points: u.points,
            createdAt: u.createdAt,
            reportedCount: u.reportedCount,
            isSuspended: u.isSuspended,
            suspensionReason: u.suspensionReason,
            isWarned: u.isWarned,
            warnedAt: u.warnedAt,
            marketingConsentDate: u.marketingConsentDate || null,
          }))
          
          // API에서 받은 데이터를 직접 사용 (완료되면 그때 화면 업데이트)
          setApiUsers(apiUsers)
          
          // 페이징 메타 정보 저장 (신고 접수된 사용자는 페이징 없음)
          if (response.meta) {
            setPaginationMeta(response.meta)
          } else {
            setPaginationMeta(null)
          }
          // 성공 시 에러 상태 초기화
          setLoadError(null)
        } else {
          // 실패 시 에러 상태 설정 (abort 상태가 아닐 때만)
          if (!abortController.signal.aborted) {
            setLoadError(response.error || '사용자 리스트를 불러오는데 실패했습니다.')
          }
        }
      } catch (error: any) {
        // AbortError는 무시 (의도적인 취소)
        if (error?.name === 'AbortError') {
          console.log('[UserList] 요청이 AbortError로 취소됨')
          return
        }
        // abort 상태가 아닐 때만 에러 설정
        if (!abortController.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : '사용자 리스트를 불러오는 중 오류가 발생했습니다.')
        }
      } finally {
        // abort 상태와 관계없이 로딩 상태는 항상 해제
        setIsLoading(false)
        isLoadingRef.current = false
        console.log('[UserList] API 호출 완료:', {
          menuId,
          currentPage,
          isAborted: abortController.signal.aborted,
          timestamp: new Date().toISOString(),
        })
      }
    }
    
    loadUsers()
    
    // cleanup 함수: 컴포넌트 언마운트 또는 의존성 변경 시 이전 요청 취소
    return () => {
      console.log('[UserList] cleanup 함수 실행:', {
        menuId,
        currentPage,
        timestamp: new Date().toISOString(),
      })
      abortController.abort()
      isLoadingRef.current = false
    }
  }, [menuId, currentPage, filterOptions])
  
  // menuId 변경 시 첫 페이지로 리셋 및 필터 초기화
  useEffect(() => {
    setCurrentPage(1)
    setPaginationMeta(null)
    setApiUsers([])
    
    // menuId에 따라 초기 필터 설정
    if (menuId === 'users-reported') {
      setFilterStatus('ALL') // 신고된 사용자는 모든 상태
    } else if (menuId === 'users-sanctions') {
      setFilterStatus('SUSPEND') // 제재/정지 관리는 정지 상태만
    } else {
      setFilterStatus('ALL') // 전체 목록은 모든 상태
    }
    
    // 검색어는 유지하지 않고 초기화
    setSearchKeyword('')
    setAppliedKeyword(undefined)
    setFilterRole('ALL')
    setFilterMarketingConsent('all')
    setJoinStartDate('')
    setJoinEndDate('')
    setSortField(null)
    setSortOrder('DESC')
  }, [menuId])
  
  // 필터 변경 시 첫 페이지로 리셋 (페이지 이동 시에는 필터 유지)
  useEffect(() => {
    if (menuId === 'users-list') {
      setCurrentPage(1)
    }
  }, [filterRole, filterStatus, filterMarketingConsent, joinStartDate, joinEndDate, sortField, sortOrder, menuId])
  
  // 필터 초기화 함수
  const handleResetFilters = () => {
    setSearchKeyword('')
    setAppliedKeyword(undefined)
    setFilterRole('ALL')
    setFilterMarketingConsent('all')
    setJoinStartDate('')
    setJoinEndDate('')
    setSortField(null)
    setSortOrder('DESC')
    if (menuId === 'users-reported') {
      setFilterStatus('ALL')
    } else if (menuId === 'users-sanctions') {
      setFilterStatus('SUSPEND')
    } else {
      setFilterStatus('ALL')
    }
    setCurrentPage(1)
  }
  
  // Excel 다운로드 함수
  const handleDownloadExcel = () => {
    try {
      // 현재 필터링된 사용자 리스트를 Excel 형식으로 변환
      const excelData = displayedUsers.map((user) => ({
        '닉네임': user.nickname,
        '이메일': user.email,
        '프로바이더': getProviderLabel(user.provider),
        '활동지수': user.activityScore,
        '포인트': user.points,
        '상태': user.isSuspended ? '정지' : user.isWarned ? '경고' : '정상',
        '가입일': formatDate(user.createdAt),
        '마케팅 활용 동의': user.marketingConsentDate ? '동의' : '미동의',
        '성별': user.gender === 'male' ? '남성' : user.gender === 'female' ? '여성' : '비공개',
        '생년월일': user.birthDate || '-',
        '신고 횟수': user.reportedCount,
      }))
      
      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      
      // 워크북 생성
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '회원 리스트')
      
      // 컬럼 너비 설정
      const columnWidths = [
        { wch: 20 }, // 닉네임
        { wch: 30 }, // 이메일
        { wch: 12 }, // 프로바이더
        { wch: 10 }, // 활동지수
        { wch: 12 }, // 포인트
        { wch: 10 }, // 상태
        { wch: 15 }, // 가입일
        { wch: 15 }, // 마케팅 활용 동의
        { wch: 10 }, // 성별
        { wch: 12 }, // 생년월일
        { wch: 10 }, // 신고 횟수
      ]
      worksheet['!cols'] = columnWidths
      
      // 파일명 생성 (현재 날짜 포함)
      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const fileName = `회원리스트_${dateStr}.xlsx`
      
      // Excel 파일 다운로드
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Excel 다운로드 중 오류 발생:', error)
      alert('Excel 파일 다운로드 중 오류가 발생했습니다.')
    }
  }
  
  const getTitle = () => {
    switch (menuId) {
      case 'users-list':
        return '전체 사용자 리스트'
      case 'users-reported':
        return '신고 접수된 사용자'
      case 'users-sanctions':
        return '제재/정지 관리'
      default:
        return '사용자 리스트'
    }
  }

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      naver: '네이버',
      kakao: '카카오',
      google: '구글',
      apple: '애플'
    }
    return labels[provider] || provider
  }
  
  // 표시할 사용자 리스트 결정
  const displayedUsers = useMemo(() => {
    // API에서 받은 데이터 사용 (users-list, users-reported, users-sanctions)
    let filtered: User[]
    if (menuId === 'users-list' || menuId === 'users-reported' || menuId === 'users-sanctions') {
      filtered = [...apiUsers]
    } else {
      // 다른 메뉴는 Mock 데이터 사용 (기존 로직 유지)
      filtered = [...users]
      
      // 추가 필터 적용
      if (searchKeyword) {
        const keywordLower = searchKeyword.toLowerCase()
        filtered = filtered.filter(u => 
          u.nickname.toLowerCase().includes(keywordLower) ||
          u.email.toLowerCase().includes(keywordLower)
        )
      }
      
      if (filterRole !== 'ALL') {
        filtered = filtered.filter(u => u.role === filterRole)
      }
      
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'SUSPEND') {
          filtered = filtered.filter(u => u.isSuspended)
        } else if (filterStatus === 'NORMAL') {
          filtered = filtered.filter(u => !u.isSuspended && !u.isWarned)
        } else if (filterStatus === 'WARNING') {
          filtered = filtered.filter(u => u.isWarned)
        }
      }
      
      if (filterMarketingConsent !== 'all') {
        if (filterMarketingConsent === 'true') {
          filtered = filtered.filter(u => u.marketingConsentDate !== null && u.marketingConsentDate !== undefined)
        } else if (filterMarketingConsent === 'false') {
          filtered = filtered.filter(u => !u.marketingConsentDate || u.marketingConsentDate === null)
        }
      }
      
    }
    
    // 가입 기간 필터 적용 (Mock 데이터 사용 시에만 클라이언트 사이드 필터링)
    // users-list의 경우 API에서 이미 필터링된 데이터를 받으므로 클라이언트 사이드 필터링 불필요
    if (menuId !== 'users-list' && (joinStartDate || joinEndDate)) {
      filtered = filtered.filter(u => {
        const createdAt = new Date(u.createdAt)
        const createdDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate())
        
        if (joinStartDate) {
          const startDate = new Date(joinStartDate)
          if (createdDate < startDate) return false
        }
        
        if (joinEndDate) {
          const endDate = new Date(joinEndDate)
          // 종료일은 포함 (23:59:59까지)
          endDate.setHours(23, 59, 59, 999)
          if (createdDate > endDate) return false
        }
        
        return true
      })
    }
    
    // 정렬 적용 (모든 메뉴에 공통 적용)
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number
        
        if (sortField === 'nickname') {
          aValue = a.nickname.toLowerCase()
          bValue = b.nickname.toLowerCase()
        } else if (sortField === 'email') {
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
        } else if (sortField === 'createdAt') {
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
        } else if (sortField === 'activityScore') {
          aValue = a.activityScore
          bValue = b.activityScore
        } else if (sortField === 'points') {
          aValue = a.points
          bValue = b.points
        } else if (sortField === 'provider') {
          aValue = getProviderLabel(a.provider).toLowerCase()
          bValue = getProviderLabel(b.provider).toLowerCase()
        } else {
          return 0
        }
        
        if (aValue < bValue) {
          return sortOrder === 'ASC' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortOrder === 'ASC' ? 1 : -1
        }
        return 0
      })
    }
    
    return filtered
  }, [apiUsers, users, searchKeyword, filterRole, filterStatus, filterMarketingConsent, joinStartDate, joinEndDate, menuId, sortField, sortOrder])

  const handleDetail = async (user: User) => {
    setIsLoadingDetail(true)
    setUserDetail(null)
    setProfileImageError(false)
    
    try {
      const response = await getUserDetail(user.id)
      
      if (response.success && response.data) {
        setUserDetail(response.data)
        setModalState({
          isOpen: true,
          type: 'detail',
          user,
        })
      } else {
        alert(response.error || '사용자 상세 정보를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '사용자 상세 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleCloseDetailModal = () => {
    setModalState({ isOpen: false, type: null, user: null })
    setUserDetail(null)
    setProfileImageError(false)
  }

  const handleSuspend = (user: User) => {
    setModalState({
      isOpen: true,
      type: 'suspend',
      user,
    })
  }

  const handleWarn = (user: User) => {
    setModalState({
      isOpen: true,
      type: 'warn',
      user,
    })
  }

  const handleUnwarn = (user: User) => {
    setModalState({
      isOpen: true,
      type: 'unwarn',
      user,
    })
  }

  const handleUnsuspend = (user: User) => {
    setModalState({
      isOpen: true,
      type: 'unsuspend',
      user,
    })
  }

  const confirmAction = () => {
    if (!modalState.user) return

    // 모달 먼저 닫기
    setModalState({ isOpen: false, type: null, user: null })

    if (modalState.type === 'suspend') {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === modalState.user!.id
            ? { ...u, isSuspended: true, suspensionReason: '운영정책 위반' }
            : u
        )
      )
      setTimeout(() => {
        alert('사용자가 정지되었습니다.')
      }, 100)
    } else if (modalState.type === 'unsuspend') {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === modalState.user!.id
            ? { ...u, isSuspended: false, suspensionReason: undefined }
            : u
        )
      )
      setTimeout(() => {
        alert('사용자 정지가 해제되었습니다.')
      }, 100)
    } else if (modalState.type === 'warn') {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === modalState.user!.id
            ? { 
                ...u, 
                reportedCount: u.reportedCount + 1,
                isWarned: true,
                warnedAt: new Date().toISOString()
              }
            : u
        )
      )
      setTimeout(() => {
        alert('경고가 부여되었습니다.')
      }, 100)
    } else if (modalState.type === 'unwarn') {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === modalState.user!.id
            ? { 
                ...u, 
                isWarned: false,
                warnedAt: undefined
              }
            : u
        )
      )
      setTimeout(() => {
        alert('경고가 해제되었습니다.')
      }, 100)
    }
  }

  const getStatusBadge = (user: User) => {
    if (user.isSuspended) {
      return <span className={`${styles.badge} ${styles.suspended}`}>정지</span>
    }
    if (user.isWarned) {
      return <span className={`${styles.badge} ${styles.warning}`}>경고</span>
    }
    return <span className={`${styles.badge} ${styles.normal}`}>정상</span>
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        {menuId === 'users-list' && (
          <p className={styles.subtitle}>전체 사용자 목록입니다</p>
        )}
        {menuId === 'users-reported' && (
          <p className={styles.subtitle}>신고가 접수된 사용자 목록입니다</p>
        )}
        {menuId === 'users-sanctions' && (
          <p className={styles.subtitle}>제재 및 정지된 사용자 목록입니다</p>
        )}
      </div>

      <div className={styles.content}>
        {loadError && (
          <div className={styles.errorMessage}>
            <div>{loadError}</div>
            <button
              onClick={() => {
                setLoadError(null)
                setApiUsers([])
                // useEffect가 트리거되도록 하기 위해 lastApiCallRef 초기화
                lastApiCallRef.current = null
                // 현재 페이지를 다시 설정하여 useEffect 재실행
                setCurrentPage(prev => prev)
              }}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                background: '#4a9eff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              다시 시도
            </button>
          </div>
        )}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>검색</label>
            <div className={styles.searchInputWrapper}>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="닉네임 또는 이메일로 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
              />
              <button
                type="button"
                className={styles.searchButton}
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? '검색 중...' : '검색'}
              </button>
              {appliedKeyword && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancelSearch}
                  disabled={isLoading}
                >
                  취소
                </button>
              )}
            </div>
          </div>

          <div className={`${styles.filterGroup} ${styles.filterGroupSmall}`}>
            <label className={styles.filterLabel}>역할</label>
            <select 
              className={styles.filterSelect}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'TESTER')}
            >
              <option value="ALL">전체</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="TESTER">Tester</option>
            </select>
          </div>

          <div className={`${styles.filterGroup} ${styles.filterGroupSmall}`}>
            <label className={styles.filterLabel}>상태</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'NORMAL' | 'SUSPEND' | 'WARNING')}
            >
              <option value="ALL">전체</option>
              <option value="NORMAL">정상</option>
              <option value="WARNING">경고</option>
              <option value="SUSPEND">정지</option>
            </select>
          </div>

          <div className={`${styles.filterGroup} ${styles.filterGroupSmall}`}>
            <label className={styles.filterLabel}>마케팅 활용 동의</label>
            <select 
              className={styles.filterSelect}
              value={filterMarketingConsent}
              onChange={(e) => setFilterMarketingConsent(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="true">동의</option>
              <option value="false">미동의</option>
            </select>
          </div>

          <div className={`${styles.filterGroup} ${styles.filterGroupSmall}`}>
            <label className={styles.filterLabel}>가입 시작일</label>
            <input
              type="date"
              className={styles.filterInput}
              value={joinStartDate}
              onChange={(e) => setJoinStartDate(e.target.value)}
            />
          </div>

          <div className={`${styles.filterGroup} ${styles.filterGroupSmall}`}>
            <label className={styles.filterLabel}>가입 종료일</label>
            <input
              type="date"
              className={styles.filterInput}
              value={joinEndDate}
              onChange={(e) => setJoinEndDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button
              type="button"
              className={styles.resetFilterButton}
              onClick={handleResetFilters}
            >
              필터 초기화
            </button>
            <button
              type="button"
              className={styles.downloadButton}
              onClick={handleDownloadExcel}
              disabled={displayedUsers.length === 0}
            >
              Excel 다운로드
            </button>
          </div>
        </div>

        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>프로필</th>
                <th>
                  <button 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('nickname')}
                  >
                    닉네임
                    {sortField === 'nickname' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'ASC' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th>
                  <button 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('email')}
                  >
                    이메일
                    {sortField === 'email' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'ASC' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th>
                  <button 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('provider')}
                  >
                    프로바이더
                    {sortField === 'provider' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'ASC' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th>
                  <button 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('activityScore')}
                  >
                    활동지수
                    {sortField === 'activityScore' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'ASC' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th>
                  <button 
                    className={styles.sortableHeader}
                  >
                    포인트
                    {sortField === 'points' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'ASC' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th>상태</th>
                <th>
                  <button 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('createdAt')}
                  >
                    가입일
                    {sortField === 'createdAt' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'ASC' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th>마케팅 활용 동의</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    로딩 중...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    데이터를 불러오는 중 오류가 발생했습니다. 위의 에러 메시지를 확인하세요.
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    {(filterStatus !== 'all' || searchKeyword || filterRole !== 'all' || filterMarketingConsent !== 'all') ? (
                      '리스트가 없습니다.'
                    ) : (
                      menuId === 'users-reported'
                        ? '신고 접수된 사용자가 없습니다.'
                        : menuId === 'users-sanctions'
                        ? '제재/정지된 사용자가 없습니다.'
                        : '사용자가 없습니다.'
                    )}
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.profile}>
                        {user.profileImage ? (
                          <img src={user.profileImage} alt={user.nickname} />
                        ) : (
                          <div className={styles.profilePlaceholder}>
                            {user.nickname[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.nicknameCell}>
                        <div className={styles.nickname}>{user.nickname}</div>
                        {user.reportedCount > 0 && (
                          <span className={styles.reportedCountBadge}>
                            신고 {user.reportedCount}건
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.email}>{user.email}</span>
                    </td>
                    <td>{getProviderLabel(user.provider)}</td>
                    <td>
                      <span className={styles.activityScore}>{user.activityScore}</span>
                    </td>
                    <td>
                      <span className={styles.points}>{user.points.toLocaleString()}</span>
                    </td>
                    <td>{getStatusBadge(user)}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      {user.marketingConsentDate ? (
                        <span className={styles.consentBadge}>동의</span>
                      ) : (
                        <span className={styles.noConsentBadge}>미동의</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDetail(user)}
                          disabled={isLoadingDetail}
                        >
                          {isLoadingDetail && modalState.user?.id === user.id ? '로딩...' : '상세'}
                        </button>
                        {!user.isSuspended ? (
                          <button 
                            className={`${styles.actionBtn} ${styles.warning}`}
                            onClick={() => handleSuspend(user)}
                          >
                            정지
                          </button>
                        ) : (
                          <button 
                            className={`${styles.actionBtn} ${styles.success}`}
                            onClick={() => handleUnsuspend(user)}
                          >
                            정지 해제
                          </button>
                        )}
                        {!user.isWarned ? (
                          <button 
                            className={styles.actionBtn}
                            onClick={() => handleWarn(user)}
                          >
                            경고
                          </button>
                        ) : (
                          <button 
                            className={`${styles.actionBtn} ${styles.success}`}
                            onClick={() => handleUnwarn(user)}
                          >
                            경고 해제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 카드 리스트 (모바일) */}
        <div className={styles.cardList}>
          {isLoading ? (
            <div className={styles.emptyCard}>
              로딩 중...
            </div>
          ) : loadError ? (
            <div className={styles.emptyCard}>
              데이터를 불러오는 중 오류가 발생했습니다. 위의 에러 메시지를 확인하세요.
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className={styles.emptyCard}>
              {(filterStatus !== 'all' || searchKeyword || filterRole !== 'all' || filterMarketingConsent !== 'all') ? (
                '리스트가 없습니다.'
              ) : (
                menuId === 'users-reported'
                  ? '신고 접수된 사용자가 없습니다.'
                  : menuId === 'users-sanctions'
                  ? '제재/정지된 사용자가 없습니다.'
                  : '사용자가 없습니다.'
              )}
            </div>
          ) : (
            displayedUsers.map((user) => (
              <div key={user.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardProfile}>
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.nickname} />
                    ) : (
                      <div className={styles.profilePlaceholder}>
                        {user.nickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardTitle}>
                      {user.nickname}
                      {user.reportedCount > 0 && (
                        <span className={styles.reportedCountBadge}>
                          신고 {user.reportedCount}건
                        </span>
                      )}
                    </div>
                    <div className={styles.cardMeta}>
                      {user.email} · {getProviderLabel(user.provider)} · 활동지수: {user.activityScore}
                    </div>
                  </div>
                  <div className={styles.cardStatus}>
                    {getStatusBadge(user)}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>포인트</span>
                      <span className={styles.cardInfoValue}>{user.points.toLocaleString()}P</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>가입일</span>
                      <span className={styles.cardInfoValue}>{formatDate(user.createdAt)}</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>마케팅 활용 동의</span>
                      <span className={styles.cardInfoValue}>
                        {user.marketingConsentDate ? (
                          <span className={styles.consentBadge}>동의</span>
                        ) : (
                          <span className={styles.noConsentBadge}>미동의</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => handleDetail(user)}
                    disabled={isLoadingDetail}
                  >
                    {isLoadingDetail && modalState.user?.id === user.id ? '로딩...' : '상세'}
                  </button>
                  {!user.isSuspended ? (
                    <button 
                      className={`${styles.actionBtn} ${styles.warning}`}
                      onClick={() => handleSuspend(user)}
                    >
                      정지
                    </button>
                  ) : (
                    <button 
                      className={`${styles.actionBtn} ${styles.success}`}
                      onClick={() => handleUnsuspend(user)}
                    >
                      정지 해제
                    </button>
                  )}
                  {!user.isWarned ? (
                    <button 
                      className={styles.actionBtn}
                      onClick={() => handleWarn(user)}
                    >
                      경고
                    </button>
                  ) : (
                    <button 
                      className={`${styles.actionBtn} ${styles.success}`}
                      onClick={() => handleUnwarn(user)}
                    >
                      경고 해제
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이징 버튼 */}
        {menuId === 'users-list' && paginationMeta && paginationMeta.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationNavButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!paginationMeta.hasPrevious || isLoading}
            >
              ‹
            </button>
            <div className={styles.paginationNumbers}>
              {(() => {
                const pages: (number | string)[] = []
                const totalPages = paginationMeta.totalPages
                const current = paginationMeta.currentPage
                const maxVisible = 5 // 최대 표시할 페이지 수
                
                if (totalPages <= maxVisible) {
                  // 전체 페이지가 5개 이하면 모두 표시
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i)
                  }
                } else {
                  // 첫 페이지
                  pages.push(1)
                  
                  if (current <= 3) {
                    // 현재 페이지가 앞쪽에 있으면
                    for (let i = 2; i <= 4; i++) {
                      pages.push(i)
                    }
                    pages.push('...')
                    pages.push(totalPages)
                  } else if (current >= totalPages - 2) {
                    // 현재 페이지가 뒤쪽에 있으면
                    pages.push('...')
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                      pages.push(i)
                    }
                  } else {
                    // 현재 페이지가 중간에 있으면
                    pages.push('...')
                    for (let i = current - 1; i <= current + 1; i++) {
                      pages.push(i)
                    }
                    pages.push('...')
                    pages.push(totalPages)
                  }
                }
                
                return pages.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>
                        ...
                      </span>
                    )
                  }
                  return (
                    <button
                      key={page}
                      className={`${styles.paginationNumberButton} ${current === page ? styles.active : ''}`}
                      onClick={() => setCurrentPage(page as number)}
                      disabled={isLoading}
                    >
                      {page}
                    </button>
                  )
                })
              })()}
            </div>
            <button
              className={styles.paginationNavButton}
              onClick={() => setCurrentPage(prev => Math.min(paginationMeta.totalPages, prev + 1))}
              disabled={!paginationMeta.hasNext || isLoading}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* 사용자 상세 정보 Modal */}
      {modalState.type === 'detail' && userDetail && (
        <div 
          className={styles.modalOverlay}
          onClick={handleCloseDetailModal}
        >
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailModalHeader}>
              <h3 className={styles.detailModalTitle}>사용자 상세 정보</h3>
              <button 
                className={styles.detailModalClose}
                onClick={handleCloseDetailModal}
              >
                ×
              </button>
            </div>
            <div className={styles.detailModalBody}>
              {/* 프로필 섹션 */}
              <div className={styles.detailProfileSection}>
                {(() => {
                  // 프로필 이미지 추출
                  let profileImage: string | undefined = undefined
                  if (modalState.user?.profileImage) {
                    profileImage = modalState.user.profileImage
                  } else if (userDetail.providerOrigin?.providerOrigin) {
                    const origin = userDetail.providerOrigin.providerOrigin
                    if (origin.profile_image_url) profileImage = origin.profile_image_url
                    else if (origin.picture) profileImage = origin.picture
                    else if (origin.profile?.profile_image_url) profileImage = origin.profile.profile_image_url
                  }
                  
                  return (
                    <div className={styles.detailProfile}>
                      {profileImage && !profileImageError ? (
                        <img 
                          src={profileImage} 
                          alt={userDetail.nickname}
                          onError={() => setProfileImageError(true)}
                          onLoad={() => setProfileImageError(false)}
                        />
                      ) : (
                        <div className={styles.detailProfilePlaceholder}>
                          {userDetail.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div className={styles.detailProfileInfo}>
                  <h4 className={styles.detailProfileName}>{userDetail.nickname}</h4>
                  <p className={styles.detailProfileEmail}>{userDetail.email}</p>
                </div>
              </div>

              {/* 정보 그리드 (2열) */}
              <div className={styles.detailInfoGrid}>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>ID</span>
                  <span className={styles.detailInfoValue}>{userDetail.id}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>이름</span>
                  <span className={styles.detailInfoValue}>{userDetail.name || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>프로바이더</span>
                  <span className={styles.detailInfoValue}>{getProviderLabel(userDetail.provider.toLowerCase())}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>성별</span>
                  <span className={styles.detailInfoValue}>
                    {userDetail.gender === 'secret' ? '비공개' : userDetail.gender === 'female' ? '여성' : userDetail.gender === 'male' ? '남성' : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>생년월일</span>
                  <span className={styles.detailInfoValue}>{userDetail.dateOfBirth || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>연락처</span>
                  <span className={styles.detailInfoValue}>{userDetail.contact || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>마케팅 동의일</span>
                  <span className={styles.detailInfoValue}>
                    {userDetail.marketingConsentDate ? formatDate(userDetail.marketingConsentDate) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>가입일</span>
                  <span className={styles.detailInfoValue}>{formatDate(userDetail.createdAt)}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>수정일</span>
                  <span className={styles.detailInfoValue}>{formatDate(userDetail.updatedAt)}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>최종 로그인</span>
                  <span className={styles.detailInfoValue}>
                    {userDetail.lastLoginAt ? formatDate(userDetail.lastLoginAt) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>탈퇴 사유</span>
                  <span className={styles.detailInfoValue}>{userDetail.withdrawalReason || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>탈퇴일</span>
                  <span className={styles.detailInfoValue}>
                    {userDetail.deletedAt ? formatDate(userDetail.deletedAt) : '-'}
                  </span>
                </div>
                {/* 자기소개는 전체 너비로 */}
                <div className={`${styles.detailInfoItem} ${styles.detailInfoItemFull}`}>
                  <span className={styles.detailInfoLabel}>자기소개</span>
                  <span className={styles.detailInfoValue}>{userDetail.introduction || '-'}</span>
                </div>
              </div>
            </div>
            <div className={styles.detailModalFooter}>
              <div className={styles.detailModalActions}>
                {modalState.user && !modalState.user.isSuspended ? (
                  <button 
                    className={`${styles.detailModalActionButton} ${styles.warning}`}
                    onClick={() => {
                      handleCloseDetailModal()
                      handleSuspend(modalState.user!)
                    }}
                  >
                    정지
                  </button>
                ) : modalState.user && modalState.user.isSuspended ? (
                  <button 
                    className={`${styles.detailModalActionButton} ${styles.success}`}
                    onClick={() => {
                      handleCloseDetailModal()
                      handleUnsuspend(modalState.user!)
                    }}
                  >
                    정지 해제
                  </button>
                ) : null}
                {modalState.user && !modalState.user.isWarned ? (
                  <button 
                    className={styles.detailModalActionButton}
                    onClick={() => {
                      handleCloseDetailModal()
                      handleWarn(modalState.user!)
                    }}
                  >
                    경고
                  </button>
                ) : modalState.user && modalState.user.isWarned ? (
                  <button 
                    className={styles.detailModalActionButton}
                    onClick={() => {
                      handleCloseDetailModal()
                      handleUnwarn(modalState.user!)
                    }}
                  >
                    경고 해제
                  </button>
                ) : null}
              </div>
              <button
                className={styles.detailModalButton}
                onClick={handleCloseDetailModal}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 액션 Modal (정지, 경고 등) */}
      {modalState.type !== 'detail' && (
        <Modal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, user: null })}
          title={
            modalState.type === 'suspend'
              ? '사용자 정지'
              : modalState.type === 'unsuspend'
              ? '정지 해제'
              : modalState.type === 'warn'
              ? '경고 부여'
              : '경고 해제'
          }
          message={
            modalState.type === 'suspend'
              ? `"${modalState.user?.nickname}" 사용자를 정지하시겠습니까?\n\n해당 사용자는 즉시 정지되며, 서비스 이용이 제한됩니다.`
              : modalState.type === 'unsuspend'
              ? `"${modalState.user?.nickname}" 사용자의 정지를 해제하시겠습니까?\n\n해당 사용자는 다시 서비스를 이용할 수 있습니다.`
              : modalState.type === 'warn'
              ? `"${modalState.user?.nickname}" 사용자에게 경고를 부여하시겠습니까?\n\n경고가 부여되면 사용자 상태가 변경됩니다.`
              : `"${modalState.user?.nickname}" 사용자의 경고를 해제하시겠습니까?\n\n경고가 해제되면 사용자 상태가 정상으로 변경됩니다.`
          }
          confirmText="확인"
          cancelText="취소"
          onConfirm={confirmAction}
          type={
            modalState.type === 'suspend'
              ? 'danger'
              : modalState.type === 'unsuspend'
              ? 'warning'
              : modalState.type === 'warn'
              ? 'warning'
              : 'warning'
          }
        />
      )}
    </div>
  )
}

