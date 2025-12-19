'use client'

import { useMemo, useState, useEffect } from 'react'
import { useMockData } from '../context/MockDataContext'
import { getDashboardSummary, DashboardSummary } from '../lib/api'
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
  ResponsiveContainer,
  LabelList
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
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // API에서 대시보드 데이터 불러오기
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      setLoadError(null)
      
      try {
        // period와 range 매핑: timeRange를 API에 맞게 변환
        const now = new Date()
        let periodFrom: Date
        let periodTo: Date
        let range: string
        
        if (timeRange === 'daily') {
          // 최근 7일
          periodFrom = new Date(now)
          periodFrom.setDate(now.getDate() - 6) // 7일 전부터
          periodFrom.setHours(0, 0, 0, 0)
          periodTo = new Date(now)
          periodTo.setHours(23, 59, 59, 599)
          range = '7d' // 7일
        } else if (timeRange === 'weekly') {
          // 최근 4주
          periodFrom = new Date(now)
          periodFrom.setDate(now.getDate() - 27) // 28일 전부터
          periodFrom.setHours(0, 0, 0, 0)
          periodTo = new Date(now)
          periodTo.setHours(23, 59, 59, 599)
          range = '4w' // 4주
        } else {
          // 최근 6개월
          periodFrom = new Date(now)
          periodFrom.setMonth(now.getMonth() - 5) // 6개월 전부터
          periodFrom.setDate(1) // 해당 월의 1일
          periodFrom.setHours(0, 0, 0, 0)
          periodTo = new Date(now)
          periodTo.setHours(23, 59, 59, 599)
          range = '6m' // 6개월
        }
        
        // ISO 형식으로 변환
        const periodFromStr = periodFrom.toISOString().slice(0, 19) // '2025-11-10T00:00:00'
        const periodToStr = periodTo.toISOString().slice(0, 19) + '.599' // '2025-12-10T23:59:59.599'
        
        const response = await getDashboardSummary(periodFromStr, periodToStr, range)
        
        if (response.success && response.data) {
          setDashboardData(response.data)
        } else {
          setLoadError(response.error || '대시보드 데이터를 불러오는데 실패했습니다.')
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '대시보드 데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
  }, [timeRange]) // timeRange가 변경되면 다시 로드

  // API 데이터에서 값 가져오기, 없으면 Mock 데이터 사용
  const freshmen = dashboardData?.users?.freshmen ?? 0 // 신규 가입자
  const withdrawalUsers = dashboardData?.users?.withdrawalUsers ?? 0 // 탈퇴자
  const cumulativeUsers = dashboardData?.users?.cumulativeUsers ?? users.length // 누적 가입자
  const newFeeds = dashboardData?.feeds?.newFeeds ?? 0 // 신규 게시물
  const cumulativeFeeds = dashboardData?.feeds?.cumulativeFeeds ?? feeds.length // 누적 게시물
  const memberCount = dashboardData?.spaces?.memberCount ?? 0 // 스페이스 게시 회원수
  const newSpace = dashboardData?.spaces?.newSpace ?? 0 // 신규 라이브 스페이스 수
  const liveSpace = dashboardData?.spaces?.liveSpace ?? 0 // 진행중인 스페이스 수
  const cumulativeSpace = dashboardData?.spaces?.cumulativeSpace ?? liveSpaces.length // 전체 누적 스페이스 수

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

  // KPI 데이터: API 데이터 우선 사용
  const kpiData = useMemo(() => {
    // API 데이터가 있으면 사용
    if (dashboardData) {
      // API에서는 trend 데이터를 통해 증감률을 계산할 수 있지만, 여기서는 기본값 사용
      // 실제로는 trend.today와 이전 기간의 total을 비교해야 함
      return {
        liveSpaces: {
          current: cumulativeSpace, // 전체 누적 스페이스 수
          previous: cumulativeSpace - newSpace, // 추정값 (이전 = 현재 - 신규)
          change: { value: 0, isPositive: true }, // API trend 데이터로 계산 필요
          percentage: (liveSpace / cumulativeSpace) * 100 || 0 // 진행중인 스페이스 비율
        },
        users: {
          current: cumulativeUsers, // 누적 가입자
          previous: cumulativeUsers - freshmen, // 추정값 (이전 = 현재 - 신규)
          change: { value: 0, isPositive: true }, // API trend 데이터로 계산 필요
          percentage: (freshmen / cumulativeUsers) * 100 || 0 // 신규 가입자 비율
        },
        feeds: {
          current: cumulativeFeeds, // 누적 게시물
          previous: cumulativeFeeds - newFeeds, // 추정값 (이전 = 현재 - 신규)
          change: { value: 0, isPositive: true }, // API trend 데이터로 계산 필요
          percentage: (newFeeds / cumulativeFeeds) * 100 || 0 // 신규 게시물 비율
        },
        reports: {
          current: reports.length, // Mock 데이터 유지
          previous: lastPeriodReports.length,
          change: calculateChange(reports.length, lastPeriodReports.length),
          percentage: (pendingReports.length / reports.length) * 100 || 0
        }
      }
    }
    
    // API 데이터가 없으면 기존 로직 (Mock 데이터 기반)
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
  }, [dashboardData, cumulativeSpace, newSpace, liveSpace, cumulativeUsers, freshmen, cumulativeFeeds, newFeeds, liveSpaces, users, feeds, reports, liveCount, todayUsers, todayFeeds, pendingReports, lastPeriodLiveSpaces, lastPeriodUsers, lastPeriodFeeds, lastPeriodReports])

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
    // API 데이터가 있으면 사용
    if (dashboardData?.users?.trend?.points && dashboardData.users.trend.points.length > 0) {
      const trendPoints = dashboardData.users.trend.points
      
      // 성장률 계산: 전일/전주/전월 대비 증가율 (%)
      return trendPoints.map((point, index) => {
        const signups = point.count || 0
        const label = point.label || ''
        
        // 이전 기간 가입자 수
        const previousSignups = index > 0 ? (trendPoints[index - 1].count || 0) : signups
        
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
          date: label,
          signups,
          "가입자 수": signups,
          growthRate: roundedGrowthRate,
          "성장률": roundedGrowthRate
        }
      })
    }
    
    // API 데이터가 없으면 기존 Mock 데이터 사용
    const now = new Date()
    let mockData: { date: string; signups: number }[] = []
    
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
  }, [dashboardData, timeRange])

  // 라이브 스페이스 추이 데이터 (라이브 스페이스 생성 수 막대 그래프 + 성장률 선 그래프)
  const liveSpaceTrendData = useMemo(() => {
    // API 데이터가 있으면 사용
    if (dashboardData?.spaces?.trend?.points && dashboardData.spaces.trend.points.length > 0) {
      const trendPoints = dashboardData.spaces.trend.points
      
      // 성장률 계산: 전일/전주/전월 대비 증가율 (%)
      return trendPoints.map((point, index) => {
        const created = point.count || 0
        const label = point.label || ''
        
        // 이전 기간 생성 수
        const previousCreated = index > 0 ? (trendPoints[index - 1].count || 0) : created
        
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
          date: label,
          created,
          "스페이스 생성": created,
          growthRate: roundedGrowthRate,
          "성장률": roundedGrowthRate
        }
      })
    }
    
    // API 데이터가 없으면 기존 Mock 데이터 사용
    const now = new Date()
    let mockData: { date: string; created: number }[] = []
    
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
  }, [dashboardData, timeRange])

  // 라이브 스페이스 게시 회원수: API 데이터 사용, 없으면 기존 로직 사용
  const liveSpacePostUsers = useMemo(() => {
    // API 데이터가 있으면 사용
    if (dashboardData?.spaces?.memberCount !== undefined) {
      return {
        new: newSpace, // 신규 라이브 스페이스 수
        total: memberCount, // 스페이스 게시 회원수
        totalUsers: cumulativeUsers, // 누적 가입자
        percentage: (memberCount / cumulativeUsers) * 100 || 0
      }
    }
    
    // 없으면 기존 로직 (Mock 데이터 기반)
    const postedUserIds = new Set(liveSpaces.map(ls => ls.hostId))
    
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
  }, [dashboardData, memberCount, newSpace, cumulativeUsers, liveSpaces, users, today])

  // 라이브 스페이스 랭킹: API에서 받은 popularSpace 사용, 없으면 기존 로직 사용
  const liveSpaceRanking = useMemo(() => {
    // API에서 받은 인기 라이브 스페이스가 있으면 사용 (popularSpace 필드명 주의)
    if (dashboardData?.spaces?.popularSpace && dashboardData.spaces.popularSpace.length > 0) {
      return dashboardData.spaces.popularSpace.slice(0, 10)
    }
    
    // 없으면 기존 로직 (Mock 데이터 기반)
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
  }, [dashboardData, liveSpaces, feeds, comments])

  // 인기 피드 랭킹: API에서 받은 popularFeeds 사용, 없으면 기존 로직 사용
  const popularFeedsRanking = useMemo(() => {
    // API에서 받은 인기 피드가 있으면 사용
    if (dashboardData?.feeds?.popularFeeds && dashboardData.feeds.popularFeeds.length > 0) {
      return dashboardData.feeds.popularFeeds.slice(0, 10)
    }
    
    // 없으면 기존 로직 (Mock 데이터 기반)
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
  }, [dashboardData, feeds])

  // 알림 데이터 (최근 공지사항)
  const recentNotices = useMemo(() => {
    return notices
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
  }, [notices])

  // 로딩 중이면 빈 화면 표시
  if (isLoading) {
    return null
  }

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
            <div className={styles.kpiValue}>{freshmen.toLocaleString()}</div>
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
            <div className={styles.kpiValue}>{withdrawalUsers.toLocaleString()}</div>
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
            <div className={styles.kpiValue}>{cumulativeUsers.toLocaleString()}</div>
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
            <div className={styles.kpiValue}>{newFeeds.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((newFeeds / cumulativeFeeds) * 100, 100)}%`, backgroundColor: '#ff9800' }}
              />
            </div>
          </div>

          {/* 누적 게시물 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>누적 게시물</h3>
            </div>
            <div className={styles.kpiValue}>{cumulativeFeeds.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: '100%', backgroundColor: '#00bcd4' }}
              />
            </div>
          </div>

          {/* 라이브 스페이스 게시 회원수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>스페이스 게시 회원</h3>
            </div>
            <div className={styles.kpiValue}>{memberCount.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min(liveSpacePostUsers.percentage, 100)}%`, backgroundColor: '#9c27b0' }}
              />
            </div>
          </div>

          {/* 신규 라이브 스페이스 수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>신규 스페이스</h3>
            </div>
            <div className={styles.kpiValue}>{newSpace.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((newSpace / cumulativeSpace) * 100, 100)}%`, backgroundColor: '#e91e63' }}
              />
            </div>
          </div>

          {/* 진행 중인 라이브 스페이스 수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>현재 진행중 스페이스</h3>
            </div>
            <div className={styles.kpiValue}>{liveSpace.toLocaleString()}</div>
            <div className={styles.kpiProgress}>
              <div 
                className={styles.kpiProgressBar} 
                style={{ width: `${Math.min((liveSpace / cumulativeSpace) * 100, 100)}%`, backgroundColor: '#ff5722' }}
              />
            </div>
          </div>

          {/* 전체 누적 라이브 스페이스 수 카드 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <h3 className={styles.kpiTitle}>전체 누적 스페이스</h3>
            </div>
            <div className={styles.kpiValue}>{cumulativeSpace.toLocaleString()}</div>
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
                      <span className={styles.chartInfoStatValue}>{freshmen.toLocaleString()}</span>
                    </div>
                    <div className={styles.chartInfoStatDivider}></div>
                    <div className={styles.chartInfoStatItem}>
                      <span className={styles.chartInfoStatLabel}>누적 가입자</span>
                      <span className={styles.chartInfoStatValue}>{cumulativeUsers.toLocaleString()}</span>
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
                    <BarChart data={userTrendData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }} barCategoryGap="20%">
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
                      >
                        <LabelList 
                          dataKey="가입자 수" 
                          position="top" 
                          style={{ fill: '#666', fontSize: '12px', fontWeight: '500' }}
                          formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
                        />
                      </Bar>
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
                      <span className={styles.chartInfoStatValue}>{newSpace.toLocaleString()}</span>
                    </div>
                    <div className={styles.chartInfoStatDivider}></div>
                    <div className={styles.chartInfoStatItem}>
                      <span className={styles.chartInfoStatLabel}>전체</span>
                      <span className={styles.chartInfoStatValue}>{cumulativeSpace.toLocaleString()}</span>
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
                    <BarChart data={liveSpaceTrendData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }} barCategoryGap="20%">
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
                      >
                        <LabelList 
                          dataKey="스페이스 생성" 
                          position="top" 
                          style={{ fill: '#666', fontSize: '12px', fontWeight: '500' }}
                          formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
                        />
                      </Bar>
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
                  {liveSpaceRanking.map((ls, index) => {
                    // API 응답 구조 확인: PopularSpace 타입인지 확인
                    const isPopularSpace = 'rank' in ls && 'participantCount' in ls
                    
                    if (isPopularSpace) {
                      // API 응답 (PopularSpace 타입)
                      const space = ls as any
                      const title = space.title || '(제목 없음)'
                      const hostNickname = space.nickname || '알 수 없음'
                      const participantCount = space.participantCount || 0
                      const feedCommentCount = space.feedCommentCount || 0
                      const feedCount = space.feedCount || 0
                      const score = space.score || 0
                      const displayRank = space.rank || index + 1
                      
                      return (
                        <tr key={space.id || index}>
                          <td>{displayRank}</td>
                          <td className={styles.rankingTitle}>{title}</td>
                          <td>{hostNickname}</td>
                          <td>{participantCount}</td>
                          <td>{feedCommentCount}</td>
                          <td>{0}</td>
                          <td>{feedCount}</td>
                          <td className={styles.totalScore}>{score}</td>
                        </tr>
                      )
                    } else {
                      // Mock 데이터 구조
                      const space = ls as any
                      const title = space.title || '(제목 없음)'
                      const hostNickname = space.hostNickname || '알 수 없음'
                      const checkInCount = space.checkInCount || 0
                      const commentCount = space.commentCount || 0
                      const replyCount = space.replyCount || 0
                      const feedCount = space.feedCount || 0
                      const score = space.score || (checkInCount + commentCount + replyCount + feedCount)
                      
                      return (
                        <tr key={space.id || index}>
                          <td>{index + 1}</td>
                          <td className={styles.rankingTitle}>{title}</td>
                          <td>{hostNickname}</td>
                          <td>{checkInCount}</td>
                          <td>{commentCount}</td>
                          <td>{replyCount}</td>
                          <td>{feedCount}</td>
                          <td className={styles.totalScore}>{score}</td>
                        </tr>
                      )
                    }
                  })}
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
                  {popularFeedsRanking.map((feed, index) => {
                    // API 응답 구조 확인: PopularFeed 타입인지 확인
                    const isPopularFeed = 'rank' in feed && 'nickname' in feed
                    
                    if (isPopularFeed) {
                      // API 응답 (PopularFeed 타입): title은 라이브 스페이스 제목
                      const feedData = feed as any
                      const title = feedData.title || '(제목 없음)'
                      const authorNickname = feedData.nickname || '알 수 없음'
                      const likeCount = feedData.likeCount || 0
                      const commentCount = feedData.commentCount || 0
                      const score = feedData.score || 0
                      const displayRank = feedData.rank || index + 1
                      
                      return (
                        <tr key={feedData.id || index}>
                          <td>{displayRank}</td>
                          <td className={styles.rankingTitle}>
                            {title.length > 30 ? `${title.substring(0, 30)}...` : title}
                          </td>
                          <td>{authorNickname}</td>
                          <td>{title}</td>
                          <td>{likeCount}</td>
                          <td>{commentCount}</td>
                          <td className={styles.totalScore}>{score}</td>
                        </tr>
                      )
                    } else {
                      // Mock 데이터 구조
                      const feedData = feed as any
                      const content = feedData.content || feedData.text || '(내용 없음)'
                      const authorNickname = feedData.authorNickname || '알 수 없음'
                      const liveSpaceTitle = feedData.liveSpaceTitle || '-'
                      const likeCount = feedData.likeCount || 0
                      const commentCount = feedData.commentCount || 0
                      const reportedCount = feedData.reportedCount || 0
                      const score = feedData.score || (likeCount + commentCount)
                      
                      return (
                        <tr key={feedData.id || index} className={reportedCount > 0 ? styles.hasIssue : ''}>
                          <td>{index + 1}</td>
                          <td className={styles.rankingTitle}>
                            {content.length > 30 ? `${content.substring(0, 30)}...` : content}
                            {reportedCount > 0 && (
                              <span className={styles.issueBadge}>이슈</span>
                            )}
                          </td>
                          <td>{authorNickname}</td>
                          <td>{liveSpaceTitle}</td>
                          <td>{likeCount}</td>
                          <td>{commentCount}</td>
                          <td className={styles.totalScore}>{score}</td>
                        </tr>
                      )
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

