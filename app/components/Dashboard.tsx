'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminDashboardTrendItem,
  AdminDashboardTrendRange,
  getAdminDashboard,
  getAdminDashboardPlacesTrend,
  getAdminDashboardUsersTrend,
} from '../lib/api'
import styles from './Dashboard.module.css'

type KpiItem = {
  keyPath: string
  label: string
  value: number
}

function normalizeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function isObjectLike(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getNumberAtPath(source: Record<string, any> | null, paths: string[]): number | null {
  if (!source) return null

  for (const path of paths) {
    const value = path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source)
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

function findNumberByAliases(source: Record<string, any> | null, aliases: string[], maxDepth = 4): number | null {
  if (!source) return null

  const aliasSet = new Set(aliases.map(normalizeKey))

  const walk = (obj: Record<string, any>, depth: number): number | null => {
    if (depth > maxDepth) return null

    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = normalizeKey(key)

      if (typeof value === 'number' && Number.isFinite(value) && aliasSet.has(normalizedKey)) {
        return value
      }

      if (isObjectLike(value)) {
        const nested = walk(value, depth + 1)
        if (nested !== null) return nested
      }
    }

    return null
  }

  return walk(source, 0)
}

function collectFixedKpis(source: Record<string, any> | null): KpiItem[] {
  const configs: Array<{ label: string; keyPath: string; paths: string[]; aliases: string[] }> = [
    {
      label: '신규 사용자',
      keyPath: 'users.freshmen',
      paths: ['metrics.newUsers', 'users.freshmen', 'metrics.users.freshmen', 'users.newUsers'],
      aliases: ['freshmen', 'newUsers', 'newUserCount', 'signupUsers', 'signUpUsers'],
    },
    {
      label: '탈퇴한 사용자',
      keyPath: 'users.withdrawalUsers',
      paths: ['metrics.withdrawnUsers', 'users.withdrawalUsers', 'metrics.users.withdrawalUsers', 'metrics.withdrawalUsers'],
      aliases: ['withdrawalUsers', 'withdrawnUsers', 'deletedUsers', 'deactivatedUsers'],
    },
    {
      label: '전체 누적 사용자',
      keyPath: 'users.cumulativeUsers',
      paths: ['metrics.totalUsers', 'users.cumulativeUsers', 'metrics.users.cumulativeUsers', 'metrics.cumulativeUsers'],
      aliases: ['cumulativeUsers', 'totalUsers', 'userTotal', 'totalUserCount'],
    },
    {
      label: '신규 장소',
      keyPath: 'spaces.newSpace',
      paths: [
        'metrics.newPlaces',
        'spaces.newSpace',
        'metrics.spaces.newSpace',
        'places.newPlaces',
        'places.newPlace',
        'metrics.places.newPlaces',
      ],
      aliases: ['newPlaces', 'newPlace', 'newPlaceCount', 'newSpaces', 'newSpace'],
    },
    {
      label: '전체 누적 장소',
      keyPath: 'spaces.cumulativeSpace',
      paths: [
        'metrics.totalPlaces',
        'spaces.cumulativeSpace',
        'metrics.spaces.cumulativeSpace',
        'places.cumulativePlaces',
        'metrics.cumulativePlaces',
        'places.totalPlaces',
        'metrics.places.cumulativePlaces',
      ],
      aliases: ['cumulativePlaces', 'totalPlaces', 'placeTotal', 'totalPlaceCount', 'cumulativeSpace', 'totalSpaces'],
    },
  ]

  return configs.map((config) => {
    const value = getNumberAtPath(source, config.paths) ?? findNumberByAliases(source, config.aliases)
    return {
      keyPath: config.keyPath,
      label: config.label,
      value: value ?? 0,
    }
  })
}

export default function Dashboard() {
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null)
  const [userTrendRange, setUserTrendRange] = useState<AdminDashboardTrendRange>('4w')
  const [placeTrendRange, setPlaceTrendRange] = useState<AdminDashboardTrendRange>('4w')
  const [userTrend, setUserTrend] = useState<AdminDashboardTrendItem[]>([])
  const [placeTrend, setPlaceTrend] = useState<AdminDashboardTrendItem[]>([])
  const [isUserTrendLoading, setIsUserTrendLoading] = useState(false)
  const [isPlaceTrendLoading, setIsPlaceTrendLoading] = useState(false)
  const [userTrendError, setUserTrendError] = useState<string | null>(null)
  const [placeTrendError, setPlaceTrendError] = useState<string | null>(null)

  const loadDashboard = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getAdminDashboard()
    if (!result.success) {
      setData(null)
      setError(result.error || '대시보드 데이터를 불러오지 못했습니다.')
      setIsLoading(false)
      return
    }

    setData(result.data || {})
    setLastLoadedAt(new Date())
    setIsLoading(false)
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  useEffect(() => {
    const loadUsersTrend = async () => {
      setIsUserTrendLoading(true)
      setUserTrendError(null)
      const result = await getAdminDashboardUsersTrend(userTrendRange)
      if (!result.success) {
        setUserTrend([])
        setUserTrendError(result.error || '사용자 추이 데이터를 불러오지 못했습니다.')
        setIsUserTrendLoading(false)
        return
      }
      setUserTrend(result.data || [])
      setIsUserTrendLoading(false)
    }

    void loadUsersTrend()
  }, [userTrendRange])

  useEffect(() => {
    const loadPlacesTrend = async () => {
      setIsPlaceTrendLoading(true)
      setPlaceTrendError(null)
      const result = await getAdminDashboardPlacesTrend(placeTrendRange)
      if (!result.success) {
        setPlaceTrend([])
        setPlaceTrendError(result.error || '장소 추이 데이터를 불러오지 못했습니다.')
        setIsPlaceTrendLoading(false)
        return
      }
      setPlaceTrend(result.data || [])
      setIsPlaceTrendLoading(false)
    }

    void loadPlacesTrend()
  }, [placeTrendRange])

  const kpis = useMemo(() => collectFixedKpis(data), [data])

  const rangeOptions: Array<{ value: AdminDashboardTrendRange; label: string }> = [
    { value: '1w', label: '1주' },
    { value: '4w', label: '4주' },
    { value: '3m', label: '3개월' },
    { value: '1y', label: '1년' },
  ]

  const TrendChart = ({
    title,
    items,
    range,
    onRangeChange,
    isLoading,
    loadError,
    color,
  }: {
    title: string
    items: AdminDashboardTrendItem[]
    range: AdminDashboardTrendRange
    onRangeChange: (value: AdminDashboardTrendRange) => void
    isLoading: boolean
    loadError: string | null
    color: string
  }) => {
    const maxValue = Math.max(...items.map((item) => item.value || 0), 1)
    const chartHeight = 140

    return (
      <section
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          <select
            value={range}
            onChange={(e) => onRangeChange(e.target.value as AdminDashboardTrendRange)}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '6px 10px',
              background: '#fff',
              fontSize: 13,
            }}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loadError && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              background: '#fff1f1',
              border: '1px solid #f2c4c4',
              color: '#a12626',
              fontSize: 13,
            }}
          >
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>불러오는 중...</div>
        ) : items.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>표시할 데이터가 없습니다.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
              gap: 10,
              alignItems: 'start',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: chartHeight - 1,
                height: 1,
                pointerEvents: 'none',
                zIndex: 1,
                background: '#d1d5db',
              }}
            />
            {items.map((item, index) => {
              const height = Math.max(8, Math.round((item.value / maxValue) * chartHeight))
              return (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateRows: `${chartHeight}px auto auto`,
                    alignItems: 'start',
                    justifyItems: 'center',
                    gap: 8,
                    minWidth: 0,
                  }}
                  title={`${item.label}: ${item.value.toLocaleString('ko-KR')}`}
                >
                  <div
                    style={{
                      alignSelf: 'start',
                      width: '100%',
                      height: chartHeight,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'end',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 42,
                        height,
                        borderRadius: '8px 8px 0 0',
                        background: color,
                        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.18)',
                        position: 'relative',
                        zIndex: 0,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                    {item.value.toLocaleString('ko-KR')}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  return (
    <div className={styles.dashboard}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '24px 32px 8px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>대시보드</h1>
          {lastLoadedAt && (
            <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 12 }}>
              마지막 갱신: {lastLoadedAt.toLocaleString('ko-KR')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={isLoading}
          style={{
            border: '1px solid #d0d7de',
            background: '#fff',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      <div style={{ padding: '8px 32px 32px', display: 'grid', gap: 16 }}>
        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: '#fff1f1',
              border: '1px solid #f2c4c4',
              color: '#a12626',
            }}
          >
            {error}
          </div>
        )}

        {isLoading && !data && <div>대시보드 데이터를 불러오는 중...</div>}

        {!isLoading && !error && (
          <>
            <section
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>핵심 지표</h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {kpis.map((item) => (
                  <div
                    key={item.keyPath}
                    style={{
                      border: '1px solid #e8edf3',
                      borderRadius: 10,
                      padding: 12,
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                    }}
                  >
                    <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>{item.label}</div>
                    <div style={{ color: '#111827', fontSize: 22, fontWeight: 700 }}>
                      {item.value.toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                gap: 16,
              }}
            >
              <TrendChart
                title="사용자 추이"
                items={userTrend}
                range={userTrendRange}
                onRangeChange={setUserTrendRange}
                isLoading={isUserTrendLoading}
                loadError={userTrendError}
                color="linear-gradient(180deg, #4f46e5 0%, #6366f1 100%)"
              />

              <TrendChart
                title="장소 추이"
                items={placeTrend}
                range={placeTrendRange}
                onRangeChange={setPlaceTrendRange}
                isLoading={isPlaceTrendLoading}
                loadError={placeTrendError}
                color="linear-gradient(180deg, #059669 0%, #10b981 100%)"
              />
            </div>

          </>
        )}
      </div>
    </div>
  )
}
