'use client'

import { useMemo, useState } from 'react'
import { useMockData } from '../context/MockDataContext'
import styles from './Dashboard.module.css'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
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
    comments,
    reports, 
    rewardHistory,
    notices
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

  const liveCount = liveSpaces.filter(ls => ls.status === 'live').length
  const endedCount = liveSpaces.filter(ls => ls.status === 'ended').length

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

  // 가입자 추이 데이터 (가입자 수 막대 그래프 + 성장률 선 그래프)
  const userTrendData = useMemo(() => {
    // 목업 데이터 생성
    const now = new Date()
    let mockData: { date: string; signups: number }[] = []
    
    // 누적 가입자 수를 342320명으로 맞추기 위한 데이터
    // 일간: 하루 평균 약 490명 (342320 / 700일 가정)
    // 주간: 주당 평균 약 3423명
    // 월간: 월 평균 약 57053명
    
    if (timeRange === 'daily') {
      // 최근 7일 목업 데이터
      const dailySignups = [485, 520, 495, 510, 480, 530, 505] // 일별 가입자 수
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        const month = date.getMonth() + 1
        const day = date.getDate()
        const dateKey = `${month}월 ${day}일`
        
        mockData.push({ date: dateKey, signups: dailySignups[6 - i] })
      }
    } else if (timeRange === 'weekly') {
      // 최근 4주 목업 데이터
      const weeklySignups = [3395, 3450, 3410, 3480] // 주별 가입자 수
      for (let i = 3; i >= 0; i--) {
        const date = new Date(now)
        const dayOfWeek = date.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        date.setDate(date.getDate() - daysToMonday - (7 * i))
        const month = date.getMonth() + 1
        const day = date.getDate()
        const dateKey = `${month}월 ${day}일`
        
        mockData.push({ date: dateKey, signups: weeklySignups[3 - i] })
      }
    } else {
      // 최근 6개월 목업 데이터
      const monthlySignups = [56800, 57200, 56950, 57400, 57100, 57670] // 월별 가입자 수
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now)
        date.setMonth(now.getMonth() - i)
        const month = date.getMonth() + 1
        const dateKey = `${month}월`
        
        mockData.push({ date: dateKey, signups: monthlySignups[5 - i] })
      }
    }
    
    // 성장률 계산: 전일/전주/전월 대비 증가율 (%)
    return mockData.map((item, index) => {
      const signups = item.signups
      
      // 이전 기간 가입자 수
      const previousSignups = index > 0 ? mockData[index - 1].signups : signups
      
      // 성장률 계산: (현재 가입자 - 이전 가입자) / 이전 가입자 * 100
      let growthRate = 0
      if (previousSignups > 0) {
        growthRate = ((signups - previousSignups) / previousSignups) * 100
      } else if (signups > 0) {
        growthRate = 100
      }
      
      // 성장률 반올림
      const roundedGrowthRate = Math.round(growthRate)
      
      return {
        date: item.date,
        signups,
        "가입자 수": signups,
        growthRate: roundedGrowthRate,
        "성장률": roundedGrowthRate
      }
    })
  }, [timeRange])

  // 라이브 스페이스 추이 데이터 (라이브 스페이스 생성 수 막대 그래프 + 성장률 선 그래프)
  const liveSpaceTrendData = useMemo(() => {
    // 목업 데이터 생성
    const now = new Date()
    let mockData: { date: string; created: number }[] = []
    
    // 누적 라이브 스페이스 수를 고려한 데이터
    if (timeRange === 'daily') {
      // 최근 7일 목업 데이터
      const dailyCreated = [12, 18, 15, 20, 14, 19, 16] // 일별 생성 수
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        const month = date.getMonth() + 1
        const day = date.getDate()
        const dateKey = `${month}월 ${day}일`
        
        mockData.push({ date: dateKey, created: dailyCreated[6 - i] })
      }
    } else if (timeRange === 'weekly') {
      // 최근 4주 목업 데이터
      const weeklyCreated = [95, 112, 105, 125] // 주별 생성 수
      for (let i = 3; i >= 0; i--) {
        const date = new Date(now)
        const dayOfWeek = date.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        date.setDate(date.getDate() - daysToMonday - (7 * i))
        const month = date.getMonth() + 1
        const day = date.getDate()
        const dateKey = `${month}월 ${day}일`
        
        mockData.push({ date: dateKey, created: weeklyCreated[3 - i] })
      }
    } else {
      // 최근 6개월 목업 데이터
      const monthlyCreated = [420, 510, 480, 550, 495, 580] // 월별 생성 수
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now)
        date.setMonth(now.getMonth() - i)
        const month = date.getMonth() + 1
        const dateKey = `${month}월`
        
        mockData.push({ date: dateKey, created: monthlyCreated[5 - i] })
      }
    }
    
    // 성장률 계산: 전일/전주/전월 대비 증가율 (%)
    return mockData.map((item, index) => {
      const created = item.created
      
      // 이전 기간 생성 수
      const previousCreated = index > 0 ? mockData[index - 1].created : created
      
      // 성장률 계산: (현재 생성 수 - 이전 생성 수) / 이전 생성 수 * 100
      let growthRate = 0
      if (previousCreated > 0) {
        growthRate = ((created - previousCreated) / previousCreated) * 100
      } else if (created > 0) {
        growthRate = 100
      }
      
      // 성장률 반올림
      const roundedGrowthRate = Math.round(growthRate)
      
      return {
        date: item.date,
        created,
        "스페이스 생성": created,
        growthRate: roundedGrowthRate,
        "성장률": roundedGrowthRate
      }
    })
  }, [timeRange])

  // 라이브 스페이스 게시 회원수 계산
  const liveSpacePostUsers = useMemo(() => {
    // 라이브 스페이스를 게시한 회원 ID 집합
    const postedUserIds = new Set(liveSpaces.map(ls => ls.hostId))
    
    // 오늘 게시한 회원
    const todayPostedUserIds = new Set(
      liveSpaces
        .filter(ls => {
          const created = new Date(ls.createdAt)
          return created >= today
        })
        .map(ls => ls.hostId)
    )

    return {
      new: todayPostedUserIds.size,
      total: postedUserIds.size,
      totalUsers: users.length,
      percentage: (postedUserIds.size / users.length) * 100 || 0
    }
  }, [liveSpaces, users, today])

  // 라이브 스페이스 랭킹 계산 (체크인수 + 코멘트 + 댓글 + 피드 게시)
  const liveSpaceRanking = useMemo(() => {
    return liveSpaces.map(ls => {
      // 해당 라이브 스페이스의 피드들
      const spaceFeeds = feeds.filter(f => f.liveSpaceId === ls.id)
      
      // 코멘트 수 (피드의 commentCount 합계)
      const commentCount = spaceFeeds.reduce((sum, feed) => sum + feed.commentCount, 0)
      
      // 댓글 수 (Comment 개수)
      const replyCount = comments.filter(c => 
        spaceFeeds.some(f => f.id === c.feedId)
      ).length
      
      // 점수 계산: 체크인수 + 코멘트 + 댓글 + 피드 게시
      const score = ls.checkInCount + commentCount + replyCount + ls.feedCount

      return {
        ...ls,
        commentCount,
        replyCount,
        score
      }
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // 상위 10개
  }, [liveSpaces, feeds, comments])

  // 인기 피드 랭킹 계산 (좋아요 수 + 댓글 수 기준)
  const popularFeedsRanking = useMemo(() => {
    return feeds.map(feed => {
      // 점수 계산: 좋아요 수 + 댓글 수
      const score = feed.likeCount + feed.commentCount

      return {
        ...feed,
        score
      }
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // 상위 10개
  }, [feeds])

  // 알림 데이터 (최근 공지사항)
  const recentNotices = useMemo(() => {
    return notices
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
  }, [notices])

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
          {/* 신규 가입자 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>신규 가입자</h3>
            </div>
            <div className={styles.kpiValue}>{todayUsers.length.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((todayUsers.length / 342320) * 100, 100)}%`, backgroundColor: '#4caf50' }}
              />
            </div>
          </div>

          {/* 탈퇴자 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>탈퇴자</h3>
            </div>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: '0%', backgroundColor: '#f44336' }}
              />
            </div>
          </div>

          {/* 누적 가입자 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>누적 가입자</h3>
            </div>
            <div className={styles.kpiValue}>342,320</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: '100%', backgroundColor: '#4a9eff' }}
              />
            </div>
          </div>

          {/* 신규 게시물 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>신규 게시물</h3>
            </div>
            <div className={styles.kpiValue}>{todayFeeds.length.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((todayFeeds.length / feeds.length) * 100, 100)}%`, backgroundColor: '#ff9800' }}
              />
            </div>
          </div>

          {/* 라이브 스페이스 게시 회원수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>스페이스 게시 회원수</h3>
            </div>
            <div className={styles.kpiValue}>{liveSpacePostUsers.new.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min(liveSpacePostUsers.percentage, 100)}%`, backgroundColor: '#9c27b0' }}
              />
            </div>
          </div>

          {/* 누적 게시물 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>누적 게시물</h3>
            </div>
            <div className={styles.kpiValue}>{feeds.length.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: '100%', backgroundColor: '#00bcd4' }}
              />
            </div>
          </div>

          {/* 신규 라이브 스페이스 수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>신규 라이브 스페이스 수</h3>
            </div>
            <div className={styles.kpiValue}>{todayLiveSpaces.length.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((todayLiveSpaces.length / liveSpaces.length) * 100, 100)}%`, backgroundColor: '#e91e63' }}
              />
            </div>
          </div>

          {/* 진행 중인 라이브 스페이스 수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>진행 중인 스페이스 수</h3>
            </div>
            <div className={styles.kpiValue}>{liveCount.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((liveCount / liveSpaces.length) * 100, 100)}%`, backgroundColor: '#ff5722' }}
              />
            </div>
          </div>

          {/* 전체 누적 라이브 스페이스 수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>전체 누적 스페이스 수</h3>
            </div>
            <div className={styles.kpiValue}>{liveSpaces.length.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: '100%', backgroundColor: '#673ab7' }}
              />
            </div>
          </div>
        </div>

        {/* 가입자/탈퇴자 추이 그래프 및 알림 - 2열 그리드 */}
        <div className={styles.chartsGrid}>
          {/* 가입자/탈퇴자 추이 그래프 */}
          <div className={styles.chartWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>가입자 추이</h2>
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
              <div className={styles.chartInfo}>
                <div className={styles.chartInfoLeft}>
                  <span className={styles.chartInfoText}>
                    {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준
                  </span>
                  <div className={styles.chartInfoStats}>
                    <div className={styles.chartInfoStatItem}>
                      <span className={styles.chartInfoStatLabel}>오늘 가입자</span>
                      <span className={styles.chartInfoStatValue}>{todayUsers.length.toLocaleString()}</span>
                    </div>
                    <div className={styles.chartInfoStatDivider}></div>
                    <div className={styles.chartInfoStatItem}>
                      <span className={styles.chartInfoStatLabel}>누적 가입자</span>
                      <span className={styles.chartInfoStatValue}>342,320</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.chartContainer}>
                {/* 성장률 선 그래프 (상단) */}
                <div className={styles.growthRateChart}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={userTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
                      <XAxis 
                        dataKey="date" 
                        type="category"
                        stroke="transparent" 
                        fontSize={12}
                        tick={{ fill: 'transparent' }}
                        axisLine={{ stroke: 'transparent' }}
                        padding={{ left: 56, right: 56 }}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                      <Line 
                        type="linear" 
                        dataKey="성장률" 
                        stroke="#4a9eff" 
                        strokeWidth={2}
                        dot={{ fill: '#4a9eff', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* 가입자 수 막대 그래프 (하단) */}
                <div className={styles.mainChart}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={userTrendData} margin={{ top: 0, right: 5, left: 5, bottom: 5 }} barCategoryGap="20%">
                      <XAxis 
                        dataKey="date" 
                        type="category"
                        stroke="#666" 
                        fontSize={12}
                        tick={{ fill: '#666' }}
                        padding={{ left: 0, right: 0 }}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar 
                        dataKey="가입자 수" 
                        fill="#ff9800" 
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 라이브 스페이스 추이 그래프 */}
          <div className={styles.chartWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>라이브 스페이스 추이</h2>
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
              <div className={styles.chartInfo}>
                <div className={styles.chartInfoLeft}>
                  <span className={styles.chartInfoText}>
                    {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준
                  </span>
                  <div className={styles.chartInfoStats}>
                    <div className={styles.chartInfoStatItem}>
                      <span className={styles.chartInfoStatLabel}>오늘 생성</span>
                      <span className={styles.chartInfoStatValue}>{todayLiveSpaces.length.toLocaleString()}</span>
                    </div>
                    <div className={styles.chartInfoStatDivider}></div>
                    <div className={styles.chartInfoStatItem}>
                      <span className={styles.chartInfoStatLabel}>전체</span>
                      <span className={styles.chartInfoStatValue}>1,002,423</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.chartContainer}>
                {/* 성장률 선 그래프 (상단) */}
                <div className={styles.growthRateChart}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={liveSpaceTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
                      <XAxis 
                        dataKey="date" 
                        type="category"
                        stroke="transparent" 
                        fontSize={12}
                        tick={{ fill: 'transparent' }}
                        axisLine={{ stroke: 'transparent' }}
                        padding={{ left: 56, right: 56 }}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                      <Line 
                        type="linear" 
                        dataKey="성장률" 
                        stroke="#4caf50" 
                        strokeWidth={2}
                        dot={{ fill: '#4caf50', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* 생성 수 막대 그래프 (하단) */}
                <div className={styles.mainChart}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={liveSpaceTrendData} margin={{ top: 0, right: 5, left: 5, bottom: 5 }} barCategoryGap="20%">
                      <XAxis 
                        dataKey="date" 
                        type="category"
                        stroke="#666" 
                        fontSize={12}
                        tick={{ fill: '#666' }}
                        padding={{ left: 0, right: 0 }}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar 
                        dataKey="스페이스 생성" 
                        fill="#4a9eff" 
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 인기 라이브 스페이스 및 인기 피드 */}
        <div className={styles.bottomSection}>
          {/* 인기 라이브 스페이스 */}
          <div className={styles.rankingWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>인기 라이브 스페이스</h2>
              <span className={styles.rankingSubtitle}>
                체크인수+코멘트+댓글+피드 게시 기준
              </span>
            </div>
            <div className={styles.rankingTable}>
              <table>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>제목</th>
                    <th>호스트</th>
                    <th>체크인</th>
                    <th>코멘트</th>
                    <th>댓글</th>
                    <th>피드</th>
                    <th>총점</th>
                  </tr>
                </thead>
                <tbody>
                  {liveSpaceRanking.map((ls, index) => (
                    <tr key={ls.id} className={ls.reportedCount > 0 ? styles.hasIssue : ''}>
                      <td>{index + 1}</td>
                      <td className={styles.rankingTitle}>
                        {ls.title || '(제목 없음)'}
                        {ls.reportedCount > 0 && (
                          <span className={styles.issueBadge}>이슈</span>
                        )}
                      </td>
                      <td>{ls.hostNickname}</td>
                      <td>{ls.checkInCount}</td>
                      <td>{ls.commentCount}</td>
                      <td>{ls.replyCount}</td>
                      <td>{ls.feedCount}</td>
                      <td className={styles.totalScore}>{ls.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 인기 피드 */}
          <div className={styles.rankingWidget}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>인기 피드</h2>
              <span className={styles.rankingSubtitle}>
                좋아요+댓글 기준
              </span>
            </div>
            <div className={styles.rankingTable}>
              <table>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>내용</th>
                    <th>작성자</th>
                    <th>라이브 스페이스</th>
                    <th>좋아요</th>
                    <th>댓글</th>
                    <th>총점</th>
                  </tr>
                </thead>
                <tbody>
                  {popularFeedsRanking.map((feed, index) => (
                    <tr key={feed.id} className={feed.reportedCount > 0 ? styles.hasIssue : ''}>
                      <td>{index + 1}</td>
                      <td className={styles.rankingTitle}>
                        {feed.content.length > 30 ? `${feed.content.substring(0, 30)}...` : feed.content}
                        {feed.reportedCount > 0 && (
                          <span className={styles.issueBadge}>이슈</span>
                        )}
                      </td>
                      <td>{feed.authorNickname}</td>
                      <td>{feed.liveSpaceTitle}</td>
                      <td>{feed.likeCount}</td>
                      <td>{feed.commentCount}</td>
                      <td className={styles.totalScore}>{feed.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

