'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useMockData } from '../context/MockDataContext'
import { LiveSpace } from '../data/mockData'
import { getLiveSpacesAdmin, LiveSpaceListMeta, deleteLiveSpaceAdmin } from '../lib/api'
import Modal from './Modal'
import styles from './LiveSpaceList.module.css'

interface LiveSpaceListProps {
  menuId: string
}

export default function LiveSpaceList({ menuId }: LiveSpaceListProps) {
  const { liveSpaces, updateLiveSpaces } = useMockData()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<LiveSpaceListMeta | null>(null)
  const [apiLiveSpaces, setApiLiveSpaces] = useState<LiveSpace[]>([])
  const [selectedLiveSpace, setSelectedLiveSpace] = useState<LiveSpace | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // 중복 API 호출 방지를 위한 ref
  const lastApiCallRef = useRef<{
    menuId: string | null
    currentPage: number
  } | null>(null)
  const isLoadingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // API에서 Live Space 리스트 불러오기 (재사용 가능하도록 외부 함수로 분리)
  const loadLiveSpaces = async (page: number = currentPage, skipDuplicateCheck: boolean = false) => {
    if (menuId !== 'live-space-list') {
      return
    }

    // 중복 체크 스킵이 아닌 경우에만 확인
    if (!skipDuplicateCheck) {
      // 이전 호출과 동일한 파라미터인지 확인
      if (
        lastApiCallRef.current &&
        lastApiCallRef.current.menuId === menuId &&
        lastApiCallRef.current.currentPage === page
      ) {
        return
      }
      
      // 이미 로딩 중이면 중복 호출 방지
      if (isLoadingRef.current) {
        return
      }
    }
    
    // 이전 요청이 있으면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 새로운 AbortController 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // 현재 호출 정보 저장
    lastApiCallRef.current = {
      menuId,
      currentPage: page,
    }
    
    // 로딩 플래그 설정
    isLoadingRef.current = true

    try {
      setIsLoading(true)
      setLoadError(null)
      
      const response = await getLiveSpacesAdmin(page, 20)
      
      if (abortController.signal.aborted) {
        return
      }
      
      if (response.success && response.data) {
          // API 데이터를 LiveSpace 타입으로 변환
          const convertedSpaces: LiveSpace[] = response.data
            .filter(s => !s.deletedAt) // 삭제된 항목만 제외
            .map((s) => {
              // status 결정 (endsAt이 있고 현재 시간보다 이전이면 ended, 아니면 live)
              const now = new Date()
              const endsAt = s.endsAt ? new Date(s.endsAt) : null
              const status: 'live' | 'ended' = endsAt && endsAt < now ? 'ended' : 'live'
              
              // district 추출 (address에서)
              const district = s.address 
                ? (s.address.match(/(\S+구|\S+시|\S+군)/)?.[0] || '')
                : ''
              
              console.log('[LiveSpaceList] 카테고리 데이터 확인:', {
                id: s.id,
                categoryName: s.categoryName,
                title: s.title,
              })
              
              return {
                id: s.id,
                title: s.title || '',
                hostNickname: s.hostNickname || '알 수 없음',
                hostId: s.hostId,
                thumbnail: s.thumbnail,
                category: s.categoryName as LiveSpace['category'],
                status,
                createdAt: s.createdAt,
                startedAt: s.startsAt,
                endedAt: s.endsAt,
                scheduledStartTime: s.startsAt,
                scheduledEndTime: s.endsAt,
                location: {
                  lat: s.location.lat,
                  lng: s.location.lng,
                  address: s.address || s.placeName || '',
                  district,
                },
                checkInCount: s.participantCount,
                feedCount: s.feedCount,
                reportedCount: 0, // API에서 제공되지 않음
                isForceClosed: false, // API에서 제공되지 않음
                isHidden: false, // API에서 이미 displayStatus로 필터링했으므로 항상 false
                tags: s.tags || [], // API 응답의 tags 필드 사용
              }
            })
          
          console.log('[LiveSpaceList] API 데이터 변환 완료:', {
            originalCount: response.data.length,
            convertedCount: convertedSpaces.length,
            convertedSpaces: convertedSpaces.slice(0, 3), // 처음 3개만 로그
            timestamp: new Date().toISOString(),
          })
          
          setApiLiveSpaces(convertedSpaces)
          
        if (response.meta) {
          setPaginationMeta(response.meta)
        } else {
          setPaginationMeta(null)
        }
      } else {
        setLoadError(response.error || 'Live Space 리스트를 불러오는데 실패했습니다.')
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return
      }
      if (!abortController.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : 'Live Space 리스트를 불러오는 중 오류가 발생했습니다.')
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }
  }

  // menuId 변경 시 로딩 상태 초기화 및 API 호출 (live-space-list만)
  useEffect(() => {
    // menuId가 변경되면 로딩 상태 초기화
    if (menuId !== 'live-space-list') {
      setIsLoading(false)
      isLoadingRef.current = false
      setLoadError(null)
      return
    }
    
    // live-space-list일 때만 API 호출
    loadLiveSpaces(currentPage)
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      isLoadingRef.current = false
    }
  }, [menuId, currentPage])
  
  // menuId 변경 시 첫 페이지로 리셋
  useEffect(() => {
    if (menuId === 'live-space-list') {
      setCurrentPage(1)
      setPaginationMeta(null)
      setApiLiveSpaces([])
      lastApiCallRef.current = null
    }
    
    // menuId에 따라 초기 필터 설정
    if (menuId === 'live-space-force-close') {
      setFilterStatus('live') // 강제 종료 큐는 라이브 상태만
    } else if (menuId === 'live-space-reported') {
      setFilterStatus('all') // 신고된 스페이스는 모든 상태
    } else {
      setFilterStatus('all') // 전체 목록은 모든 상태
    }
  }, [menuId])
  
  const getTitle = () => {
    switch (menuId) {
      case 'live-space-list':
        return '전체 라이브 스페이스 목록'
      case 'live-space-force-close':
        return '강제 종료 큐'
      case 'live-space-reported':
        return '신고 접수된 스페이스'
      default:
        return '라이브 스페이스 목록'
    }
  }
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'forceClose' | 'hide' | 'forceTerminate' | null
    liveSpace: LiveSpace | null
  }>({
    isOpen: false,
    type: null,
    liveSpace: null,
  })
  
  const filteredLiveSpaces = useMemo(() => {
    // live-space-list는 API에서 받은 데이터 사용
    let filtered: LiveSpace[]
    if (menuId === 'live-space-list') {
      filtered = [...apiLiveSpaces]
      console.log('[LiveSpaceList] 필터링 전 apiLiveSpaces:', {
        count: apiLiveSpaces.length,
        sample: apiLiveSpaces.slice(0, 2),
      })
    } else {
      filtered = [...liveSpaces]
      
      // menuId에 따른 기본 필터
      if (menuId === 'live-space-force-close') {
        // 강제 종료 큐: 라이브 상태이면서 다음 중 하나:
        // 1. 신고가 3건 이상 (심각한 신고)
        // 2. 체크인이 0 (비정상적인 스페이스)
        // 3. 신고가 있고 체크인이 1 이하 (문제가 있는 스페이스)
        filtered = filtered.filter(ls => 
          ls.status === 'live' && (
            ls.reportedCount >= 3 || 
            ls.checkInCount === 0 ||
            (ls.reportedCount > 0 && ls.checkInCount <= 1)
          )
        )
      } else if (menuId === 'live-space-reported') {
        // 신고 접수된 스페이스: 신고가 있는 모든 스페이스 (라이브든 종료든 상관없이)
        filtered = filtered.filter(ls => ls.reportedCount > 0)
      }
    }
    
    // 추가 필터 적용 (모든 메뉴에 공통)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ls => {
        if (filterStatus === 'live') return ls.status === 'live'
        if (filterStatus === 'ended') return ls.status === 'ended'
        if (filterStatus === 'force-closed') return ls.isForceClosed === true
        return true
      })
    }
    // live-space-list는 API에서 이미 displayStatus로 필터링된 데이터이므로 isHidden 체크 불필요
    
    if (filterRegion !== 'all') {
      filtered = filtered.filter(ls => ls.location.district === filterRegion)
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(ls => ls.category === filterCategory)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(ls => 
        ls.hostNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ls.title && ls.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    console.log('[LiveSpaceList] 필터링 후 결과:', {
      menuId,
      filterStatus,
      filterRegion,
      filterCategory,
      searchQuery,
      beforeFilter: menuId === 'live-space-list' ? apiLiveSpaces.length : liveSpaces.length,
      afterFilter: filtered.length,
      filtered: filtered.slice(0, 3),
    })
    
    return filtered
  }, [apiLiveSpaces, liveSpaces, filterStatus, filterRegion, filterCategory, searchQuery, menuId])

  const handleForceClose = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'forceClose',
      liveSpace,
    })
  }

  const handleForceTerminate = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'forceTerminate',
      liveSpace,
    })
  }

  const handleDetail = (liveSpace: LiveSpace) => {
    setSelectedLiveSpace(liveSpace)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedLiveSpace(null)
  }

  const confirmAction = async () => {
    if (!modalState.liveSpace) return

    const targetId = modalState.liveSpace.id
    const actionType = modalState.type

    // 모달 먼저 닫기
    setModalState({ isOpen: false, type: null, liveSpace: null })

    if (actionType === 'forceClose') {
      updateLiveSpaces((prev) => {
        const updated = prev.map((ls) =>
          ls.id === targetId
            ? { ...ls, status: 'ended' as const, endedAt: new Date().toISOString(), isForceClosed: true }
            : ls
        )
        return updated
      })
      setTimeout(() => {
        alert('라이브 스페이스가 강제 종료되었습니다.')
      }, 100)
    } else if (actionType === 'forceTerminate') {
      // API 호출하여 강제 종료 (삭제)
      const result = await deleteLiveSpaceAdmin(targetId)
      
      if (result.success) {
        // API에서 데이터를 다시 불러옴
        if (menuId === 'live-space-list') {
          // 현재 페이지의 데이터 다시 로드 (중복 체크 스킵)
          await loadLiveSpaces(currentPage, true)
        } else {
          // Mock 데이터 업데이트
          updateLiveSpaces((prev) => prev.filter((ls) => ls.id !== targetId))
        }
        alert('라이브 스페이스가 강제 종료되었습니다.')
      } else {
        alert(`강제 종료 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <span className={`${styles.badge} ${styles.live}`}>Live</span>
      case 'ended':
        return <span className={`${styles.badge} ${styles.ended}`}>종료</span>
      default:
        return <span className={styles.badge}>-</span>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRemainingTime = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - created.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}시간 ${minutes}분 경과`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        {menuId === 'live-space-reported' && (
          <p className={styles.subtitle}>신고가 접수된 라이브 스페이스 목록입니다</p>
        )}
        {menuId === 'live-space-force-close' && (
          <p className={styles.subtitle}>강제 종료가 필요한 라이브 스페이스 목록입니다</p>
        )}
      </div>

      <div className={styles.content}>
        {loadError && (
          <div style={{ background: '#fee', color: '#c33', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px' }}>
            {loadError}
          </div>
        )}
        {isLoading && (
          <div style={{ background: '#e3f2fd', color: '#1976d2', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', textAlign: 'center' }}>
            Live Space 리스트를 불러오는 중...
          </div>
        )}
        {/* 필터 섹션 */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="live">라이브</option>
              <option value="ended">종료</option>
              <option value="force-closed">강제 종료</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>지역</label>
            <select 
              className={styles.filterSelect}
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="강남구">강남구</option>
              <option value="마포구">마포구</option>
              <option value="중구">중구</option>
              <option value="송파구">송파구</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>카테고리</label>
            <select 
              className={styles.filterSelect}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="팝업">팝업</option>
              <option value="전시">전시</option>
              <option value="이벤트">이벤트</option>
              <option value="세일/혜택">세일/혜택</option>
              <option value="맛집">맛집</option>
              <option value="HENCE">HENCE</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>호스트 검색</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="닉네임 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>썸네일</th>
                <th>이름</th>
                <th>호스트</th>
                <th>상태</th>
                <th>체크인 수</th>
                <th>태그</th>
                <th>카테고리</th>
                <th>시작 시간</th>
                <th>종료 시간</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveSpaces.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    {(filterStatus !== 'all' || filterRegion !== 'all' || filterCategory !== 'all' || searchQuery) ? (
                      '리스트가 없습니다.'
                    ) : (
                      menuId === 'live-space-force-close' 
                        ? '강제 종료가 필요한 라이브 스페이스가 없습니다.'
                        : menuId === 'live-space-reported'
                        ? '신고 접수된 라이브 스페이스가 없습니다.'
                        : '조건에 맞는 라이브 스페이스가 없습니다.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredLiveSpaces.map((ls) => (
                  <tr key={ls.id}>
                    <td>
                      <div className={styles.thumbnail}>
                        {ls.thumbnail ? (
                          <img src={ls.thumbnail} alt={ls.title} />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>
                            {ls.hostNickname[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        {ls.title || `${ls.hostNickname}의 라이브스페이스`}
                        {(menuId === 'live-space-reported' || menuId === 'live-space-force-close') && ls.reportedCount > 0 && (
                          <span className={styles.reportedCountBadge}>
                            신고 {ls.reportedCount}건
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.hostCell}>
                        <span className={styles.hostName}>{ls.hostNickname}</span>
                        <span className={styles.activityScore}>활동지수: 85</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(ls.status)}</td>
                    <td>
                      {ls.checkInCount}
                      {menuId === 'live-space-force-close' && ls.checkInCount === 0 && (
                        <span className={styles.warningBadge}>⚠️</span>
                      )}
                    </td>
                    <td>
                      {ls.tags && ls.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {ls.tags.map((tag, index) => (
                            <span
                              key={index}
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                backgroundColor: '#e6f2ff',
                                color: '#4a9eff',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {ls.category ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#f0f0f0',
                            color: '#333',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          {ls.category}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {ls.startedAt || ls.scheduledStartTime ? formatDate(ls.startedAt || ls.scheduledStartTime!) : '-'}
                      {ls.status === 'live' && (ls.startedAt || ls.scheduledStartTime) && (
                        <div className={styles.timeInfo}>
                          {getRemainingTime(ls.startedAt || ls.scheduledStartTime || ls.createdAt)}
                        </div>
                      )}
                    </td>
                    <td>
                      {ls.endedAt ? formatDate(ls.endedAt) : '-'}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDetail(ls)}
                        >
                          상세
                        </button>
                        {menuId === 'live-space-list' ? (
                          // 전체 목록은 API 호출하는 강제종료만 사용
                          <button 
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleForceTerminate(ls)}
                          >
                            강제종료
                          </button>
                        ) : ls.status === 'live' ? (
                          // 다른 메뉴는 Mock 데이터용 강제종료 사용
                          <button 
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleForceClose(ls)}
                          >
                            강제종료
                          </button>
                        ) : null}
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
          {filteredLiveSpaces.length === 0 ? (
            <div className={styles.emptyCard}>
              {(filterStatus !== 'all' || filterRegion !== 'all' || searchQuery) ? (
                '리스트가 없습니다.'
              ) : (
                menuId === 'live-space-force-close' 
                  ? '강제 종료가 필요한 라이브 스페이스가 없습니다.'
                  : menuId === 'live-space-reported'
                  ? '신고 접수된 라이브 스페이스가 없습니다.'
                  : '조건에 맞는 라이브 스페이스가 없습니다.'
              )}
            </div>
          ) : (
            filteredLiveSpaces.map((ls) => (
              <div key={ls.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardThumbnail}>
                    {ls.thumbnail ? (
                      <img src={ls.thumbnail} alt={ls.title} />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        {ls.hostNickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardTitle}>
                      {ls.title || `${ls.hostNickname}의 라이브스페이스`}
                      {(menuId === 'live-space-reported' || menuId === 'live-space-force-close') && ls.reportedCount > 0 && (
                        <span className={styles.reportedCountBadge}>
                          신고 {ls.reportedCount}건
                        </span>
                      )}
                    </div>
                    <div className={styles.cardHost}>
                      {ls.hostNickname}
                      <span className={styles.cardActivityScore}> · 활동지수: 85</span>
                    </div>
                  </div>
                  <div className={styles.cardStatus}>
                    {getStatusBadge(ls.status)}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>체크인 수</span>
                      <span className={styles.cardInfoValue}>
                        {ls.checkInCount}
                        {menuId === 'live-space-force-close' && ls.checkInCount === 0 && (
                          <span className={styles.warningBadge}>⚠️</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>태그</span>
                      <span className={styles.cardInfoValue}>
                        {ls.tags && ls.tags.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {ls.tags.map((tag, index) => (
                              <span
                                key={index}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  backgroundColor: '#e6f2ff',
                                  color: '#4a9eff',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>카테고리</span>
                      <span className={styles.cardInfoValue}>
                        {ls.category ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              backgroundColor: '#f0f0f0',
                              color: '#333',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            {ls.category}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>시작 시간</span>
                      <span className={styles.cardInfoValue}>
                        {ls.startedAt || ls.scheduledStartTime ? formatDate(ls.startedAt || ls.scheduledStartTime!) : '-'}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>
                        {ls.status === 'live' ? '경과 시간' : '종료 시간'}
                      </span>
                      <span className={styles.cardInfoValue}>
                        {ls.status === 'live' && (ls.startedAt || ls.scheduledStartTime) ? (
                          <span className={styles.remainingTime}>
                            {getRemainingTime(ls.startedAt || ls.scheduledStartTime || ls.createdAt)}
                          </span>
                        ) : ls.endedAt ? (
                          formatDate(ls.endedAt)
                        ) : (
                          '-'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => handleDetail(ls)}
                  >
                    상세
                  </button>
                  {menuId === 'live-space-list' ? (
                    // 전체 목록은 API 호출하는 강제종료만 사용
                    <button 
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => handleForceTerminate(ls)}
                    >
                      강제종료
                    </button>
                  ) : ls.status === 'live' ? (
                    // 다른 메뉴는 Mock 데이터용 강제종료 사용
                    <button 
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => handleForceClose(ls)}
                    >
                      강제종료
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Space 상세 정보 Modal */}
      {showDetailModal && selectedLiveSpace && (
        <div 
          className={styles.modalOverlay}
          onClick={handleCloseDetailModal}
        >
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailModalHeader}>
              <h3 className={styles.detailModalTitle}>Live Space 상세 정보</h3>
              <button 
                className={styles.detailModalClose}
                onClick={handleCloseDetailModal}
              >
                ×
              </button>
            </div>
            <div className={styles.detailModalBody}>
              {/* 썸네일 섹션 */}
              {selectedLiveSpace.thumbnail && (
                <div className={styles.detailThumbnailSection}>
                  <div className={styles.detailThumbnail}>
                    <img 
                      src={selectedLiveSpace.thumbnail} 
                      alt={selectedLiveSpace.title}
                    />
                  </div>
                </div>
              )}
              
              {/* 정보 그리드 (2열) */}
              <div className={styles.detailInfoGrid}>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>ID</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.id}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>제목</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.title}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>호스트 ID</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.hostId}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>호스트 닉네임</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.hostNickname || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>카테고리</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.category || '-'}</span>
                </div>
                <div className={`${styles.detailInfoItem} ${styles.detailInfoItemFull}`}>
                  <span className={styles.detailInfoLabel}>주소</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.location?.address || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>위도</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.location?.lat?.toFixed(6) || '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>경도</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.location?.lng?.toFixed(6) || '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>시작 시간</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.startedAt || selectedLiveSpace.scheduledStartTime ? formatDate(selectedLiveSpace.startedAt || selectedLiveSpace.scheduledStartTime!) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>종료 시간</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.endedAt || selectedLiveSpace.scheduledEndTime ? formatDate(selectedLiveSpace.endedAt || selectedLiveSpace.scheduledEndTime!) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>피드 수</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.feedCount || 0}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>참가자 수</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.checkInCount || 0}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>상태</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.status === 'live' ? '라이브' : '종료'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>생성일</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.createdAt ? formatDate(selectedLiveSpace.createdAt) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>지역</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.location?.district || '-'}
                  </span>
                </div>
                {selectedLiveSpace.isForceClosed && (
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>강제 종료</span>
                    <span className={styles.detailInfoValue}>예</span>
                  </div>
                )}
                {selectedLiveSpace.isHidden && (
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>숨김</span>
                    <span className={styles.detailInfoValue}>예</span>
                  </div>
                )}
                {selectedLiveSpace.reportedCount > 0 && (
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>신고 건수</span>
                    <span className={styles.detailInfoValue}>{selectedLiveSpace.reportedCount}건</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.detailModalFooter}>
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

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, type: null, liveSpace: null })}
        title={
          modalState.type === 'forceClose'
            ? '라이브 스페이스 강제 종료'
            : modalState.type === 'forceTerminate'
            ? '라이브 스페이스 강제 종료'
            : '라이브 스페이스 강제 종료'
        }
        message={
          modalState.type === 'forceClose'
            ? `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 강제 종료하시겠습니까?\n\n해당 스페이스는 즉시 종료됩니다.\n사용자에게 '운영정책 위반으로 종료' 안내가 발송됩니다.`
            : `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 강제 종료하시겠습니까?\n\n해당 스페이스는 삭제됩니다.`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type="danger"
      />
    </div>
  )
}

