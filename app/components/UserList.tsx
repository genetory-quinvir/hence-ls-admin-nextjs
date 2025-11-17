'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import { User } from '../data/mockData'
import Modal from './Modal'
import styles from './UserList.module.css'

export default function UserList() {
  const { users, updateUsers } = useMockData()
  const [filterNickname, setFilterNickname] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'suspend' | 'warn' | null
    user: User | null
  }>({
    isOpen: false,
    type: null,
    user: null,
  })
  
  const filteredUsers = useMemo(() => {
    let filtered = [...users]
    
    if (filterNickname) {
      filtered = filtered.filter(u => 
        u.nickname.toLowerCase().includes(filterNickname.toLowerCase())
      )
    }
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'suspended') {
        filtered = filtered.filter(u => u.isSuspended)
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(u => !u.isSuspended)
      }
    }
    
    return filtered
  }, [users, filterNickname, filterStatus])

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

  const confirmAction = () => {
    if (!modalState.user) return

    if (modalState.type === 'suspend') {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === modalState.user!.id
            ? { ...u, isSuspended: true, suspensionReason: '운영정책 위반' }
            : u
        )
      )
      alert('사용자가 정지되었습니다.')
    } else if (modalState.type === 'warn') {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === modalState.user!.id
            ? { ...u, reportedCount: u.reportedCount + 1 }
            : u
        )
      )
      alert('경고가 부여되었습니다.')
    }

    setModalState({ isOpen: false, type: null, user: null })
  }

  const getStatusBadge = (user: User) => {
    if (user.isSuspended) {
      return <span className={`${styles.badge} ${styles.suspended}`}>정지</span>
    }
    if (user.reportedCount > 3) {
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
        <h1 className={styles.title}>전체 사용자 리스트</h1>
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
              <option value="suspended">정지</option>
            </select>
          </div>
        </div>

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
                    데이터가 없습니다.
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
                      <div className={styles.nickname}>{user.nickname}</div>
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
                        {!user.isSuspended && (
                          <button 
                            className={`${styles.actionBtn} ${styles.warning}`}
                            onClick={() => handleSuspend(user)}
                          >
                            정지
                          </button>
                        )}
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleWarn(user)}
                        >
                          경고
                        </button>
                        <button className={styles.actionBtn}>로그</button>
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
        onClose={() => setModalState({ isOpen: false, type: null, user: null })}
        title={
          modalState.type === 'suspend'
            ? '사용자 정지'
            : '경고 부여'
        }
        message={
          modalState.type === 'suspend'
            ? `"${modalState.user?.nickname}" 사용자를 정지하시겠습니까?`
            : `"${modalState.user?.nickname}" 사용자에게 경고를 부여하시겠습니까?`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type={modalState.type === 'suspend' ? 'danger' : 'warning'}
      />
    </div>
  )
}

