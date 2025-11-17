'use client'

import { useMemo, useState } from 'react'
import { useMockData } from '../context/MockDataContext'
import Modal from './Modal'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { 
    liveSpaces, 
    users, 
    feeds, 
    reports, 
    rewardHistory,
    resetAllData 
  } = useMockData()
  
  const [showResetModal, setShowResetModal] = useState(false)

  // 오늘 날짜 기준 계산
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayLiveSpaces = liveSpaces.filter(ls => {
    const created = new Date(ls.createdAt)
    return created >= today
  })

  const liveCount = todayLiveSpaces.filter(ls => ls.status === 'live').length
  const endedCount = todayLiveSpaces.filter(ls => ls.status === 'ended').length

  const pendingReports = reports.filter(r => r.status === 'pending')
  const urgentReports = pendingReports.filter(r => 
    r.reason.includes('음란') || r.reason.includes('사기')
  )

  const todayUsers = users.filter(u => {
    const created = new Date(u.createdAt)
    return created >= today
  })
  const suspendedUsers = users.filter(u => u.isSuspended)

  const todayFeeds = feeds.filter(f => {
    const created = new Date(f.createdAt)
    return created >= today
  })
  const reportedFeeds = feeds.filter(f => f.reportedCount > 0)

  const todayRewards = rewardHistory.filter(r => {
    const created = new Date(r.createdAt)
    return created >= today
  })
  const failedRewards = rewardHistory.filter(r => r.status === 'cancelled')

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>현재 상태를 한눈에 파악하세요</p>
      </div>

      <div className={styles.content}>
        {/* 위젯 그리드 */}
        <div className={styles.widgetGrid}>
          {/* 오늘 생성된 Live Space */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetIcon}>🔥</span>
              <h3 className={styles.widgetTitle}>오늘 생성된 Live Space</h3>
            </div>
            <div className={styles.widgetContent}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>총 개수</span>
                <span className={styles.statValue}>{todayLiveSpaces.length}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>라이브 중</span>
                <span className={styles.statValue}>{liveCount}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>종료된 개수</span>
                <span className={styles.statValue}>{endedCount}</span>
              </div>
            </div>
          </div>

          {/* 신고 현황 */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetIcon}>🚨</span>
              <h3 className={styles.widgetTitle}>신고 현황</h3>
            </div>
            <div className={styles.widgetContent}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>미처리 신고</span>
                <span className={`${styles.statValue} ${styles.urgent}`}>
                  {pendingReports.length}
                </span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>긴급 신고</span>
                <span className={`${styles.statValue} ${styles.critical}`}>
                  {urgentReports.length}
                </span>
              </div>
            </div>
          </div>

          {/* 사용자 현황 */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetIcon}>🧑</span>
              <h3 className={styles.widgetTitle}>사용자 현황</h3>
            </div>
            <div className={styles.widgetContent}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>가입자 수</span>
                <span className={styles.statValue}>{users.length}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>오늘 가입</span>
                <span className={styles.statValue}>{todayUsers.length}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>정지 계정</span>
                <span className={styles.statValue}>{suspendedUsers.length}</span>
              </div>
            </div>
          </div>

          {/* 피드 현황 */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetIcon}>📝</span>
              <h3 className={styles.widgetTitle}>피드 현황</h3>
            </div>
            <div className={styles.widgetContent}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>오늘 작성된 피드</span>
                <span className={styles.statValue}>{todayFeeds.length}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>신고된 피드</span>
                <span className={styles.statValue}>{reportedFeeds.length}</span>
              </div>
            </div>
          </div>

          {/* 리워드 현황 */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetIcon}>🎁</span>
              <h3 className={styles.widgetTitle}>리워드 현황</h3>
            </div>
            <div className={styles.widgetContent}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>오늘 교환된 리워드</span>
                <span className={styles.statValue}>{todayRewards.length}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>실패 내역</span>
                <span className={styles.statValue}>{failedRewards.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <div className={styles.quickActionsHeader}>
            <h2 className={styles.sectionTitle}>관리자 Quick Action</h2>
            <button 
              className={styles.resetButton}
              onClick={() => setShowResetModal(true)}
            >
              🔄 목업 데이터 리셋
            </button>
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.actionButton}>
              <span className={styles.actionIcon}>🚨</span>
              <span>신고 처리하기</span>
            </button>
            <button className={styles.actionButton}>
              <span className={styles.actionIcon}>⏹️</span>
              <span>라이브 스페이스 강제 종료</span>
            </button>
            <button className={styles.actionButton}>
              <span className={styles.actionIcon}>👤</span>
              <span>유저 정지 관리</span>
            </button>
            <button className={styles.actionButton}>
              <span className={styles.actionIcon}>✅</span>
              <span>리워드 지급 승인</span>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="목업 데이터 리셋"
        message="모든 목업 데이터를 초기 상태로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="리셋"
        cancelText="취소"
        onConfirm={() => {
          resetAllData()
          alert('목업 데이터가 리셋되었습니다.')
        }}
        type="warning"
      />
    </div>
  )
}

