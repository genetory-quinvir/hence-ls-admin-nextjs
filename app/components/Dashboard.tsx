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

  // 이전 기간 데이터 (비교용)
  const lastPeriodStart = new Date(today)
  lastPeriodStart.setDate(today.getDate() - 7)
  const lastPeriodEnd = new Date(today)
  
  const lastPeriodLiveSpaces = liveSpaces.filter(ls => {
    const created = new Date(ls.createdAt)
    return created >= lastPeriodStart && created < lastPeriodEnd
  })
  
  const lastPeriodUsers = users.filter(u => {
    const created = new Date(u.createdAt)
    return created >= lastPeriodStart && created < lastPeriodEnd
  })
  
  const lastPeriodFeeds = feeds.filter(f => {
    const created = new Date(f.createdAt)
    return created >= lastPeriodStart && created < lastPeriodEnd
  })
  
  const lastPeriodReports = reports.filter(r => {
    const created = new Date(r.createdAt)
    return created >= lastPeriodStart && created < lastPeriodEnd
  })

  // 증감률 계산 함수
  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change), isPositive: change >= 0 }
  }

  // KPI 데이터
  const kpiData = useMemo(() => {
    const liveSpaceChange = calculateChange(liveSpaces.length, lastPeriodLiveSpaces.length)
    const userChange = calculateChange(users.length, lastPeriodUsers.length)
    const feedChange = calculateChange(feeds.length, lastPeriodFeeds.length)
    const reportChange = calculateChange(reports.length, lastPeriodReports.length)
    
    return {
      liveSpaces: {
        current: liveSpaces.length,
        previous: lastPeriodLiveSpaces.length,
        change: liveSpaceChange,
        percentage: (liveCount / liveSpaces.length) * 100 || 0
      },
      users: {
        current: users.length,
        previous: lastPeriodUsers.length,
        change: userChange,
        percentage: (todayUsers.length / users.length) * 100 || 0
      },
      feeds: {
        current: feeds.length,
        previous: lastPeriodFeeds.length,
        change: feedChange,
        percentage: (todayFeeds.length / feeds.length) * 100 || 0
      },
      reports: {
        current: reports.length,
        previous: lastPeriodReports.length,
        change: reportChange,
        percentage: (pendingReports.length / reports.length) * 100 || 0
      }
    }
  }, [liveSpaces, users, feeds, reports, liveCount, todayUsers, todayFeeds, pendingReports, lastPeriodLiveSpaces, lastPeriodUsers, lastPeriodFeeds, lastPeriodReports])

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
          <h1 className={styles.title}>대시보드</h1>
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
        {/* KPI 카드 그리드 */}
        <div className={styles.kpiGrid}>
          {/* Live Space KPI 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>전체 라이브 스페이스</h3>
            </div>
            <div className={styles.kpiValue}>{kpiData.liveSpaces.current.toLocaleString()}</div>
            <div className={styles.kpiChange}>
              <span className={`${styles.changeIndicator} ${kpiData.liveSpaces.change.isPositive ? styles.positive : styles.negative}`}>
                {kpiData.liveSpaces.change.isPositive ? '↑' : '↓'}
                {kpiData.liveSpaces.change.value.toFixed(1)}%
              </span>
              <span className={styles.changeText}>vs 이전 기간 {kpiData.liveSpaces.previous}</span>
            </div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min(kpiData.liveSpaces.percentage, 100)}%`, backgroundColor: '#4a9eff' }}
              />
            </div>
          </div>

          {/* Users KPI 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>전체 사용자</h3>
            </div>
            <div className={styles.kpiValue}>{kpiData.users.current.toLocaleString()}</div>
            <div className={styles.kpiChange}>
              <span className={`${styles.changeIndicator} ${kpiData.users.change.isPositive ? styles.positive : styles.negative}`}>
                {kpiData.users.change.isPositive ? '↑' : '↓'}
                {kpiData.users.change.value.toFixed(1)}%
              </span>
              <span className={styles.changeText}>vs 이전 기간 {kpiData.users.previous}</span>
            </div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min(kpiData.users.percentage, 100)}%`, backgroundColor: '#4caf50' }}
              />
            </div>
          </div>

          {/* Feeds KPI 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>전체 피드</h3>
            </div>
            <div className={styles.kpiValue}>{kpiData.feeds.current.toLocaleString()}</div>
            <div className={styles.kpiChange}>
              <span className={`${styles.changeIndicator} ${kpiData.feeds.change.isPositive ? styles.positive : styles.negative}`}>
                {kpiData.feeds.change.isPositive ? '↑' : '↓'}
                {kpiData.feeds.change.value.toFixed(1)}%
              </span>
              <span className={styles.changeText}>vs 이전 기간 {kpiData.feeds.previous}</span>
            </div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min(kpiData.feeds.percentage, 100)}%`, backgroundColor: '#ff9800' }}
              />
            </div>
          </div>

          {/* Reports KPI 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>대기 중인 신고</h3>
            </div>
            <div className={styles.kpiValue}>{pendingReports.length.toLocaleString()}</div>
            <div className={styles.kpiChange}>
              <span className={`${styles.changeIndicator} ${kpiData.reports.change.isPositive ? styles.positive : styles.negative}`}>
                {kpiData.reports.change.isPositive ? '↑' : '↓'}
                {kpiData.reports.change.value.toFixed(1)}%
              </span>
              <span className={styles.changeText}>vs 이전 기간 {kpiData.reports.previous}</span>
            </div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min(kpiData.reports.percentage, 100)}%`, backgroundColor: '#f44336' }}
              />
            </div>
          </div>
        </div>

        {/* 차트 섹션 - 2열 그리드 */}
        <div className={styles.chartsGrid}>
          {/* 메인 차트 */}
          <div className={styles.chartWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>
                {selectedCard === 'liveSpace' && '라이브 스페이스 추이'}
                {selectedCard === 'reports' && '신고 추이'}
                {selectedCard === 'users' && '사용자 추이'}
                {selectedCard === 'feeds' && '피드 추이'}
                {selectedCard === 'rewards' && '리워드 추이'}
              </h2>
              <div className={styles.chartTimeRange}>
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
            <div className={styles.chartContent}>
              {selectedCard === 'liveSpace' && (
                <ResponsiveContainer width="100%" height={300}>
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
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#4a9eff" 
                      strokeWidth={3}
                      name="생성 수"
                      dot={{ fill: '#4a9eff', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'reports' && (
                <ResponsiveContainer width="100%" height={300}>
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
                    <Bar dataKey="count" fill="#f44336" name="신고 수" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'users' && (
                <ResponsiveContainer width="100%" height={300}>
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
                <ResponsiveContainer width="100%" height={300}>
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
                    <Bar dataKey="count" fill="#ff9800" name="작성 수" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {selectedCard === 'rewards' && (
                <ResponsiveContainer width="100%" height={300}>
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

          {/* 카테고리별 분포 차트 */}
          <div className={styles.chartWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>빠른 통계</h2>
            </div>
            <div className={styles.quickStatsGrid}>
              <div 
                className={`${styles.quickStatCard} ${selectedCard === 'liveSpace' ? styles.selected : ''}`}
                onClick={() => setSelectedCard('liveSpace')}
              >
                <div className={styles.quickStatIcon}>🔥</div>
                <div className={styles.quickStatInfo}>
                  <div className={styles.quickStatLabel}>라이브 스페이스</div>
                  <div className={styles.quickStatValue}>{liveCount} 진행 중</div>
                </div>
              </div>
              <div 
                className={`${styles.quickStatCard} ${selectedCard === 'users' ? styles.selected : ''}`}
                onClick={() => setSelectedCard('users')}
              >
                <div className={styles.quickStatIcon}>🧑</div>
                <div className={styles.quickStatInfo}>
                  <div className={styles.quickStatLabel}>신규 사용자</div>
                  <div className={styles.quickStatValue}>오늘 {todayUsers.length}명</div>
                </div>
              </div>
              <div 
                className={`${styles.quickStatCard} ${selectedCard === 'feeds' ? styles.selected : ''}`}
                onClick={() => setSelectedCard('feeds')}
              >
                <div className={styles.quickStatIcon}>📝</div>
                <div className={styles.quickStatInfo}>
                  <div className={styles.quickStatLabel}>신규 피드</div>
                  <div className={styles.quickStatValue}>오늘 {todayFeeds.length}개</div>
                </div>
              </div>
              <div 
                className={`${styles.quickStatCard} ${selectedCard === 'reports' ? styles.selected : ''}`}
                onClick={() => setSelectedCard('reports')}
              >
                <div className={styles.quickStatIcon}>🚨</div>
                <div className={styles.quickStatInfo}>
                  <div className={styles.quickStatLabel}>긴급 신고</div>
                  <div className={styles.quickStatValue}>{urgentReports.length} 대기 중</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

