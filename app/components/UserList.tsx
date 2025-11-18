'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMockData } from '../context/MockDataContext'
import { User } from '../data/mockData'
import Modal from './Modal'
import styles from './UserList.module.css'

interface UserListProps {
  menuId: string
}

export default function UserList({ menuId }: UserListProps) {
  const { users, updateUsers } = useMockData()
  const [filterNickname, setFilterNickname] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'suspend' | 'unsuspend' | 'warn' | 'unwarn' | null
    user: User | null
  }>({
    isOpen: false,
    type: null,
    user: null,
  })
  
  // menuId에 따라 초기 필터 설정
  useEffect(() => {
    if (menuId === 'users-reported') {
      setFilterStatus('all') // 신고된 사용자는 모든 상태
    } else if (menuId === 'users-sanctions') {
      setFilterStatus('suspended') // 제재/정지 관리는 정지 상태만
    } else {
      setFilterStatus('all') // 전체 목록은 모든 상태
    }
  }, [menuId])
  
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
  
  const filteredUsers = useMemo(() => {
    let filtered = [...users]
    
    // menuId에 따른 기본 필터
    if (menuId === 'users-reported') {
      // 신고 접수된 사용자: 신고가 있는 모든 사용자
      filtered = filtered.filter(u => u.reportedCount > 0)
    } else if (menuId === 'users-sanctions') {
      // 제재/정지 관리: 정지된 사용자만
      filtered = filtered.filter(u => u.isSuspended)
    }
    
    // 추가 필터 적용
    if (filterNickname) {
      filtered = filtered.filter(u => 
        u.nickname.toLowerCase().includes(filterNickname.toLowerCase())
      )
    }
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'suspended') {
        filtered = filtered.filter(u => u.isSuspended)
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(u => !u.isSuspended && !u.isWarned)
      } else if (filterStatus === 'warned') {
        filtered = filtered.filter(u => u.isWarned)
      }
    }
    
    return filtered
  }, [users, filterNickname, filterStatus, menuId])

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
    return date.toLocaleDateString('ko-KR')
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        {menuId === 'users-reported' && (
          <p className={styles.subtitle}>신고가 접수된 사용자 목록입니다</p>
        )}
        {menuId === 'users-sanctions' && (
          <p className={styles.subtitle}>제재 및 정지된 사용자 목록입니다</p>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>닉네임 검색</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="닉네임 검색..."
              value={filterNickname}
              onChange={(e) => setFilterNickname(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="active">정상</option>
              <option value="warned">경고</option>
              <option value="suspended">정지</option>
            </select>
          </div>
        </div>

        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>프로필</th>
                <th>닉네임</th>
                <th>프로바이더</th>
                <th>활동지수</th>
                <th>포인트</th>
                <th>상태</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    {(filterStatus !== 'all' || filterNickname) ? (
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
                filteredUsers.map((user) => (
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
                      <div className={styles.actions}>
                        <button className={styles.actionBtn}>상세</button>
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
                        <button className={styles.actionBtn}>로그</button>
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
          {filteredUsers.length === 0 ? (
            <div className={styles.emptyCard}>
              {(filterStatus !== 'all' || filterNickname) ? (
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
            filteredUsers.map((user) => (
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
                      {getProviderLabel(user.provider)} · 활동지수: {user.activityScore}
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
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button className={styles.actionBtn}>상세</button>
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
                  <button className={styles.actionBtn}>로그</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
    </div>
  )
}

