'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMockData } from '../context/MockDataContext'
import { Feed } from '../data/mockData'
import { getFeedsAdmin, FeedListItem, deleteFeedAdmin, FeedListMeta } from '../lib/api'
import Modal from './Modal'
import styles from './FeedList.module.css'

interface FeedListProps {
  menuId: string
}

export default function FeedList({ menuId }: FeedListProps) {
  const { feeds, updateFeeds } = useMockData()
  const [searchKeyword, setSearchKeyword] = useState('') // 검색어 입력
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined) // 실제 API에 전달되는 검색어
  const [sortField, setSortField] = useState<'popular' | 'createdAt' | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<FeedListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [apiFeeds, setApiFeeds] = useState<Feed[]>([])
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'delete' | null
    feed: Feed | null
  }>({
    isOpen: false,
    type: null,
    feed: null,
  })
  
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

  // 정렬 핸들러
  const handleSort = (field: 'popular' | 'createdAt') => {
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

  // API에서 Feed 리스트 불러오기
  const loadFeeds = useCallback(async (page: number) => {
    // feed-all 또는 feed-reported 메뉴일 때만 API 호출
    if (menuId !== 'feed-all' && menuId !== 'feed-reported') {
      return
    }
    
    // 신고된 피드 여부
    const isReported = menuId === 'feed-reported' ? true : undefined
    
    console.log('[FeedList] loadFeeds 호출:', { page, menuId, appliedKeyword, sortField, sortOrder, isReported })
    
    setIsLoading(true)
    setLoadError(null)
    
    try {
      const response = await getFeedsAdmin(page, 20, appliedKeyword, sortField || undefined, sortOrder, isReported)
      
      console.log('[FeedList] API 응답:', { 
        success: response.success, 
        dataCount: response.data?.length, 
        meta: response.meta,
        error: response.error 
      })
      
      if (response.success && response.data) {
        // API 데이터를 Feed 타입으로 변환
        const convertedFeeds: Feed[] = response.data.map((f: FeedListItem) => ({
          id: f.id,
          liveSpaceId: f.liveSpaceId,
          liveSpaceTitle: f.liveSpaceTitle,
          authorId: f.authorId,
          authorNickname: f.authorNickname,
          authorProfileImage: f.authorProfileImage,
          content: f.content,
          images: f.images || [],
          likeCount: f.likeCount,
          commentCount: f.commentCount,
          createdAt: f.createdAt,
          reportedCount: f.reportedCount || 0,
        }))
        
        console.log('[FeedList] API 데이터 변환 완료:', {
          originalCount: response.data.length,
          convertedCount: convertedFeeds.length,
          timestamp: new Date().toISOString(),
        })
        
        setApiFeeds(convertedFeeds)
        
        if (response.meta) {
          console.log('[FeedList] 페이징 메타 정보 설정:', response.meta)
          setPaginationMeta(response.meta)
        } else {
          console.warn('[FeedList] 페이징 메타 정보가 없습니다. response:', response)
          setPaginationMeta(null)
        }
      } else {
        setLoadError(response.error || 'Feed 리스트를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('[FeedList] Feed 리스트 로드 중 오류:', error)
      setLoadError(error instanceof Error ? error.message : 'Feed 리스트를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [menuId, appliedKeyword, sortField, sortOrder])

  // menuId 변경 시 첫 페이지로 리셋
  useEffect(() => {
    if (menuId === 'feed-all' || menuId === 'feed-reported') {
      setCurrentPage(1)
      setPaginationMeta(null)
      setApiFeeds([])
      setAppliedKeyword(undefined)
      setSearchKeyword('')
      setSortField(null)
      setSortOrder('DESC')
    }
  }, [menuId])

  useEffect(() => {
    if (menuId === 'feed-all' || menuId === 'feed-reported') {
      loadFeeds(currentPage)
    }
  }, [menuId, currentPage, loadFeeds])

  // menuId에 따라 필터링
  const filteredFeeds = useMemo(() => {
    // feed-all, feed-reported는 API에서 받은 데이터 사용
    let filtered: Feed[]
    if (menuId === 'feed-all' || menuId === 'feed-reported') {
      filtered = [...apiFeeds]
    } else {
      filtered = [...feeds]
      
      switch (menuId) {
        default:
          filtered = feeds
      }
    }

    // 검색 필터 적용 (feed-all은 API에서 처리되므로 클라이언트 사이드 필터링 불필요)
    // 다른 메뉴의 경우 클라이언트 사이드 필터링
    if (menuId !== 'feed-all' && appliedKeyword) {
      const query = appliedKeyword.toLowerCase()
      filtered = filtered.filter(feed => 
        feed.content.toLowerCase().includes(query) ||
        feed.authorNickname.toLowerCase().includes(query) ||
        feed.liveSpaceTitle.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [apiFeeds, feeds, menuId, appliedKeyword])

  // 정렬: feed-all, feed-reported는 API에서 정렬되므로 클라이언트 사이드 정렬 불필요
  const sortedFeeds = useMemo(() => {
    if (menuId === 'feed-all' || menuId === 'feed-reported') {
      // API에서 이미 정렬된 데이터 사용
      return filteredFeeds
    }
    
    // 다른 메뉴는 클라이언트 사이드 정렬
    return [...filteredFeeds].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [filteredFeeds, menuId])

  const getMenuTitle = () => {
    switch (menuId) {
      case 'feed-all':
        return '전체 피드'
      case 'feed-reported':
        return '신고된 피드'
      default:
        return '피드 관리'
    }
  }

  const handleDelete = (feed: Feed) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      feed,
    })
  }


  const handleDetail = (feed: Feed) => {
    setSelectedFeed(feed)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedFeed(null)
  }

  const confirmAction = async () => {
    if (!modalState.feed) return

    if (modalState.type === 'delete') {
      // API 호출하여 삭제
      const result = await deleteFeedAdmin(modalState.feed.id)
      
      if (result.success) {
        // API에서 데이터를 다시 불러옴
        if (menuId === 'feed-all' || menuId === 'feed-reported') {
          await loadFeeds(currentPage)
        } else {
          // Mock 데이터 업데이트
          updateFeeds((prev) => prev.filter((f) => f.id !== modalState.feed!.id))
        }
        alert('피드가 삭제되었습니다.')
      } else {
        alert(`삭제 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    }

    setModalState({ isOpen: false, type: null, feed: null })
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

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getMenuTitle()}</h1>
        {menuId === 'feed-reported' && (
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              신고된 피드: {filteredFeeds.length}건
            </span>
          </div>
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
            Feed 리스트를 불러오는 중...
          </div>
        )}
        {/* 검색 필터 */}
        {(menuId === 'feed-all' || menuId === 'feed-reported') && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>검색</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className={styles.filterInput}
                  placeholder="작성자, 내용, Live Space 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#4a9eff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading ? '검색 중...' : '검색'}
                </button>
                {appliedKeyword && (
                  <button
                    type="button"
                    onClick={handleCancelSearch}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#fff',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>내용</th>
                <th>이미지</th>
                <th>작성자</th>
                <th>소속 Live Space</th>
                {(menuId === 'feed-all' || menuId === 'feed-reported') ? (
                  <>
                    <th>
                      <button 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('createdAt')}
                      >
                        작성일
                        {sortField === 'createdAt' && (
                          <span className={styles.sortIcon}>
                            {sortOrder === 'ASC' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th>
                      <button 
                        className={styles.sortableHeader}
                        onClick={() => handleSort('popular')}
                      >
                        인기도
                        {sortField === 'popular' && (
                          <span className={styles.sortIcon}>
                            {sortOrder === 'ASC' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  </>
                ) : (
                  <>
                    <th>작성일</th>
                    <th>신고건수</th>
                  </>
                )}
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeeds.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedFeeds.map((feed) => (
                  <tr key={feed.id}>
                    <td>
                      <div className={styles.contentCell}>
                        {truncateContent(feed.content)}
                      </div>
                    </td>
                    <td>
                      {feed.images.length > 0 ? (
                        <span className={styles.hasImage}>✓</span>
                      ) : (
                        <span className={styles.noImage}>-</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.authorCell}>
                        {feed.authorProfileImage ? (
                          <img 
                            src={feed.authorProfileImage} 
                            alt={feed.authorNickname}
                            className={styles.authorImage}
                          />
                        ) : (
                          <div className={styles.authorPlaceholder}>
                            {feed.authorNickname[0]}
                          </div>
                        )}
                        <span>{feed.authorNickname}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.liveSpaceCell}>
                        {feed.liveSpaceTitle}
                      </div>
                    </td>
                    {(menuId === 'feed-all' || menuId === 'feed-reported') ? (
                      <>
                        <td>{formatDate(feed.createdAt)}</td>
                        <td>
                          <span>{feed.likeCount} 좋아요</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{formatDate(feed.createdAt)}</td>
                        <td>
                          {feed.reportedCount > 0 ? (
                            <span className={styles.reportedCountBadge}>
                              신고 {feed.reportedCount}건
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                      </>
                    )}
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDetail(feed)}
                        >
                          상세
                        </button>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDelete(feed)}
                          style={{
                            borderColor: '#e74c3c',
                            color: '#e74c3c',
                          }}
                        >
                          삭제
                        </button>
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
          {sortedFeeds.length === 0 ? (
            <div className={styles.emptyCard}>
              데이터가 없습니다.
            </div>
          ) : (
            sortedFeeds.map((feed) => (
              <div key={feed.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardAuthor}>
                    {feed.authorProfileImage ? (
                      <img 
                        src={feed.authorProfileImage} 
                        alt={feed.authorNickname}
                      />
                    ) : (
                      <div className={styles.authorPlaceholder}>
                        {feed.authorNickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardAuthorName}>{feed.authorNickname}</div>
                    <div className={styles.cardLiveSpace}>{feed.liveSpaceTitle}</div>
                  </div>
                  {feed.reportedCount > 0 && (
                    <div className={styles.cardReportBadge}>
                      <span className={styles.reportedCountBadge}>
                        신고 {feed.reportedCount}건
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardContent}>
                    {feed.content}
                    {feed.images.length > 0 && (
                      <span className={styles.hasImage}> [이미지 {feed.images.length}개]</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>{formatDate(feed.createdAt)}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={styles.actionBtn}
                      onClick={() => handleDetail(feed)}
                    >
                      상세
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={() => handleDelete(feed)}
                      style={{
                        borderColor: '#e74c3c',
                        color: '#e74c3c',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이징 버튼 */}
        {(menuId === 'feed-all' || menuId === 'feed-reported') && paginationMeta && paginationMeta.totalPages > 1 && (
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

      {/* Feed 상세 정보 Modal */}
      {showDetailModal && selectedFeed && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={handleCloseDetailModal}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
                Feed 상세 정보
              </h3>
              <button
                onClick={handleCloseDetailModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* 작성자 정보 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                {selectedFeed.authorProfileImage ? (
                  <img 
                    src={selectedFeed.authorProfileImage} 
                    alt={selectedFeed.authorNickname}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#4a9eff',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                  }}>
                    {selectedFeed.authorNickname[0]}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                    {selectedFeed.authorNickname}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {selectedFeed.liveSpaceTitle}
                  </div>
                </div>
              </div>

              {/* 피드 내용 */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '8px' }}>
                  내용
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: '#333', 
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {selectedFeed.content}
                </div>
              </div>

              {/* 이미지 */}
              {selectedFeed.images && selectedFeed.images.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '12px' }}>
                    이미지 ({selectedFeed.images.length}개)
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                  }}>
                    {selectedFeed.images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`피드 이미지 ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 정보 그리드 */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '16px',
                marginBottom: '24px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    ID
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {selectedFeed.id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    작성자 ID
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {selectedFeed.authorId}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    Live Space ID
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {selectedFeed.liveSpaceId}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    좋아요 수
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {selectedFeed.likeCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    댓글 수
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {selectedFeed.commentCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    신고 건수
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {selectedFeed.reportedCount || 0}건
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                    작성일
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {formatDate(selectedFeed.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCloseDetailModal}
                style={{
                  padding: '10px 24px',
                  background: '#4a9eff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#357abd'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#4a9eff'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, type: null, feed: null })}
        title="피드 삭제"
        message="이 피드를 삭제하시겠습니까?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type="danger"
      />
    </div>
  )
}

