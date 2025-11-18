'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import Modal from './Modal'
import styles from './RewardList.module.css'

interface RewardListProps {
  menuId: string
}

export default function RewardList({ menuId }: RewardListProps) {
  const { rewards, rewardHistory, phoneAuthLogs, updateRewardHistory } = useMockData()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    rewardHistoryId: string | null
  }>({
    isOpen: false,
    rewardHistoryId: null,
  })

  const handleShip = (rewardHistoryId: string) => {
    setModalState({
      isOpen: true,
      rewardHistoryId,
    })
  }

  const confirmShip = () => {
    if (!modalState.rewardHistoryId) return

    updateRewardHistory((prev) =>
      prev.map((rh) =>
        rh.id === modalState.rewardHistoryId!
          ? { ...rh, status: 'shipped' as const }
          : rh
      )
    )
    alert('발송 처리되었습니다.')
    setModalState({ isOpen: false, rewardHistoryId: null })
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className={`${styles.badge} ${styles.pending}`}>대기</span>
      case 'shipped':
        return <span className={`${styles.badge} ${styles.shipped}`}>발송</span>
      case 'completed':
        return <span className={`${styles.badge} ${styles.completed}`}>완료</span>
      case 'cancelled':
        return <span className={`${styles.badge} ${styles.cancelled}`}>취소</span>
      default:
        return <span className={styles.badge}>-</span>
    }
  }

  if (menuId === 'points-policy') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>포인트 정책 (읽기 전용)</h1>
        </div>
        <div className={styles.content}>
          <div className={styles.card}>
            <h2>행동별 포인트 테이블</h2>
            <table className={styles.policyTable}>
              <thead>
                <tr>
                  <th>행동</th>
                  <th>포인트</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>라이브 스페이스 개설</td>
                  <td>+50</td>
                </tr>
                <tr>
                  <td>체크인</td>
                  <td>+10</td>
                </tr>
                <tr>
                  <td>피드 작성</td>
                  <td>+20</td>
                </tr>
                <tr>
                  <td>댓글 작성</td>
                  <td>+5</td>
                </tr>
                <tr>
                  <td>출석하기</td>
                  <td>+30</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.policyInfo}>
              <p><strong>일 최대 적립량:</strong> 500 포인트</p>
              <p><strong>연속 출석 정책:</strong> 매일 첫 라이브 스페이스 개설 시 보너스 포인트 지급</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (menuId === 'rewards-history') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>리워드 내역</h1>
        </div>
        <div className={styles.content}>
          {/* 테이블 (데스크탑) */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>사용자</th>
                  <th>사용 포인트</th>
                  <th>전화번호</th>
                  <th>상태</th>
                  <th>교환일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {rewardHistory.map((rh) => (
                  <tr key={rh.id}>
                    <td>{rh.rewardName}</td>
                    <td>{rh.userNickname}</td>
                    <td>{rh.pointsUsed.toLocaleString()}P</td>
                    <td>{rh.phoneNumber}</td>
                    <td>{getStatusBadge(rh.status)}</td>
                    <td>{formatDate(rh.createdAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn}>상세</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 카드 리스트 (모바일) */}
          <div className={styles.cardList}>
            {rewardHistory.map((rh) => (
              <div key={rh.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardTitle}>{rh.rewardName}</div>
                    <div className={styles.cardMeta}>{rh.userNickname}</div>
                  </div>
                  <div className={styles.cardStatus}>
                    {getStatusBadge(rh.status)}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>사용 포인트</span>
                      <span className={styles.cardInfoValue}>{rh.pointsUsed.toLocaleString()}P</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>전화번호</span>
                      <span className={styles.cardInfoValue}>{rh.phoneNumber}</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>교환일</span>
                      <span className={styles.cardInfoValue}>{formatDate(rh.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button className={styles.actionBtn}>상세</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (menuId === 'rewards-payment') {
    const pendingRewards = rewardHistory.filter(rh => rh.status === 'pending')
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>리워드 지급 관리</h1>
        </div>
        <div className={styles.content}>
          {/* 테이블 (데스크탑) */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>사용자</th>
                  <th>전화번호 인증</th>
                  <th>전화번호</th>
                  <th>상태</th>
                  <th>요청일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {pendingRewards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      대기 중인 리워드가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pendingRewards.map((rh) => (
                    <tr key={rh.id}>
                      <td>{rh.rewardName}</td>
                      <td>{rh.userNickname}</td>
                      <td>
                        <span className={styles.verified}>✓ 인증완료</span>
                      </td>
                      <td>{rh.phoneNumber}</td>
                      <td>{getStatusBadge(rh.status)}</td>
                      <td>{formatDate(rh.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button 
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={() => handleShip(rh.id)}
                          >
                            발송 처리
                          </button>
                          <button className={styles.actionBtn}>CS 메모</button>
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
            {pendingRewards.length === 0 ? (
              <div className={styles.emptyCard}>
                대기 중인 리워드가 없습니다.
              </div>
            ) : (
              pendingRewards.map((rh) => (
                <div key={rh.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleSection}>
                      <div className={styles.cardTitle}>{rh.rewardName}</div>
                      <div className={styles.cardMeta}>{rh.userNickname}</div>
                    </div>
                    <div className={styles.cardStatus}>
                      {getStatusBadge(rh.status)}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardInfoItem}>
                        <span className={styles.cardInfoLabel}>전화번호 인증</span>
                        <span className={styles.cardInfoValue}>
                          <span className={styles.verified}>✓ 인증완료</span>
                        </span>
                      </div>
                      <div className={styles.cardInfoItem}>
                        <span className={styles.cardInfoLabel}>전화번호</span>
                        <span className={styles.cardInfoValue}>{rh.phoneNumber}</span>
                      </div>
                      <div className={styles.cardInfoItem}>
                        <span className={styles.cardInfoLabel}>요청일</span>
                        <span className={styles.cardInfoValue}>{formatDate(rh.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <button 
                      className={`${styles.actionBtn} ${styles.primary}`}
                      onClick={() => handleShip(rh.id)}
                    >
                      발송 처리
                    </button>
                    <button className={styles.actionBtn}>CS 메모</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  if (menuId === 'phone-auth-log') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>전화번호 인증 로그</h1>
        </div>
        <div className={styles.content}>
          {/* 테이블 (데스크탑) */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>전화번호</th>
                  <th>목적</th>
                  <th>상태</th>
                  <th>인증일</th>
                </tr>
              </thead>
              <tbody>
                {phoneAuthLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.userNickname}</td>
                    <td>{log.phoneNumber}</td>
                    <td>
                      <span className={styles.purpose}>
                        {log.purpose === 'reward' ? '리워드' : '프로필'}
                      </span>
                    </td>
                    <td>
                      {log.status === 'success' ? (
                        <span className={`${styles.badge} ${styles.success}`}>성공</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.failed}`}>실패</span>
                      )}
                    </td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 카드 리스트 (모바일) */}
          <div className={styles.cardList}>
            {phoneAuthLogs.map((log) => (
              <div key={log.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardTitle}>{log.userNickname}</div>
                    <div className={styles.cardMeta}>{log.phoneNumber}</div>
                  </div>
                  <div className={styles.cardStatus}>
                    {log.status === 'success' ? (
                      <span className={`${styles.badge} ${styles.success}`}>성공</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.failed}`}>실패</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>목적</span>
                      <span className={styles.cardInfoValue}>
                        <span className={styles.purpose}>
                          {log.purpose === 'reward' ? '리워드' : '프로필'}
                        </span>
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>인증일</span>
                      <span className={styles.cardInfoValue}>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>리워드 목록</h1>
      </div>
      <div className={styles.content}>
        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>상품명</th>
                <th>설명</th>
                <th>필요 포인트</th>
                <th>교환 횟수</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.id}>
                  <td>{reward.productName}</td>
                  <td>{reward.description}</td>
                  <td>{reward.pointsRequired.toLocaleString()}P</td>
                  <td>{reward.exchangeCount}</td>
                  <td>
                    {reward.status === 'active' ? (
                      <span className={`${styles.badge} ${styles.active}`}>활성</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.inactive}`}>비활성</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn}>상세</button>
                      <button className={styles.actionBtn}>수정</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 카드 리스트 (모바일) */}
        <div className={styles.cardList}>
          {rewards.map((reward) => (
            <div key={reward.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleSection}>
                  <div className={styles.cardTitle}>{reward.productName}</div>
                  <div className={styles.cardMeta}>{reward.description}</div>
                </div>
                <div className={styles.cardStatus}>
                  {reward.status === 'active' ? (
                    <span className={`${styles.badge} ${styles.active}`}>활성</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.inactive}`}>비활성</span>
                  )}
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>필요 포인트</span>
                    <span className={styles.cardInfoValue}>{reward.pointsRequired.toLocaleString()}P</span>
                  </div>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>교환 횟수</span>
                    <span className={styles.cardInfoValue}>{reward.exchangeCount}회</span>
                  </div>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <button className={styles.actionBtn}>상세</button>
                <button className={styles.actionBtn}>수정</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {menuId === 'rewards-payment' && (
        <Modal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, rewardHistoryId: null })}
          title="리워드 발송 처리"
          message="이 리워드를 발송 처리하시겠습니까?"
          confirmText="발송 처리"
          cancelText="취소"
          onConfirm={confirmShip}
          type="info"
        />
      )}
    </div>
  )
}

