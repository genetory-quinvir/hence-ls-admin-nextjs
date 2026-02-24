'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminUserReportItem,
  AdminUserReportStatusFilter,
  getAdminUserReports,
  processAdminUserReport,
} from '../lib/api'
import styles from './TagManagement.module.css'

export default function UserReportManagement() {
  const [reports, setReports] = useState<AdminUserReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminUserReportStatusFilter>('ALL')
  const [selectedReport, setSelectedReport] = useState<AdminUserReportItem | null>(null)

  const loadReports = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getAdminUserReports(statusFilter === 'ALL' ? undefined : statusFilter)
    if (!result.success) {
      setReports([])
      setError(result.error || '유저 신고 목록을 불러오지 못했습니다.')
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
    return reports.filter((report) =>
      [
        report.id,
        report.targetUserNickname,
        report.targetUserEmail,
        report.reporterNickname,
        report.reporterEmail,
        report.reason,
        report.status,
        report.details,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
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

  const canProcess = (status?: string | null) => {
    const normalized = String(status || '').toUpperCase()
    return !['RESOLVED', 'PROCESSED'].includes(normalized)
  }

  const applyLocalProcessed = (reportId: string) => {
    const processedAt = new Date().toISOString()
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status: 'RESOLVED',
              processedAt: report.processedAt || processedAt,
            }
          : report
      )
    )
    setSelectedReport((prev) =>
      prev && prev.id === reportId
        ? {
            ...prev,
            status: 'RESOLVED',
            processedAt: prev.processedAt || processedAt,
          }
        : prev
    )
  }

  const handleProcess = async (report: AdminUserReportItem) => {
    if (!report.id || isSubmitting) return
    setIsSubmitting(true)
    const result = await processAdminUserReport(report.id)
    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || '유저 신고 처리에 실패했습니다.')
      return
    }

    applyLocalProcessed(report.id)
    alert('유저 신고가 처리되었습니다.')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>유저 신고 관리</h1>
        <button className={styles.addButton} onClick={() => void loadReports()} disabled={isLoading}>
          {isLoading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 220px' }}>
            <input
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="대상 사용자/신고자/사유/상태 검색..."
            />
            <select
              className={styles.searchInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AdminUserReportStatusFilter)}
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
                {searchQuery ? '검색 결과가 없습니다.' : '유저 신고 내역이 없습니다.'}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>신고 ID</th>
                      <th>대상 사용자</th>
                      <th>신고 사유</th>
                      <th>상태</th>
                      <th>신고자</th>
                      <th>신고일시</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id || `${report.targetUserId}-${report.createdAt}`}>
                        <td>{report.id || '-'}</td>
                        <td className={styles.tagNameCell}>
                          {report.targetUserNickname || report.targetUserEmail || report.targetUserId || '-'}
                        </td>
                        <td>{report.reason || '-'}</td>
                        <td>{getStatusLabel(report.status)}</td>
                        <td>{report.reporterNickname || report.reporterEmail || report.reporterId || '-'}</td>
                        <td>{formatDate(report.createdAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.actionButton}
                              onClick={() => setSelectedReport(report)}
                              disabled={isSubmitting}
                            >
                              상세
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={() => void handleProcess(report)}
                              disabled={isSubmitting || !canProcess(report.status)}
                            >
                              처리
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
              <h2>유저 신고 상세</h2>
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
                  <span className={styles.detailLabel}>대상 사용자 ID</span>
                  <span className={styles.detailValue}>{selectedReport.targetUserId || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>대상 사용자</span>
                  <span className={styles.detailValue}>
                    {selectedReport.targetUserNickname || selectedReport.targetUserEmail || '-'}
                  </span>
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
                <button
                  className={styles.saveButton}
                  onClick={() => void handleProcess(selectedReport)}
                  disabled={isSubmitting || !canProcess(selectedReport.status)}
                >
                  {isSubmitting ? '처리 중...' : '처리'}
                </button>
              )}
              <button className={styles.cancelButton} onClick={() => setSelectedReport(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
