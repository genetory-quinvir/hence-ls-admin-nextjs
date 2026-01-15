'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../context/AuthContext'
import { searchUsers, UserSearchResult, sendPushNotificationAll } from '../lib/api'
import Modal from './Modal'
import styles from './PushNotification.module.css'

interface PushNotificationProps {
  menuId: string
}

export default function PushNotification({ menuId }: PushNotificationProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // 사용자 검색 관련 상태
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const getTitle = () => {
    switch (menuId) {
      case 'push-all':
        return '전체 푸시 전송'
      case 'push-role':
        return 'Role별 푸시 전송'
      case 'push-individual':
        return '개인 푸시 전송'
      default:
        return '앱 푸시'
    }
  }

  // 사용자 검색 실행
  const handleSearch = async () => {
    if (!userSearchQuery.trim()) {
      alert('검색어를 입력해주세요.')
      return
    }

    if (userSearchQuery.trim().length < 2) {
      alert('최소 2글자 이상 입력해주세요.')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)
    setSelectedUserId('') // 검색 시 선택 해제
    
    try {
      const response = await searchUsers(userSearchQuery.trim(), 50)
      
      if (response.success && response.data) {
        setSearchResults(response.data)
        if (response.data.length === 0) {
          setSearchError('검색 결과가 없습니다.')
        }
      } else {
        setSearchError(response.error || '검색 중 오류가 발생했습니다.')
        setSearchResults([])
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Enter 키로 검색
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // 선택된 사용자 정보
  const selectedUser = useMemo(() => {
    return searchResults.find(u => u.id === selectedUserId) || null
  }, [searchResults, selectedUserId])

  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUserId(user.id)
    setUserSearchQuery(`${user.nickname} (${user.email})`)
  }

  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value)
    if (!value.trim()) {
      setSelectedUserId('')
      setSearchResults([])
      setHasSearched(false)
      setSearchError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !body.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    if (menuId === 'push-role' && selectedRole === 'all') {
      alert('Role을 선택해주세요.')
      return
    }

    if (menuId === 'push-individual' && !selectedUserId) {
      alert('사용자를 선택해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      // 전체 푸시 전송
      if (menuId === 'push-all') {
        const result = await sendPushNotificationAll({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || '',
          type: 'SYSTEM',
        })
        
        if (!result.success) {
          alert(result.error || '푸시 전송 중 오류가 발생했습니다.')
          return
        }
      } else if (menuId === 'push-role') {
        // TODO: Role별 푸시 전송 API 구현 필요
        alert('Role별 푸시 전송 기능은 아직 구현되지 않았습니다.')
        setIsSubmitting(false)
        return
      } else if (menuId === 'push-individual') {
        // TODO: 개인 푸시 전송 API 구현 필요
        alert('개인 푸시 전송 기능은 아직 구현되지 않았습니다.')
        setIsSubmitting(false)
        return
      }
      
      setShowSuccess(true)
      setTitle('')
      setBody('')
      setLink('')
      setSelectedRole('all')
      setSelectedUserId('')
      setUserSearchQuery('')
      setSearchResults([])
      setHasSearched(false)
      setSearchError(null)
      
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (error) {
      alert('푸시 전송 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
      </div>

      <div className={styles.content}>
        {showSuccess && (
          <div className={styles.successMessage}>
            푸시 알림이 성공적으로 전송되었습니다.
          </div>
        )}

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
              placeholder="푸시 알림 제목을 입력하세요"
              required
              disabled={isSubmitting}
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
              placeholder="푸시 알림 내용을 입력하세요"
              rows={5}
              required
              disabled={isSubmitting}
            />
          </div>

          {menuId === 'push-all' && (
            <div className={styles.formGroup}>
              <label htmlFor="link" className={styles.label}>
                링크 (선택)
              </label>
              <input
                id="link"
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className={styles.input}
                placeholder="푸시 알림 클릭 시 이동할 링크를 입력하세요 (선택사항)"
                disabled={isSubmitting}
              />
            </div>
          )}

          {menuId === 'push-role' && (
            <div className={styles.formGroup}>
              <label htmlFor="role" className={styles.label}>
                대상 Role <span className={styles.required}>*</span>
              </label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className={styles.select}
                required
                disabled={isSubmitting}
              >
                <option value="all">선택하세요</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="TESTER">Tester</option>
              </select>
            </div>
          )}

          {menuId === 'push-individual' && (
            <div className={styles.formGroup}>
              <label htmlFor="user" className={styles.label}>
                대상 사용자 <span className={styles.required}>*</span>
              </label>
              
              {/* 검색 입력 및 버튼 */}
              <div className={styles.userSearchContainer}>
                <div className={styles.userSearchInputWrapper}>
                  <input
                    id="user"
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => handleUserSearchChange(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className={styles.userSearchInput}
                    placeholder="닉네임 또는 이메일로 검색 (최소 2글자 이상)"
                    disabled={isSubmitting || isSearching}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className={styles.searchButton}
                    disabled={isSubmitting || isSearching || !userSearchQuery.trim() || userSearchQuery.trim().length < 2}
                  >
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>
                {searchError && (
                  <div className={styles.searchError}>{searchError}</div>
                )}
                {userSearchQuery.trim().length > 0 && userSearchQuery.trim().length < 2 && (
                  <div className={styles.searchHint}>최소 2글자 이상 입력해주세요.</div>
                )}
              </div>

              {/* 검색 결과 리스트 */}
              {hasSearched && (
                <div className={styles.searchResultsContainer}>
                  <div className={styles.searchResultsHeader}>
                    <span className={styles.searchResultsTitle}>
                      검색 결과 {searchResults.length > 0 ? `(${searchResults.length}명)` : ''}
                    </span>
                  </div>
                  {isSearching ? (
                    <div className={styles.searchResultsLoading}>검색 중...</div>
                  ) : searchResults.length > 0 ? (
                    <div className={styles.searchResultsList}>
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          className={`${styles.searchResultItem} ${selectedUserId === u.id ? styles.selected : ''}`}
                          onClick={() => handleUserSelect(u)}
                        >
                          <div className={styles.searchResultInfo}>
                            <div className={styles.searchResultName}>{u.nickname}</div>
                            <div className={styles.searchResultEmail}>{u.email}</div>
                            {u.role && (
                              <div className={styles.searchResultRole}>Role: {u.role}</div>
                            )}
                          </div>
                          {selectedUserId === u.id && (
                            <div className={styles.searchResultCheck}>✓</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.searchResultsEmpty}>검색 결과가 없습니다.</div>
                  )}
                </div>
              )}

              {/* 선택된 사용자 정보 */}
              {selectedUser && (
                <div className={styles.selectedUserInfo}>
                  선택된 사용자: <strong>{selectedUser.nickname}</strong> ({selectedUser.email})
                </div>
              )}
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? '전송 중...' : '푸시 전송'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

