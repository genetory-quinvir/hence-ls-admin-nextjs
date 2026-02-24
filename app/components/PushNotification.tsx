'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserRole } from '../context/AuthContext'
import {
  AdminPushScheduleItem,
  cancelAdminPushSchedule,
  getAdminPushSchedules,
  searchUsers,
  sendPushNotificationAll,
  sendPushNotificationByRoles,
  sendPushNotificationToUsers,
  UserSearchResult,
} from '../lib/api'
import styles from './PushNotification.module.css'

interface PushNotificationProps {
  menuId: string
}

type PushMenuId = 'push-all' | 'push-role' | 'push-individual' | 'push-schedules'

const ROLE_OPTIONS: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'TESTER']

export default function PushNotification({ menuId }: PushNotificationProps) {
  const currentMenuId = (menuId as PushMenuId) || 'push-all'

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [schedules, setSchedules] = useState<AdminPushScheduleItem[]>([])
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [cancelingJobId, setCancelingJobId] = useState<string | null>(null)
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>('ALL')
  const [scheduleStartDate, setScheduleStartDate] = useState<string>('')
  const [scheduleEndDate, setScheduleEndDate] = useState<string>('')

  const selectedUsers = useMemo(
    () => searchResults.filter((u) => selectedUserIds.includes(u.id)),
    [searchResults, selectedUserIds]
  )
  const scheduleStatusOptions = useMemo(() => {
    const statuses = Array.from(new Set(schedules.map((item) => (item.status || '').trim()).filter(Boolean)))
    return statuses.sort((a, b) => a.localeCompare(b))
  }, [schedules])
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      if (scheduleStatusFilter !== 'ALL' && (item.status || '') !== scheduleStatusFilter) return false

      const baseDate = item.scheduledAt || item.createdAt
      if (!baseDate) return !scheduleStartDate && !scheduleEndDate
      const date = new Date(baseDate)
      if (Number.isNaN(date.getTime())) return true

      if (scheduleStartDate) {
        const start = new Date(`${scheduleStartDate}T00:00:00`)
        if (date < start) return false
      }
      if (scheduleEndDate) {
        const end = new Date(`${scheduleEndDate}T23:59:59.999`)
        if (date > end) return false
      }
      return true
    })
  }, [schedules, scheduleStatusFilter, scheduleStartDate, scheduleEndDate])

  const getTitle = () => {
    switch (currentMenuId) {
      case 'push-all':
        return '전체 푸시 발송/예약'
      case 'push-role':
        return '역할별 푸시 발송/예약'
      case 'push-individual':
        return '개인 푸시 발송/예약'
      case 'push-schedules':
        return '푸시 활동/예약 관리'
      default:
        return '앱 푸시'
    }
  }

  const isScheduleMode = currentMenuId === 'push-schedules'

  const loadSchedules = async () => {
    setIsLoadingSchedules(true)
    setScheduleError(null)
    const result = await getAdminPushSchedules()
    setIsLoadingSchedules(false)
    if (!result.success) {
      setScheduleError(result.error || '푸시 활동을 불러오지 못했습니다.')
      setSchedules([])
      return
    }
    const items = [...(result.data || [])]
    items.sort((a, b) => {
      const aTime = new Date(a.scheduledAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.scheduledAt || b.createdAt || 0).getTime()
      return bTime - aTime
    })
    setSchedules(items)
  }

  useEffect(() => {
    if (isScheduleMode) {
      void loadSchedules()
    }
  }, [isScheduleMode])

  const resetForm = () => {
    setTitle('')
    setBody('')
    setLink('')
    setScheduledAt('')
    setSelectedRole('all')
    setSelectedUserIds([])
    setUserSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setSearchError(null)
  }

  const handleSearch = async () => {
    const q = userSearchQuery.trim()
    if (!q) {
      alert('검색어를 입력해주세요.')
      return
    }
    if (q.length < 2) {
      alert('최소 2글자 이상 입력해주세요.')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)
    try {
      const response = await searchUsers(q, 50)
      if (!response.success || !response.data) {
        setSearchResults([])
        setSearchError(response.error || '검색 중 오류가 발생했습니다.')
        return
      }
      setSearchResults(response.data)
      if (response.data.length === 0) {
        setSearchError('검색 결과가 없습니다.')
      }
    } catch (error) {
      setSearchResults([])
      setSearchError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleUserSelection = (user: UserSearchResult) => {
    setSelectedUserIds((prev) =>
      prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }
    if (currentMenuId === 'push-role' && selectedRole === 'all') {
      alert('대상 역할을 선택해주세요.')
      return
    }
    if (currentMenuId === 'push-individual' && selectedUserIds.length === 0) {
      alert('대상 사용자를 1명 이상 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    const commonPayload = {
      title: title.trim(),
      body: body.trim(),
      link: link.trim() || '',
      type: 'SYSTEM' as const,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
    }

    try {
      let result
      if (currentMenuId === 'push-all') {
        result = await sendPushNotificationAll(commonPayload)
      } else if (currentMenuId === 'push-role') {
        result = await sendPushNotificationByRoles({
          ...commonPayload,
          roles: [selectedRole],
        })
      } else {
        result = await sendPushNotificationToUsers({
          ...commonPayload,
          userIds: selectedUserIds,
        })
      }

      if (!result.success) {
        alert(result.error || '푸시 발송/예약에 실패했습니다.')
        setIsSubmitting(false)
        return
      }

      const resultData = result.data || {}
      const returnedJobId =
        resultData.jobId ||
        resultData.id ||
        resultData.data?.jobId ||
        resultData.result?.jobId
      const isReserved = !!scheduledAt
      setSuccessMessage(
        isReserved
          ? `예약 발송 요청이 등록되었습니다.${returnedJobId ? ` (jobId: ${returnedJobId})` : ''}`
          : `즉시 발송 요청이 처리되었습니다.${returnedJobId ? ` (jobId: ${returnedJobId})` : ''}`
      )
      resetForm()
      setTimeout(() => setSuccessMessage(null), 3500)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelSchedule = async (jobId: string) => {
    if (!jobId || cancelingJobId) return
    if (!confirm('이 예약 발송을 취소하시겠습니까?')) return
    setCancelingJobId(jobId)
    const result = await cancelAdminPushSchedule(jobId)
    setCancelingJobId(null)
    if (!result.success) {
      alert(result.error || '예약 취소에 실패했습니다.')
      return
    }
    await loadSchedules()
    alert('예약이 취소되었습니다.')
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('ko-KR')
  }

  const getScheduleTargetLabel = (item: AdminPushScheduleItem) => {
    if (item.targetType) return String(item.targetType)
    if (item.targetRoles?.length) return `ROLES (${item.targetRoles.join(', ')})`
    if (item.targetUserIds?.length) return `USERS (${item.targetUserIds.length}명)`
    return '-'
  }

  const canCancelScheduledItem = (item: AdminPushScheduleItem) => {
    if (!item.scheduledAt) return false

    const status = String(item.status || '').toUpperCase()
    if (!status) return true

    if (status.includes('CANCEL')) return false
    if (status.includes('SUCCESS')) return false
    if (status.includes('SENT')) return false
    if (status.includes('DONE')) return false
    if (status.includes('COMPLETE')) return false
    if (status.includes('FAIL')) return false

    return true
  }

  if (isScheduleMode) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{getTitle()}</h1>
        </div>
      <div className={styles.content}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ color: '#666', fontSize: '14px' }}>전체 푸시 활동 및 예약 관리 목록</div>
            <button className={styles.searchButton} type="button" onClick={() => void loadSchedules()} disabled={isLoadingSchedules}>
              {isLoadingSchedules ? '불러오는 중...' : '새로고침'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 180px 180px auto',
              gap: '12px',
              marginBottom: '16px',
              alignItems: 'end',
            }}
          >
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label className={styles.label}>상태</label>
              <select
                className={styles.select}
                value={scheduleStatusFilter}
                onChange={(e) => setScheduleStatusFilter(e.target.value)}
                disabled={isLoadingSchedules}
              >
                <option value="ALL">전체</option>
                {scheduleStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label className={styles.label}>시작일</label>
              <input
                type="date"
                className={styles.input}
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
                disabled={isLoadingSchedules}
              />
            </div>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label className={styles.label}>종료일</label>
              <input
                type="date"
                className={styles.input}
                value={scheduleEndDate}
                onChange={(e) => setScheduleEndDate(e.target.value)}
                disabled={isLoadingSchedules}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className={styles.searchButton}
                onClick={() => {
                  setScheduleStatusFilter('ALL')
                  setScheduleStartDate('')
                  setScheduleEndDate('')
                }}
                disabled={isLoadingSchedules}
                style={{ background: '#64748b' }}
              >
                필터 초기화
              </button>
            </div>
          </div>

          {scheduleError && <div className={styles.searchError}>{scheduleError}</div>}
          {isLoadingSchedules ? (
            <div className={styles.searchResultsLoading}>로딩 중...</div>
          ) : filteredSchedules.length === 0 ? (
            <div className={styles.searchResultsEmpty}>푸시 활동 내역이 없습니다.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Job ID', '상태', '대상', '제목', '예약시각', '생성시각', '작업'].map((h) => (
                      <th
                        key={h}
                        style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((item) => (
                    <tr key={item.jobId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>{item.jobId}</td>
                      <td style={{ padding: '12px' }}>{item.status || '-'}</td>
                      <td style={{ padding: '12px' }}>{getScheduleTargetLabel(item)}</td>
                      <td style={{ padding: '12px', maxWidth: '260px' }}>
                        <div style={{ fontWeight: 600 }}>{item.title || '-'}</div>
                        <div style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.body || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>{formatDate(item.scheduledAt)}</td>
                      <td style={{ padding: '12px' }}>{formatDate(item.createdAt)}</td>
                      <td style={{ padding: '12px' }}>
                        {canCancelScheduledItem(item) ? (
                          <button
                            type="button"
                            className={styles.searchButton}
                            onClick={() => void handleCancelSchedule(item.jobId)}
                            disabled={cancelingJobId === item.jobId}
                            style={{ padding: '8px 12px', background: '#ef4444' }}
                          >
                            {cancelingJobId === item.jobId ? '취소 중...' : '예약 취소'}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
      </div>

      <div className={styles.content}>
        {successMessage && <div className={styles.successMessage}>{successMessage}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              제목 <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder="푸시 알림 제목"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="body" className={styles.label}>
              내용 <span className={styles.required}>*</span>
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={styles.textarea}
              rows={5}
              placeholder="푸시 알림 내용"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="link" className={styles.label}>링크 (선택)</label>
            <input
              id="link"
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={styles.input}
              placeholder="앱 내부 링크 또는 URL"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="scheduledAt" className={styles.label}>예약 발송 시각 (선택)</label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={styles.input}
              disabled={isSubmitting}
            />
            <div className={styles.searchHint}>비워두면 즉시 발송, 입력하면 예약 발송으로 요청합니다.</div>
          </div>

          {currentMenuId === 'push-role' && (
            <div className={styles.formGroup}>
              <label htmlFor="role" className={styles.label}>
                대상 역할 <span className={styles.required}>*</span>
              </label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className={styles.select}
                disabled={isSubmitting}
              >
                <option value="all">선택하세요</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}

          {currentMenuId === 'push-individual' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                대상 사용자 (다수 선택 가능) <span className={styles.required}>*</span>
              </label>
              <div className={styles.userSearchContainer}>
                <div className={styles.userSearchInputWrapper}>
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => {
                      const value = e.target.value
                      setUserSearchQuery(value)
                      if (!value.trim()) {
                        setSearchResults([])
                        setHasSearched(false)
                        setSearchError(null)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleSearch()
                      }
                    }}
                    className={styles.userSearchInput}
                    placeholder="닉네임/이메일 검색 (2글자 이상)"
                    disabled={isSubmitting || isSearching}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSearch()}
                    className={styles.searchButton}
                    disabled={isSubmitting || isSearching || userSearchQuery.trim().length < 2}
                  >
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>
                {searchError && <div className={styles.searchError}>{searchError}</div>}
              </div>

              {selectedUsers.length > 0 && (
                <div className={styles.selectedUserInfo}>
                  선택된 사용자 {selectedUsers.length}명:
                  {' '}
                  <strong>{selectedUsers.map((u) => u.nickname).join(', ')}</strong>
                </div>
              )}

              {hasSearched && (
                <div className={styles.searchResultsContainer}>
                  <div className={styles.searchResultsHeader}>
                    <span className={styles.searchResultsTitle}>
                      검색 결과 {searchResults.length > 0 ? `(${searchResults.length}명)` : ''}
                    </span>
                  </div>
                  {isSearching ? (
                    <div className={styles.searchResultsLoading}>검색 중...</div>
                  ) : searchResults.length === 0 ? (
                    <div className={styles.searchResultsEmpty}>검색 결과가 없습니다.</div>
                  ) : (
                    <div className={styles.searchResultsList}>
                      {searchResults.map((u) => {
                        const selected = selectedUserIds.includes(u.id)
                        return (
                          <div
                            key={u.id}
                            className={`${styles.searchResultItem} ${selected ? styles.selected : ''}`}
                            onClick={() => toggleUserSelection(u)}
                          >
                            <div className={styles.searchResultInfo}>
                              <div className={styles.searchResultName}>{u.nickname}</div>
                              <div className={styles.searchResultEmail}>{u.email}</div>
                              {u.role && <div className={styles.searchResultRole}>Role: {u.role}</div>}
                            </div>
                            <div className={styles.searchResultCheck}>{selected ? '✓' : '+'}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : scheduledAt ? '예약 등록' : '즉시 발송'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
