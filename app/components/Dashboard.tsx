'use client'

import { useMemo, useState } from 'react'
import { useMockData } from '../context/MockDataContext'
import styles from './Dashboard.module.css'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

type TimeRange = 'daily' | 'weekly' | 'monthly'
type CardType = 'liveSpace' | 'reports' | 'users' | 'feeds' | 'rewards'

export default function Dashboard() {
  const { 
    liveSpaces, 
    users, 
    feeds, 
    reports, 
    rewardHistory
  } = useMockData()
  
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')
  const [selectedCard, setSelectedCard] = useState<CardType>('liveSpace')

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

  // 날짜별 데이터 그룹화 함수
  const groupDataByDate = <T extends { createdAt: string }>(
    data: T[],
    range: TimeRange
  ): { date: string; count: number }[] => {
    const now = new Date()
    const grouped: Record<string, number> = {}
    const result: { date: string; count: number }[] = []

    let startDate: Date
    let endDate = new Date(now)
    let dateFormat: (date: Date) => string
    let dateIncrement: (date: Date) => Date

    if (range === 'daily') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 6) // 최근 7일
      dateFormat = (d) => {
        const month = d.getMonth() + 1
        const day = d.getDate()
        return `${month}/${day}`
      }
      dateIncrement = (d) => {
        const next = new Date(d)
        next.setDate(d.getDate() + 1)
        return next
      }
    } else if (range === 'weekly') {
      // 주간: 최근 4주 (월요일 기준)
      startDate = new Date(now)
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startDate.setDate(now.getDate() - daysToMonday - (7 * 3)) // 4주 전 월요일
      startDate.setHours(0, 0, 0, 0)
      dateFormat = (d) => {
        const month = d.getMonth() + 1
        const day = d.getDate()
        return `${month}/${day}`
      }
      dateIncrement = (d) => {
        const next = new Date(d)
        next.setDate(d.getDate() + 7)
        return next
      }
    } else {
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 5) // 최근 6개월
      dateFormat = (d) => {
        const month = d.getMonth() + 1
        return `${month}월`
      }
      dateIncrement = (d) => {
        const next = new Date(d)
        next.setMonth(d.getMonth() + 1)
        return next
      }
    }

    // 초기화
    let current = new Date(startDate)
    while (current <= endDate) {
      const key = dateFormat(current)
      grouped[key] = 0
      current = dateIncrement(current)
    }

    // 데이터 그룹화
    data.forEach((item) => {
      const itemDate = new Date(item.createdAt)
      if (itemDate >= startDate && itemDate <= endDate) {
        let key: string
        if (range === 'daily') {
          key = dateFormat(itemDate)
        } else if (range === 'weekly') {
          // 해당 주의 월요일 찾기
          const weekStart = new Date(itemDate)
          const dayOfWeek = itemDate.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          weekStart.setDate(itemDate.getDate() - daysToMonday)
          weekStart.setHours(0, 0, 0, 0)
          key = dateFormat(weekStart)
        } else {
          key = dateFormat(itemDate)
        }
        if (grouped[key] !== undefined) {
          grouped[key]++
        }
      }
    })

    // 결과 배열 생성
    current = new Date(startDate)
    while (current <= endDate) {
      const key = dateFormat(current)
      result.push({ date: key, count: grouped[key] || 0 })
      current = dateIncrement(current)
    }

    return result
  }

  // 각 항목별 그래프 데이터
  const liveSpaceChartData = useMemo(
    () => groupDataByDate(liveSpaces, timeRange),
    [liveSpaces, timeRange]
  )

  const reportChartData = useMemo(
    () => groupDataByDate(reports, timeRange),
    [reports, timeRange]
  )

  const userChartData = useMemo(
    () => groupDataByDate(users, timeRange),
    [users, timeRange]
  )

  const feedChartData = useMemo(
    () => groupDataByDate(feeds, timeRange),
    [feeds, timeRange]
  )

  const rewardChartData = useMemo(
    () => groupDataByDate(rewardHistory, timeRange),
    [rewardHistory, timeRange]
  )

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>현재 상태를 한눈에 파악하세요</p>
        </div>
        <div className={styles.timeRangeSelector}>
          <button
            className={`${styles.timeRangeButton} ${timeRange === 'daily' ? styles.active : ''}`}
            onClick={() => setTimeRange('daily')}
          >
            일간
          </button>
          <button
            className={`${styles.timeRangeButton} ${timeRange === 'weekly' ? styles.active : ''}`}
            onClick={() => setTimeRange('weekly')}
          >
            주간
          </button>
          <button
            className={`${styles.timeRangeButton} ${timeRange === 'monthly' ? styles.active : ''}`}
            onClick={() => setTimeRange('monthly')}
          >
            월간
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* 카드 그리드 */}
        <div className={styles.cardGrid}>
          {/* Live Space 카드 */}
          <div 
            className={`${styles.statCard} ${selectedCard === 'liveSpace' ? styles.selected : ''}`}
            onClick={() => setSelectedCard('liveSpace')}
          >
            <div className={styles.cardIcon}>🔥</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Live Space</h3>
              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>총 개수</span>
                  <span className={styles.cardStatValue}>{liveSpaces.length}</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>라이브 중</span>
                  <span className={styles.cardStatValue}>{liveCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 신고 카드 */}
          <div 
            className={`${styles.statCard} ${selectedCard === 'reports' ? styles.selected : ''}`}
            onClick={() => setSelectedCard('reports')}
          >
            <div className={styles.cardIcon}>🚨</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>신고 현황</h3>
              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>미처리</span>
                  <span className={`${styles.cardStatValue} ${styles.urgent}`}>
                    {pendingReports.length}
                  </span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>긴급</span>
                  <span className={`${styles.cardStatValue} ${styles.critical}`}>
                    {urgentReports.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 사용자 카드 */}
          <div 
            className={`${styles.statCard} ${selectedCard === 'users' ? styles.selected : ''}`}
            onClick={() => setSelectedCard('users')}
          >
            <div className={styles.cardIcon}>🧑</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>사용자</h3>
              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>가입자</span>
                  <span className={styles.cardStatValue}>{users.length}</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>오늘 가입</span>
                  <span className={styles.cardStatValue}>{todayUsers.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 피드 카드 */}
          <div 
            className={`${styles.statCard} ${selectedCard === 'feeds' ? styles.selected : ''}`}
            onClick={() => setSelectedCard('feeds')}
          >
            <div className={styles.cardIcon}>📝</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>피드</h3>
              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>오늘 작성</span>
                  <span className={styles.cardStatValue}>{todayFeeds.length}</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>신고된</span>
                  <span className={styles.cardStatValue}>{reportedFeeds.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 리워드 카드 */}
          <div 
            className={`${styles.statCard} ${selectedCard === 'rewards' ? styles.selected : ''}`}
            onClick={() => setSelectedCard('rewards')}
          >
            <div className={styles.cardIcon}>🎁</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>리워드</h3>
              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>오늘 교환</span>
                  <span className={styles.cardStatValue}>{todayRewards.length}</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>실패</span>
                  <span className={styles.cardStatValue}>{failedRewards.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 카드의 상세 그래프 */}
        <div className={styles.chartSection}>
          <div className={styles.chartWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>
                {selectedCard === 'liveSpace' && '🔥 Live Space 현황'}
                {selectedCard === 'reports' && '🚨 신고 현황'}
                {selectedCard === 'users' && '🧑 사용자 현황'}
                {selectedCard === 'feeds' && '📝 피드 현황'}
                {selectedCard === 'rewards' && '🎁 리워드 현황'}
              </h2>
            </div>
            <div className={styles.chartContent}>
              {selectedCard === 'liveSpace' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={liveSpaceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#667eea" 
                      strokeWidth={3}
                      name="생성 수"
                      dot={{ fill: '#667eea', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'reports' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reportChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#f44336" name="신고 수" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'users' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={userChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#4caf50" 
                      strokeWidth={3}
                      name="가입 수"
                      dot={{ fill: '#4caf50', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'feeds' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={feedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#ff9800" name="작성 수" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'rewards' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={rewardChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#9c27b0" 
                      strokeWidth={3}
                      name="교환 수"
                      dot={{ fill: '#9c27b0', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

