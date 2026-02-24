'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminPlaceReportItem,
  AdminPlaceReportStatusFilter,
  getAdminPlaceReports,
  processAdminPlaceReport,
  updateAdminPlaceReport,
} from '../lib/api'
import styles from './TagManagement.module.css'

export default function PlaceReportManagement() {
  const [reports, setReports] = useState<AdminPlaceReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminPlaceReportStatusFilter>('ALL')
  const [selectedReport, setSelectedReport] = useState<AdminPlaceReportItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadReports = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getAdminPlaceReports(statusFilter === 'ALL' ? undefined : statusFilter)
    if (!result.success) {
      setReports([])
      setError(result.error || '장소 신고 목록을 불러오지 못했습니다.')
      setIsLoading(false)
      return
    }

    setReports(result.data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadReports()
  }, [statusFilter])

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return reports

    return reports.filter((report) => {
      const target = [
        report.id,
        report.placeId,
        report.placeName,
        report.reason,
        report.details,
        report.status,
        report.reporterEmail,
        report.reporterNickname,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return target.includes(q)
    })
  }, [reports, searchQuery])

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString('ko-KR')
  }

  const getStatusLabel = (status?: string | null) => {
    const normalized = String(status || '').toUpperCase()
    switch (normalized) {
      case 'PENDING':
        return '대기'
      case 'RESOLVED':
      case 'PROCESSED':
        return '해결'
      case 'REJECTED':
        return '반려'
      default:
        return status || '-'
    }
  }

  const applyLocalReportStatus = (reportId: string, nextStatus: string) => {
    const isPending = nextStatus.toUpperCase() === 'PENDING'
    const processedAt = isPending ? null : new Date().toISOString()
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status: nextStatus,
              processedAt: isPending ? null : report.processedAt || processedAt,
            }
          : report
      )
    )
    setSelectedReport((prev) =>
      prev && prev.id === reportId
        ? {
            ...prev,
            status: nextStatus,
            processedAt: isPending ? null : prev.processedAt || processedAt,
          }
        : prev
    )
  }

  const handleStatusAction = async (report: AdminPlaceReportItem, nextStatus: AdminPlaceReportStatusFilter) => {
    if (!report.id || isSubmitting) return
    setIsSubmitting(true)
    const result =
      nextStatus === 'RESOLVED'
        ? await processAdminPlaceReport(report.id)
        : await updateAdminPlaceReport(report.id, { status: nextStatus })
    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || '장소 신고 상태 변경에 실패했습니다.')
      return
    }

    applyLocalReportStatus(report.id, nextStatus)
    alert(`신고 상태가 ${getStatusLabel(nextStatus)}로 변경되었습니다.`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>장소 신고 관리</h1>
        <button onClick={() => void loadReports()} className={styles.addButton} disabled={isLoading}>
          {isLoading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 220px' }}>
            <input
              type="text"
              placeholder="장소명/신고사유/신고자/상태 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <select
              className={styles.searchInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AdminPlaceReportStatusFilter)}
            >
              <option value="ALL">전체 상태</option>
              <option value="PENDING">대기</option>
              <option value="RESOLVED">해결</option>
              <option value="REJECTED">반려</option>
            </select>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {isLoading && <div className={styles.loading}>로딩 중...</div>}

        {!isLoading && !error && (
          <>
            {filteredReports.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? '검색 결과가 없습니다.' : '장소 신고 내역이 없습니다.'}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>신고 ID</th>
                      <th>장소명</th>
                      <th>신고 사유</th>
                      <th>상태</th>
                      <th>신고자</th>
                      <th>신고일시</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id || `${report.placeId}-${report.createdAt}`}>
                        <td>{report.id || '-'}</td>
                        <td className={styles.tagNameCell}>{report.placeName || report.placeId || '-'}</td>
                        <td>{report.reason || '-'}</td>
                        <td>{getStatusLabel(report.status)}</td>
                        <td>{report.reporterNickname || report.reporterEmail || report.reporterId || '-'}</td>
                        <td>{formatDate(report.createdAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              onClick={() => setSelectedReport(report)}
                              className={styles.actionButton}
                              disabled={isSubmitting}
                            >
                              상세
                            </button>
                            <button
                              onClick={() => void handleStatusAction(report, 'PENDING')}
                              className={styles.actionButton}
                              disabled={isSubmitting || String(report.status || '').toUpperCase() === 'PENDING'}
                            >
                              대기
                            </button>
                            <button
                              onClick={() => void handleStatusAction(report, 'RESOLVED')}
                              className={styles.actionButton}
                              disabled={isSubmitting || ['RESOLVED', 'PROCESSED'].includes(String(report.status || '').toUpperCase())}
                            >
                              해결
                            </button>
                            <button
                              onClick={() => void handleStatusAction(report, 'REJECTED')}
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              disabled={isSubmitting || String(report.status || '').toUpperCase() === 'REJECTED'}
                            >
                              반려
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {selectedReport && (
        <div className={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>장소 신고 상세</h2>
              <button className={styles.modalCloseButton} onClick={() => setSelectedReport(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>신고 ID</span>
                  <span className={styles.detailValue}>{selectedReport.id || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>장소 ID</span>
                  <span className={styles.detailValue}>{selectedReport.placeId || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>장소명</span>
                  <span className={styles.detailValue}>{selectedReport.placeName || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>상태</span>
                  <span className={styles.detailValue}>{getStatusLabel(selectedReport.status)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>신고자</span>
                  <span className={styles.detailValue}>
                    {selectedReport.reporterNickname || selectedReport.reporterEmail || selectedReport.reporterId || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>신고일시</span>
                  <span className={styles.detailValue}>{formatDate(selectedReport.createdAt)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>처리일시</span>
                  <span className={styles.detailValue}>{formatDate(selectedReport.processedAt)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>신고 사유</span>
                  <span className={styles.detailValue}>{selectedReport.reason || '-'}</span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>상세 내용</span>
                <div className={styles.detailValueBlock}>{selectedReport.details || '-'}</div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              {selectedReport.id && (
                <>
                  <button
                    onClick={() => void handleStatusAction(selectedReport, 'PENDING')}
                    className={styles.actionButton}
                    disabled={isSubmitting || String(selectedReport.status || '').toUpperCase() === 'PENDING'}
                  >
                    {isSubmitting ? '처리 중...' : '대기'}
                  </button>
                  <button
                    onClick={() => void handleStatusAction(selectedReport, 'REJECTED')}
                    className={styles.deleteConfirmButton}
                    disabled={isSubmitting || String(selectedReport.status || '').toUpperCase() === 'REJECTED'}
                  >
                    {isSubmitting ? '처리 중...' : '반려'}
                  </button>
                  <button
                    onClick={() => void handleStatusAction(selectedReport, 'RESOLVED')}
                    className={styles.saveButton}
                    disabled={isSubmitting || ['RESOLVED', 'PROCESSED'].includes(String(selectedReport.status || '').toUpperCase())}
                  >
                    {isSubmitting ? '처리 중...' : '해결'}
                  </button>
                </>
              )}
              <button onClick={() => setSelectedReport(null)} className={styles.cancelButton}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
