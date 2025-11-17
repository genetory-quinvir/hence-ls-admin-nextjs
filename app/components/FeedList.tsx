'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import { Feed } from '../data/mockData'
import Modal from './Modal'
import styles from './FeedList.module.css'

interface FeedListProps {
  menuId: string
}

export default function FeedList({ menuId }: FeedListProps) {
  const { feeds, updateFeeds } = useMockData()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'delete' | 'sanction' | null
    feed: Feed | null
  }>({
    isOpen: false,
    type: null,
    feed: null,
  })

  // menuId에 따라 필터링
  const filteredFeeds = useMemo(() => {
    switch (menuId) {
      case 'feed-all':
        return feeds
      case 'feed-reported':
        return feeds.filter(feed => feed.reportedCount > 0)
      default:
        return feeds
    }
  }, [feeds, menuId])

  // 정렬: 신고 건수 많은 순, 그 다음 최신순
  const sortedFeeds = useMemo(() => {
    return [...filteredFeeds].sort((a, b) => {
      if (menuId === 'feed-reported') {
        // 신고된 피드는 신고 건수 많은 순
        if (b.reportedCount !== a.reportedCount) {
          return b.reportedCount - a.reportedCount
        }
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [filteredFeeds, menuId])

  const getMenuTitle = () => {
    switch (menuId) {
      case 'feed-all':
        return '전체 피드'
      case 'feed-reported':
        return '신고된 피드'
      default:
        return '피드 관리'
    }
  }

  const handleDelete = (feed: Feed) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      feed,
    })
  }

  const handleSanction = (feed: Feed) => {
    setModalState({
      isOpen: true,
      type: 'sanction',
      feed,
    })
  }

  const confirmAction = () => {
    if (!modalState.feed) return

    if (modalState.type === 'delete') {
      updateFeeds((prev) => prev.filter((f) => f.id !== modalState.feed!.id))
      alert('피드가 삭제되었습니다.')
    } else if (modalState.type === 'sanction') {
      // 작성자 제재 로직은 UserList에서 처리
      alert('작성자 제재 처리가 요청되었습니다.')
    }

    setModalState({ isOpen: false, type: null, feed: null })
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
        {menuId === 'feed-reported' && (
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              신고된 피드: {filteredFeeds.length}건
            </span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>내용</th>
                <th>이미지</th>
                <th>작성자</th>
                <th>소속 Live Space</th>
                <th>작성일</th>
                <th>신고건수</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeeds.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedFeeds.map((feed) => (
                  <tr key={feed.id}>
                    <td>
                      <div className={styles.contentCell}>
                        {truncateContent(feed.content)}
                      </div>
                    </td>
                    <td>
                      {feed.images.length > 0 ? (
                        <span className={styles.hasImage}>✓</span>
                      ) : (
                        <span className={styles.noImage}>-</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.authorCell}>
                        {feed.authorProfileImage ? (
                          <img 
                            src={feed.authorProfileImage} 
                            alt={feed.authorNickname}
                            className={styles.authorImage}
                          />
                        ) : (
                          <div className={styles.authorPlaceholder}>
                            {feed.authorNickname[0]}
                          </div>
                        )}
                        <span>{feed.authorNickname}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.liveSpaceCell}>
                        {feed.liveSpaceTitle}
                      </div>
                    </td>
                    <td>{formatDate(feed.createdAt)}</td>
                    <td>
                      {feed.reportedCount > 0 ? (
                        <span className={styles.reportedCountBadge}>
                          신고 {feed.reportedCount}건
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDelete(feed)}
                        >
                          삭제
                        </button>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleSanction(feed)}
                        >
                          제재
                        </button>
                        <button className={styles.actionBtn}>신고처리</button>
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
        onClose={() => setModalState({ isOpen: false, type: null, feed: null })}
        title={
          modalState.type === 'delete'
            ? '피드 삭제'
            : '작성자 제재'
        }
        message={
          modalState.type === 'delete'
            ? `이 피드를 삭제하시겠습니까?`
            : `작성자 "${modalState.feed?.authorNickname}"에게 제재를 부여하시겠습니까?`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type="danger"
      />
    </div>
  )
}

