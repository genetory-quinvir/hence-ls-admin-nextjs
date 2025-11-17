'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  LiveSpace,
  User,
  Feed,
  Comment,
  Report,
  Reward,
  RewardHistory,
  PhoneAuthLog,
  AppVersion,
  Notice,
  FAQ,
  Operator,
  PermissionLog,
  generateMockLiveSpaces,
  generateMockUsers,
  generateMockFeeds,
  generateMockComments,
  generateMockReports,
  generateMockRewards,
  generateMockRewardHistory,
  generateMockPhoneAuthLogs,
  generateMockAppVersions,
  generateMockNotices,
  generateMockFAQs,
  generateMockOperators,
  generateMockPermissionLogs,
} from '../data/mockData'

interface MockDataContextType {
  liveSpaces: LiveSpace[]
  users: User[]
  feeds: Feed[]
  comments: Comment[]
  reports: Report[]
  rewards: Reward[]
  rewardHistory: RewardHistory[]
  phoneAuthLogs: PhoneAuthLog[]
  appVersions: AppVersion[]
  notices: Notice[]
  faqs: FAQ[]
  operators: Operator[]
  permissionLogs: PermissionLog[]
  updateLiveSpaces: (updater: (prev: LiveSpace[]) => LiveSpace[]) => void
  updateUsers: (updater: (prev: User[]) => User[]) => void
  updateFeeds: (updater: (prev: Feed[]) => Feed[]) => void
  updateComments: (updater: (prev: Comment[]) => Comment[]) => void
  updateReports: (updater: (prev: Report[]) => Report[]) => void
  updateRewardHistory: (updater: (prev: RewardHistory[]) => RewardHistory[]) => void
  resetAllData: () => void
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined)

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [liveSpaces, setLiveSpaces] = useState<LiveSpace[]>(generateMockLiveSpaces())
  const [users, setUsers] = useState<User[]>(generateMockUsers())
  const [feeds, setFeeds] = useState<Feed[]>(generateMockFeeds())
  const [comments, setComments] = useState<Comment[]>(generateMockComments())
  const [reports, setReports] = useState<Report[]>(generateMockReports())
  const [rewards, setRewards] = useState<Reward[]>(generateMockRewards())
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>(generateMockRewardHistory())
  const [phoneAuthLogs, setPhoneAuthLogs] = useState<PhoneAuthLog[]>(generateMockPhoneAuthLogs())
  const [appVersions, setAppVersions] = useState<AppVersion[]>(generateMockAppVersions())
  const [notices, setNotices] = useState<Notice[]>(generateMockNotices())
  const [faqs, setFaqs] = useState<FAQ[]>(generateMockFAQs())
  const [operators, setOperators] = useState<Operator[]>(generateMockOperators())
  const [permissionLogs, setPermissionLogs] = useState<PermissionLog[]>(generateMockPermissionLogs())

  const resetAllData = useCallback(() => {
    setLiveSpaces(generateMockLiveSpaces())
    setUsers(generateMockUsers())
    setFeeds(generateMockFeeds())
    setComments(generateMockComments())
    setReports(generateMockReports())
    setRewards(generateMockRewards())
    setRewardHistory(generateMockRewardHistory())
    setPhoneAuthLogs(generateMockPhoneAuthLogs())
    setAppVersions(generateMockAppVersions())
    setNotices(generateMockNotices())
    setFaqs(generateMockFAQs())
    setOperators(generateMockOperators())
    setPermissionLogs(generateMockPermissionLogs())
  }, [])

  const addPermissionLog = useCallback((log: Omit<PermissionLog, 'id' | 'createdAt'>) => {
    const newLog: PermissionLog = {
      id: `log-${Date.now()}`,
      ...log,
      createdAt: new Date().toISOString(),
    }
    setPermissionLogs(prev => [newLog, ...prev])
  }, [])

  const value: MockDataContextType = {
    liveSpaces,
    users,
    feeds,
    comments,
    reports,
    rewards,
    rewardHistory,
    phoneAuthLogs,
    appVersions,
    notices,
    faqs,
    operators,
    permissionLogs,
    updateLiveSpaces: setLiveSpaces,
    updateUsers: setUsers,
    updateFeeds: setFeeds,
    updateComments: setComments,
    updateReports: setReports,
    updateRewardHistory: setRewardHistory,
    resetAllData,
  }

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  )
}

export function useMockData() {
  const context = useContext(MockDataContext)
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider')
  }
  return context
}

