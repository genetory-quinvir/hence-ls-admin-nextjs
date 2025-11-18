'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMockData } from '../context/MockDataContext'
import { LiveSpace } from '../data/mockData'
import Modal from './Modal'
import styles from './LiveSpaceList.module.css'

interface LiveSpaceListProps {
  menuId: string
}

export default function LiveSpaceList({ menuId }: LiveSpaceListProps) {
  const { liveSpaces, updateLiveSpaces } = useMockData()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // menuId에 따라 초기 필터 설정
  useEffect(() => {
    if (menuId === 'live-space-force-close') {
      setFilterStatus('live') // 강제 종료 큐는 라이브 상태만
    } else if (menuId === 'live-space-reported') {
      setFilterStatus('all') // 신고된 스페이스는 모든 상태
    } else {
      setFilterStatus('all') // 전체 목록은 모든 상태
    }
  }, [menuId])
  
  const getTitle = () => {
    switch (menuId) {
      case 'live-space-list':
        return '전체 라이브 스페이스 목록'
      case 'live-space-force-close':
        return '강제 종료 큐'
      case 'live-space-reported':
        return '신고 접수된 스페이스'
      default:
        return '라이브 스페이스 목록'
    }
  }
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'forceClose' | 'hide' | null
    liveSpace: LiveSpace | null
  }>({
    isOpen: false,
    type: null,
    liveSpace: null,
  })
  
  const filteredLiveSpaces = useMemo(() => {
    let filtered = [...liveSpaces]
    
    // menuId에 따른 기본 필터
    if (menuId === 'live-space-force-close') {
      // 강제 종료 큐: 라이브 상태이면서 다음 중 하나:
      // 1. 신고가 3건 이상 (심각한 신고)
      // 2. 체크인이 0 (비정상적인 스페이스)
      // 3. 신고가 있고 체크인이 1 이하 (문제가 있는 스페이스)
      filtered = filtered.filter(ls => 
        !ls.isHidden &&
        ls.status === 'live' && (
          ls.reportedCount >= 3 || 
          ls.checkInCount === 0 ||
          (ls.reportedCount > 0 && ls.checkInCount <= 1)
        )
      )
    } else if (menuId === 'live-space-reported') {
      // 신고 접수된 스페이스: 신고가 있는 모든 스페이스 (라이브든 종료든 상관없이)
      filtered = filtered.filter(ls => !ls.isHidden && ls.reportedCount > 0)
    }
    
    // 추가 필터 적용
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ls => {
        if (filterStatus === 'live') return ls.status === 'live' && !ls.isHidden
        if (filterStatus === 'ended') return ls.status === 'ended' && !ls.isHidden
        if (filterStatus === 'force-closed') return ls.isForceClosed === true
        if (filterStatus === 'hidden') return ls.isHidden === true
        return true
      })
    } else {
      // 필터가 'all'일 때도 숨김 처리된 항목은 기본적으로 제외
      filtered = filtered.filter(ls => !ls.isHidden)
    }
    
    if (filterRegion !== 'all') {
      filtered = filtered.filter(ls => ls.location.district === filterRegion)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(ls => 
        ls.hostNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ls.title && ls.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    return filtered
  }, [liveSpaces, filterStatus, filterRegion, searchQuery, menuId])

  const handleForceClose = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'forceClose',
      liveSpace,
    })
  }

  const handleHide = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'hide',
      liveSpace,
    })
  }

  const confirmAction = () => {
    if (!modalState.liveSpace) return

    const targetId = modalState.liveSpace.id
    const actionType = modalState.type

    // 모달 먼저 닫기
    setModalState({ isOpen: false, type: null, liveSpace: null })

    if (actionType === 'forceClose') {
      updateLiveSpaces((prev) => {
        const updated = prev.map((ls) =>
          ls.id === targetId
            ? { ...ls, status: 'ended' as const, endedAt: new Date().toISOString(), isForceClosed: true }
            : ls
        )
        return updated
      })
      setTimeout(() => {
        alert('라이브 스페이스가 강제 종료되었습니다.')
      }, 100)
    } else if (actionType === 'hide') {
      updateLiveSpaces((prev) => {
        const updated = prev.map((ls) =>
          ls.id === targetId
            ? { ...ls, isHidden: true }
            : ls
        )
        return updated
      })
      setTimeout(() => {
        alert('라이브 스페이스가 숨김 처리되었습니다.')
      }, 100)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <span className={`${styles.badge} ${styles.live}`}>Live</span>
      case 'ended':
        return <span className={`${styles.badge} ${styles.ended}`}>종료</span>
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

  const getRemainingTime = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - created.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}시간 ${minutes}분 경과`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        {menuId === 'live-space-reported' && (
          <p className={styles.subtitle}>신고가 접수된 라이브 스페이스 목록입니다</p>
        )}
        {menuId === 'live-space-force-close' && (
          <p className={styles.subtitle}>강제 종료가 필요한 라이브 스페이스 목록입니다</p>
        )}
      </div>

      <div className={styles.content}>
        {/* 필터 섹션 */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="live">라이브</option>
              <option value="ended">종료</option>
              <option value="force-closed">강제 종료</option>
              <option value="hidden">숨김</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>지역</label>
            <select 
              className={styles.filterSelect}
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="강남구">강남구</option>
              <option value="마포구">마포구</option>
              <option value="중구">중구</option>
              <option value="송파구">송파구</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>호스트 검색</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="닉네임 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>썸네일</th>
                <th>이름</th>
                <th>호스트</th>
                <th>상태</th>
                <th>체크인 수</th>
                <th>개설 시간</th>
                <th>종료 시간</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveSpaces.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    {(filterStatus !== 'all' || filterRegion !== 'all' || searchQuery) ? (
                      '리스트가 없습니다.'
                    ) : (
                      menuId === 'live-space-force-close' 
                        ? '강제 종료가 필요한 라이브 스페이스가 없습니다.'
                        : menuId === 'live-space-reported'
                        ? '신고 접수된 라이브 스페이스가 없습니다.'
                        : '조건에 맞는 라이브 스페이스가 없습니다.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredLiveSpaces.map((ls) => (
                  <tr key={ls.id}>
                    <td>
                      <div className={styles.thumbnail}>
                        {ls.thumbnail ? (
                          <img src={ls.thumbnail} alt={ls.title} />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>
                            {ls.hostNickname[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        {ls.title || `${ls.hostNickname}의 라이브스페이스`}
                        {(menuId === 'live-space-reported' || menuId === 'live-space-force-close') && ls.reportedCount > 0 && (
                          <span className={styles.reportedCountBadge}>
                            신고 {ls.reportedCount}건
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.hostCell}>
                        <span className={styles.hostName}>{ls.hostNickname}</span>
                        <span className={styles.activityScore}>활동지수: 85</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(ls.status)}</td>
                    <td>
                      {ls.checkInCount}
                      {menuId === 'live-space-force-close' && ls.checkInCount === 0 && (
                        <span className={styles.warningBadge}>⚠️</span>
                      )}
                    </td>
                    <td>{formatDate(ls.createdAt)}</td>
                    <td>
                      {ls.status === 'live' ? (
                        <span className={styles.remainingTime}>
                          {getRemainingTime(ls.createdAt)}
                        </span>
                      ) : ls.endedAt ? (
                        formatDate(ls.endedAt)
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn}>상세</button>
                        {ls.status === 'live' && (
                          <button 
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleForceClose(ls)}
                          >
                            강제종료
                          </button>
                        )}
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleHide(ls)}
                        >
                          숨김
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
          {filteredLiveSpaces.length === 0 ? (
            <div className={styles.emptyCard}>
              {(filterStatus !== 'all' || filterRegion !== 'all' || searchQuery) ? (
                '리스트가 없습니다.'
              ) : (
                menuId === 'live-space-force-close' 
                  ? '강제 종료가 필요한 라이브 스페이스가 없습니다.'
                  : menuId === 'live-space-reported'
                  ? '신고 접수된 라이브 스페이스가 없습니다.'
                  : '조건에 맞는 라이브 스페이스가 없습니다.'
              )}
            </div>
          ) : (
            filteredLiveSpaces.map((ls) => (
              <div key={ls.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardThumbnail}>
                    {ls.thumbnail ? (
                      <img src={ls.thumbnail} alt={ls.title} />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        {ls.hostNickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardTitle}>
                      {ls.title || `${ls.hostNickname}의 라이브스페이스`}
                      {(menuId === 'live-space-reported' || menuId === 'live-space-force-close') && ls.reportedCount > 0 && (
                        <span className={styles.reportedCountBadge}>
                          신고 {ls.reportedCount}건
                        </span>
                      )}
                    </div>
                    <div className={styles.cardHost}>
                      {ls.hostNickname}
                      <span className={styles.cardActivityScore}> · 활동지수: 85</span>
                    </div>
                  </div>
                  <div className={styles.cardStatus}>
                    {getStatusBadge(ls.status)}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>체크인 수</span>
                      <span className={styles.cardInfoValue}>
                        {ls.checkInCount}
                        {menuId === 'live-space-force-close' && ls.checkInCount === 0 && (
                          <span className={styles.warningBadge}>⚠️</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>개설 시간</span>
                      <span className={styles.cardInfoValue}>{formatDate(ls.createdAt)}</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>
                        {ls.status === 'live' ? '경과 시간' : '종료 시간'}
                      </span>
                      <span className={styles.cardInfoValue}>
                        {ls.status === 'live' ? (
                          <span className={styles.remainingTime}>
                            {getRemainingTime(ls.createdAt)}
                          </span>
                        ) : ls.endedAt ? (
                          formatDate(ls.endedAt)
                        ) : (
                          '-'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button className={styles.actionBtn}>상세</button>
                  {ls.status === 'live' && (
                    <button 
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => handleForceClose(ls)}
                    >
                      강제종료
                    </button>
                  )}
                  <button 
                    className={styles.actionBtn}
                    onClick={() => handleHide(ls)}
                  >
                    숨김
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, type: null, liveSpace: null })}
        title={
          modalState.type === 'forceClose'
            ? '라이브 스페이스 강제 종료'
            : '라이브 스페이스 숨김'
        }
        message={
          modalState.type === 'forceClose'
            ? `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 강제 종료하시겠습니까?\n\n해당 스페이스는 즉시 종료됩니다.\n사용자에게 '운영정책 위반으로 종료' 안내가 발송됩니다.`
            : `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 숨김 처리하시겠습니까?`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type={modalState.type === 'forceClose' ? 'danger' : 'warning'}
      />
    </div>
  )
}

