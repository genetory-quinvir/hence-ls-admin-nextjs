'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import { useAuth } from '../context/AuthContext'
import { Report } from '../data/mockData'
import styles from './ReportList.module.css'

interface ReportListProps {
  menuId: string
}

export default function ReportList({ menuId }: ReportListProps) {
  const { reports, updateReports, feeds, comments, liveSpaces, users } = useMockData()
  const { user } = useAuth()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'process' | 'reject' | 'detail' | null
    report: Report | null
  }>({
    isOpen: false,
    type: null,
    report: null,
  })
  const [processResult, setProcessResult] = useState('')

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'live-space': '라이브 스페이스',
      'feed': '피드',
      'comment': '댓글',
      'user': '사용자'
    }
    return labels[type] || type
  }

  // 대상 정보 가져오기
  const getTargetInfo = (report: Report) => {
    switch (report.type) {
      case 'feed':
        const feed = feeds.find(f => f.id === report.targetId)
        if (feed) {
          return {
            title: feed.content.length > 50 ? feed.content.substring(0, 50) + '...' : feed.content,
            fullContent: feed.content,
            author: feed.authorNickname,
            type: '피드'
          }
        }
        break
      case 'comment':
        const comment = comments.find(c => c.id === report.targetId)
        if (comment) {
          return {
            title: comment.content.length > 50 ? comment.content.substring(0, 50) + '...' : comment.content,
            fullContent: comment.content,
            author: comment.authorNickname,
            type: '댓글'
          }
        }
        break
      case 'live-space':
        const liveSpace = liveSpaces.find(ls => ls.id === report.targetId)
        if (liveSpace) {
          return {
            title: liveSpace.title,
            fullContent: liveSpace.title,
            author: liveSpace.hostNickname,
            type: '라이브 스페이스'
          }
        }
        break
      case 'user':
        const targetUser = users.find(u => u.id === report.targetId)
        if (targetUser) {
          return {
            title: targetUser.nickname,
            fullContent: targetUser.nickname,
            author: targetUser.nickname,
            type: '사용자'
          }
        }
        break
    }
    return {
      title: report.targetTitle || report.targetId,
      fullContent: report.targetTitle || report.targetId,
      author: '-',
      type: getTypeLabel(report.type)
    }
  }
  
  // menuId에 따라 필터링
  const filteredReports = useMemo(() => {
    switch (menuId) {
      case 'reports-all':
        return reports
      case 'reports-pending':
        return reports.filter(r => r.status === 'pending')
      case 'reports-completed':
        return reports.filter(r => r.status === 'completed' || r.status === 'rejected')
      default:
        return reports
    }
  }, [reports, menuId])
  
  // 정렬: 미처리 우선, 그 다음 최신순
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [filteredReports])

  const handleProcess = (report: Report) => {
    setProcessResult('')
    setModalState({
      isOpen: true,
      type: 'process',
      report,
    })
  }

  const handleReject = (report: Report) => {
    setProcessResult('')
    setModalState({
      isOpen: true,
      type: 'reject',
      report,
    })
  }

  const handleDetail = (report: Report) => {
    setModalState({
      isOpen: true,
      type: 'detail',
      report,
    })
  }

  const confirmProcess = () => {
    if (!modalState.report) return

    const now = new Date().toISOString()
    const processorId = user?.email || 'admin-001'

    updateReports((prev) =>
      prev.map((r) =>
        r.id === modalState.report!.id
          ? {
              ...r,
              status: 'completed' as const,
              processedAt: now,
              processorId,
              result: processResult || '처리 완료',
            }
          : r
      )
    )
    alert('신고가 처리되었습니다.')
    setModalState({ isOpen: false, type: null, report: null })
    setProcessResult('')
  }

  const confirmReject = () => {
    if (!modalState.report) return

    const now = new Date().toISOString()
    const processorId = user?.email || 'admin-001'

    updateReports((prev) =>
      prev.map((r) =>
        r.id === modalState.report!.id
          ? {
              ...r,
              status: 'rejected' as const,
              processedAt: now,
              processorId,
              result: processResult || '신고 거부',
            }
          : r
      )
    )
    alert('신고가 거부되었습니다.')
    setModalState({ isOpen: false, type: null, report: null })
    setProcessResult('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className={`${styles.badge} ${styles.pending}`}>미처리</span>
      case 'processing':
        return <span className={`${styles.badge} ${styles.processing}`}>처리중</span>
      case 'completed':
        return <span className={`${styles.badge} ${styles.completed}`}>처리완료</span>
      case 'rejected':
        return <span className={`${styles.badge} ${styles.rejected}`}>거부</span>
      default:
        return <span className={styles.badge}>-</span>
    }
  }

  const getMenuTitle = () => {
    switch (menuId) {
      case 'reports-all':
        return '전체 신고 내역'
      case 'reports-pending':
        return '처리 대기(미처리)'
      case 'reports-completed':
        return '처리 완료'
      default:
        return '신고/모더레이션'
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

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}일 전`
    if (hours > 0) return `${hours}시간 전`
    if (minutes > 0) return `${minutes}분 전`
    return '방금 전'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getMenuTitle()}</h1>
        {menuId === 'reports-pending' && (
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              미처리: {reports.filter(r => r.status === 'pending').length}건
            </span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>신고 유형</th>
                <th>대상</th>
                <th>신고 사유</th>
                <th>신고자</th>
                <th>신고 시간</th>
                <th>상태</th>
                {menuId === 'reports-completed' && <th>처리 결과</th>}
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedReports.length === 0 ? (
                <tr>
                  <td colSpan={menuId === 'reports-completed' ? 8 : 7} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <span className={styles.typeLabel}>
                        {getTypeLabel(report.type)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.targetCell}>
                        <div className={styles.targetContent}>
                          {(() => {
                            const targetInfo = getTargetInfo(report)
                            return (
                              <>
                                <div className={styles.targetType}>{targetInfo.type}</div>
                                <div className={styles.targetText}>{targetInfo.title}</div>
                                {targetInfo.author !== '-' && (
                                  <div className={styles.targetAuthor}>작성자: {targetInfo.author}</div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.reason}>{report.reason}</span>
                    </td>
                    <td>{report.reporterNickname}</td>
                    <td>
                      <div className={styles.timeCell}>
                        <div>{formatDate(report.createdAt)}</div>
                        <div className={styles.relativeTime}>
                          {getRelativeTime(report.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(report.status)}</td>
                    {menuId === 'reports-completed' && (
                      <td>
                        <div className={styles.resultCell}>
                          {report.result || '-'}
                          {report.processedAt && (
                            <div className={styles.processedTime}>
                              {formatDate(report.processedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDetail(report)}
                        >
                          상세
                        </button>
                        {report.status === 'pending' && (
                          <>
                            <button 
                              className={`${styles.actionBtn} ${styles.primary}`}
                              onClick={() => handleProcess(report)}
                            >
                              처리
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.reject}`}
                              onClick={() => handleReject(report)}
                            >
                              거부
                            </button>
                          </>
                        )}
                        {report.status === 'processing' && (
                          <button 
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={() => handleProcess(report)}
                          >
                            완료
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
      </div>

      {/* 처리 모달 */}
      {modalState.type === 'process' && (
        <div className={styles.modalOverlay} onClick={() => setModalState({ isOpen: false, type: null, report: null })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>신고 처리</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setModalState({ isOpen: false, type: null, report: null })}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {modalState.report && (() => {
                const targetInfo = getTargetInfo(modalState.report)
                return (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>신고 유형</label>
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        {getTypeLabel(modalState.report.type)}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>대상 정보</label>
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                          {targetInfo.type} (ID: {modalState.report.targetId})
                        </div>
                        <div style={{ marginBottom: '8px', fontWeight: '500' }}>
                          {targetInfo.fullContent}
                        </div>
                        {targetInfo.author !== '-' && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            작성자: {targetInfo.author}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>신고 사유</label>
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        {modalState.report.reason}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>처리 결과 *</label>
                      <textarea
                        className={styles.textarea}
                        value={processResult}
                        onChange={(e) => setProcessResult(e.target.value)}
                        placeholder="처리 결과를 입력하세요 (예: 콘텐츠 삭제, 사용자 경고 등)"
                        rows={4}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setModalState({ isOpen: false, type: null, report: null })}
              >
                취소
              </button>
              <button 
                className={styles.saveButton}
                onClick={confirmProcess}
              >
                처리 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거부 모달 */}
      {modalState.type === 'reject' && (
        <div className={styles.modalOverlay} onClick={() => setModalState({ isOpen: false, type: null, report: null })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>신고 거부</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setModalState({ isOpen: false, type: null, report: null })}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {modalState.report && (() => {
                const targetInfo = getTargetInfo(modalState.report)
                return (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>신고 유형</label>
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        {getTypeLabel(modalState.report.type)}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>대상 정보</label>
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                          {targetInfo.type} (ID: {modalState.report.targetId})
                        </div>
                        <div style={{ marginBottom: '8px', fontWeight: '500' }}>
                          {targetInfo.fullContent}
                        </div>
                        {targetInfo.author !== '-' && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            작성자: {targetInfo.author}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>신고 사유</label>
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        {modalState.report.reason}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>거부 사유 *</label>
                      <textarea
                        className={styles.textarea}
                        value={processResult}
                        onChange={(e) => setProcessResult(e.target.value)}
                        placeholder="거부 사유를 입력하세요"
                        rows={4}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setModalState({ isOpen: false, type: null, report: null })}
              >
                취소
              </button>
              <button 
                className={styles.rejectButton}
                onClick={confirmReject}
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세보기 모달 */}
      {modalState.type === 'detail' && modalState.report && (
        <div className={styles.modalOverlay} onClick={() => setModalState({ isOpen: false, type: null, report: null })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <h2>신고 상세 정보</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setModalState({ isOpen: false, type: null, report: null })}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>신고 ID</label>
                  <div className={styles.detailValue}>{modalState.report.id}</div>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>신고 유형</label>
                  <div className={styles.detailValue}>{getTypeLabel(modalState.report.type)}</div>
                </div>
                <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.detailLabel}>대상 정보</label>
                  <div className={styles.detailValue}>
                    {(() => {
                      const targetInfo = getTargetInfo(modalState.report)
                      return (
                        <>
                          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                            {targetInfo.type} (ID: {modalState.report.targetId})
                          </div>
                          <div style={{ marginBottom: '8px', fontWeight: '500' }}>
                            {targetInfo.fullContent}
                          </div>
                          {targetInfo.author !== '-' && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              작성자: {targetInfo.author}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>신고자</label>
                  <div className={styles.detailValue}>{modalState.report.reporterNickname} ({modalState.report.reporterId})</div>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>신고 사유</label>
                  <div className={styles.detailValue}>{modalState.report.reason}</div>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>상태</label>
                  <div className={styles.detailValue}>{getStatusBadge(modalState.report.status)}</div>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>신고 시간</label>
                  <div className={styles.detailValue}>{formatDate(modalState.report.createdAt)}</div>
                </div>
                {modalState.report.processedAt && (
                  <>
                    <div className={styles.detailItem}>
                      <label className={styles.detailLabel}>처리 시간</label>
                      <div className={styles.detailValue}>{formatDate(modalState.report.processedAt)}</div>
                    </div>
                    <div className={styles.detailItem}>
                      <label className={styles.detailLabel}>처리자</label>
                      <div className={styles.detailValue}>{modalState.report.processorId || '-'}</div>
                    </div>
                    <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.detailLabel}>처리 결과</label>
                      <div className={styles.detailValue}>{modalState.report.result || '-'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setModalState({ isOpen: false, type: null, report: null })}
              >
                닫기
              </button>
              {modalState.report.status === 'pending' && (
                <>
                  <button 
                    className={styles.saveButton}
                    onClick={() => {
                      setModalState({ isOpen: false, type: null, report: null })
                      handleProcess(modalState.report!)
                    }}
                  >
                    처리
                  </button>
                  <button 
                    className={styles.rejectButton}
                    onClick={() => {
                      setModalState({ isOpen: false, type: null, report: null })
                      handleReject(modalState.report!)
                    }}
                  >
                    거부
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

