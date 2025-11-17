'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import { Report } from '../data/mockData'
import Modal from './Modal'
import styles from './ReportList.module.css'

export default function ReportList() {
  const { reports, updateReports } = useMockData()
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    report: Report | null
  }>({
    isOpen: false,
    report: null,
  })
  
  const filteredReports = useMemo(() => {
    if (filterStatus === 'all') return reports
    return reports.filter(r => r.status === filterStatus)
  }, [reports, filterStatus])

  const handleProcess = (report: Report) => {
    setModalState({
      isOpen: true,
      report,
    })
  }

  const confirmProcess = () => {
    if (!modalState.report) return

    updateReports((prev) =>
      prev.map((r) =>
        r.id === modalState.report!.id
          ? {
              ...r,
              status: 'completed' as const,
              processedAt: new Date().toISOString(),
              processorId: 'admin-001',
              result: '처리 완료',
            }
          : r
      )
    )
    alert('신고가 처리되었습니다.')
    setModalState({ isOpen: false, report: null })
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'live-space': '라이브 스페이스',
      'feed': '피드',
      'comment': '댓글',
      'user': '사용자'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className={`${styles.badge} ${styles.pending}`}>미처리</span>
      case 'processing':
        return <span className={`${styles.badge} ${styles.processing}`}>처리중</span>
      case 'completed':
        return <span className={`${styles.badge} ${styles.completed}`}>처리완료</span>
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
        <h1 className={styles.title}>신고/모더레이션</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="pending">미처리</option>
              <option value="processing">처리중</option>
              <option value="completed">처리완료</option>
            </select>
          </div>
        </div>

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
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <span className={styles.typeLabel}>
                        {getTypeLabel(report.type)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.targetCell}>
                        {report.targetTitle || report.targetId}
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
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn}>상세</button>
                        {report.status === 'pending' && (
                          <button 
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={() => handleProcess(report)}
                          >
                            처리
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

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, report: null })}
        title="신고 처리"
        message={`이 신고를 처리 완료로 표시하시겠습니까?`}
        confirmText="처리 완료"
        cancelText="취소"
        onConfirm={confirmProcess}
        type="info"
      />
    </div>
  )
}

