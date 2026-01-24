'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMockData } from '../context/MockDataContext'
import { Comment } from '../data/mockData'
import { getFeedCommentsAdmin, FeedCommentListItem, deleteFeedCommentAdmin, FeedCommentListMeta } from '../lib/api'
import Modal from './Modal'
import styles from './CommentList.module.css'

interface CommentListProps {
  menuId: string
}

export default function CommentList({ menuId }: CommentListProps) {
  const { comments, updateComments } = useMockData()
  const [searchKeyword, setSearchKeyword] = useState('') // 검색어 입력
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined) // 실제 API에 전달되는 검색어
  const [sortField, setSortField] = useState<'popular' | 'createdAt' | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<FeedCommentListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [apiComments, setApiComments] = useState<Comment[]>([])
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'delete' | null
    comment: Comment | null
  }>({
    isOpen: false,
    type: null,
    comment: null,
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

  // API에서 Comment 리스트 불러오기
  const loadComments = useCallback(async (page: number) => {
    // comment-all 또는 comment-reported 메뉴일 때만 API 호출
    if (menuId !== 'comment-all' && menuId !== 'comment-reported') {
      return
    }
    
    // 신고된 댓글 여부
    const isReported = menuId === 'comment-reported' ? true : undefined
    
    console.log('[CommentList] loadComments 호출:', { page, menuId, appliedKeyword, sortField, sortOrder, isReported })
    
    setIsLoading(true)
    setLoadError(null)
    
    try {
      const response = await getFeedCommentsAdmin(page, 20, appliedKeyword, sortField || undefined, sortOrder, isReported)
      
      console.log('[CommentList] API 응답:', { 
        success: response.success, 
        dataCount: response.data?.length, 
        meta: response.meta,
        error: response.error 
      })
      
      if (response.success && response.data) {
        // API 데이터를 Comment 타입으로 변환
        const convertedComments: Comment[] = response.data.map((c: FeedCommentListItem) => ({
          id: c.id,
          feedId: c.feedId,
          authorId: c.authorId,
          authorNickname: c.authorNickname,
          authorProfileImage: c.authorProfileImage,
          content: c.content,
          image: c.image,
          createdAt: c.createdAt,
          reportedCount: c.reportedCount || 0,
        }))
        
        console.log('[CommentList] API 데이터 변환 완료:', {
          originalCount: response.data.length,
          convertedCount: convertedComments.length,
          timestamp: new Date().toISOString(),
        })
        
        setApiComments(convertedComments)
        
        if (response.meta) {
          console.log('[CommentList] 페이징 메타 정보 설정:', response.meta)
          setPaginationMeta(response.meta)
        } else {
          console.warn('[CommentList] 페이징 메타 정보가 없습니다. response:', response)
          setPaginationMeta(null)
        }
      } else {
        setLoadError(response.error || 'Comment 리스트를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('[CommentList] Comment 리스트 로드 중 오류:', error)
      setLoadError(error instanceof Error ? error.message : 'Comment 리스트를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [menuId, appliedKeyword, sortField, sortOrder])

  // menuId 변경 시 첫 페이지로 리셋
  useEffect(() => {
    if (menuId === 'comment-all' || menuId === 'comment-reported') {
      setCurrentPage(1)
      setPaginationMeta(null)
      setApiComments([])
      setAppliedKeyword(undefined)
      setSearchKeyword('')
      setSortField(null)
      setSortOrder('DESC')
    }
  }, [menuId])

  useEffect(() => {
    if (menuId === 'comment-all' || menuId === 'comment-reported') {
      loadComments(currentPage)
    }
  }, [menuId, currentPage, loadComments])

  // menuId에 따라 필터링
  const filteredComments = useMemo(() => {
    // comment-all, comment-reported는 API에서 받은 데이터 사용
    let filtered: Comment[]
    if (menuId === 'comment-all' || menuId === 'comment-reported') {
      filtered = [...apiComments]
    } else {
      filtered = [...comments]
    }
    
    // 검색 필터 적용 (comment-all, comment-reported는 API에서 처리되므로 클라이언트 사이드 필터링 불필요)
    // 다른 메뉴는 클라이언트 사이드 필터링
    if (menuId !== 'comment-all' && menuId !== 'comment-reported' && appliedKeyword) {
      const query = appliedKeyword.toLowerCase()
      filtered = filtered.filter(comment => 
        comment.content.toLowerCase().includes(query) ||
        comment.authorNickname.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [apiComments, comments, menuId, appliedKeyword])

  // 정렬: comment-all, comment-reported는 API에서 정렬되므로 클라이언트 사이드 정렬 불필요
  const sortedComments = useMemo(() => {
    if (menuId === 'comment-all' || menuId === 'comment-reported') {
      // API에서 이미 정렬된 데이터 사용
      return filteredComments
    }
    
    // 다른 메뉴는 클라이언트 사이드 정렬
    return [...filteredComments].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [filteredComments, menuId])

  const getMenuTitle = () => {
    switch (menuId) {
      case 'comment-all':
        return '전체 댓글'
      case 'comment-reported':
        return '신고된 댓글'
      default:
        return '댓글 관리'
    }
  }

  const handleDelete = (comment: Comment) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      comment,
    })
  }

  const handleDetail = (comment: Comment) => {
    setSelectedComment(comment)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedComment(null)
  }

  const confirmAction = async () => {
    if (!modalState.comment) return

    if (modalState.type === 'delete') {
      // API 호출하여 삭제
      const result = await deleteFeedCommentAdmin(modalState.comment.id)
      
      if (result.success) {
        // API에서 데이터를 다시 불러옴
        if (menuId === 'comment-all' || menuId === 'comment-reported') {
          await loadComments(currentPage)
        } else {
          // Mock 데이터 업데이트
          updateComments((prev) => prev.filter((c) => c.id !== modalState.comment!.id))
        }
        alert('댓글이 삭제되었습니다.')
      } else {
        alert(`삭제 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    }

    setModalState({ isOpen: false, type: null, comment: null })
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
        {menuId === 'comment-reported' && (
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              신고된 댓글: {filteredComments.length}건
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
            Comment 리스트를 불러오는 중...
          </div>
        )}
        {/* 검색 필터 */}
        {(menuId === 'comment-all' || menuId === 'comment-reported') && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>검색</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className={styles.filterInput}
                  placeholder="작성자, 댓글 내용 검색..."
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
                <th>댓글 내용</th>
                <th>작성자</th>
                <th>피드 ID</th>
                {(menuId === 'comment-all' || menuId === 'comment-reported') ? (
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
                    <th>신고 수</th>
                    <th>작성일</th>
                  </>
                )}
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedComments.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedComments.map((comment) => (
                  <tr key={comment.id}>
                    <td>
                      <div className={styles.contentCell}>
                        {truncateContent(comment.content)}
                        {comment.image && (
                          <span className={styles.hasImage}> [이미지]</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.authorCell}>
                        {comment.authorProfileImage ? (
                          <img 
                            src={comment.authorProfileImage} 
                            alt={comment.authorNickname}
                            className={styles.authorImage}
                          />
                        ) : (
                          <div className={styles.authorPlaceholder}>
                            {comment.authorNickname[0]}
                          </div>
                        )}
                        <span>{comment.authorNickname}</span>
                      </div>
                    </td>
                    <td>
                      <code className={styles.feedId}>{comment.feedId}</code>
                    </td>
                    {(menuId === 'comment-all' || menuId === 'comment-reported') ? (
                      <>
                        <td>{formatDate(comment.createdAt)}</td>
                        <td>
                          <span>{comment.likeCount || 0} 좋아요</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {comment.reportedCount > 0 ? (
                            <span className={styles.reportedCountBadge}>
                              신고 {comment.reportedCount}건
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td>{formatDate(comment.createdAt)}</td>
                      </>
                    )}
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDetail(comment)}
                        >
                          상세
                        </button>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDelete(comment)}
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
          {sortedComments.length === 0 ? (
            <div className={styles.emptyCard}>
              데이터가 없습니다.
            </div>
          ) : (
            sortedComments.map((comment) => (
              <div key={comment.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardAuthor}>
                    {comment.authorProfileImage ? (
                      <img 
                        src={comment.authorProfileImage} 
                        alt={comment.authorNickname}
                      />
                    ) : (
                      <div className={styles.authorPlaceholder}>
                        {comment.authorNickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardAuthorName}>{comment.authorNickname}</div>
                    <div className={styles.cardFeedMeta}>
                      피드 ID: {comment.feedId}
                    </div>
                  </div>
                  {comment.reportedCount > 0 && menuId !== 'comment-all' && (
                    <div className={styles.cardReportBadge}>
                      <span className={styles.reportedCountBadge}>
                        신고 {comment.reportedCount}건
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardContent}>
                    {comment.content}
                    {comment.image && (
                      <span className={styles.hasImage}> [이미지]</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={styles.actionBtn}
                      onClick={() => handleDetail(comment)}
                    >
                      상세
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={() => handleDelete(comment)}
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
        {(menuId === 'comment-all' || menuId === 'comment-reported') && paginationMeta && paginationMeta.totalPages > 1 && (
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

      {/* Comment 상세 정보 Modal */}
      {showDetailModal && selectedComment && (
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
                Comment 상세 정보
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
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                  작성자
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  {selectedComment.authorNickname}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                  피드 ID
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  <code>{selectedComment.feedId}</code>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                  댓글 내용
                </div>
                <div style={{ fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap' }}>
                  {selectedComment.content}
                </div>
              </div>
              {selectedComment.image && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                    이미지
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    <img src={selectedComment.image} alt="댓글 이미지" style={{ maxWidth: '100%', borderRadius: '4px' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                  신고 건수
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  {selectedComment.reportedCount || 0}건
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 500, marginBottom: '8px' }}>
                  작성일
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  {formatDate(selectedComment.createdAt)}
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
        onClose={() => setModalState({ isOpen: false, type: null, comment: null })}
        title="댓글 삭제"
        message="이 댓글을 삭제하시겠습니까?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type="danger"
      />
    </div>
  )
}
