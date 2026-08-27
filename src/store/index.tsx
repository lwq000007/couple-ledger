import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
}

export interface ExpenseRecord {
  id: string
  bookId: string
  userId: string
  userName: string
  userAvatar: string
  type: 'expense' | 'income'
  categoryId: string
  categoryName: string
  categoryEmoji: string
  amount: number
  note: string
  date: string
  createdAt: string
}

export interface BookMember {
  userId: string
  name: string
  avatar: string
  role: 'owner' | 'partner'
  joinedAt: string
}

export interface Book {
  id: string
  name: string
  inviteCode: string
  members: BookMember[]
  savingsGoal: {
    title: string
    targetAmount: number
    currentAmount: number
  }
  createdAt: string
}

export interface ChatMessage {
  id: string
  bookId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  parsedRecords?: Array<{
    categoryId: string
    categoryName: string
    categoryEmoji: string
    amount: number
    note: string
    type: 'expense' | 'income'
    confirmed: boolean
  }>
  createdAt: string
}

export interface MonthlyStats {
  totalExpense: number
  totalIncome: number
  balance: number
  memberExpense: { userId: string; name: string; avatar: string; amount: number }[]
  categoryBreakdown: { categoryId: string; name: string; emoji: string; amount: number; percentage: number }[]
  dailyTrend: { date: string; amount: number }[]
}

interface AppState {
  userId: string
  userName: string
  userAvatar: string
  isLoggedIn: boolean
  book: Book | null
  categories: Category[]
  chatMessages: ChatMessage[]
  monthlyStats: MonthlyStats | null
  expenses: ExpenseRecord[]
  initUser: (name?: string) => Promise<void>
  login: (userId: string, userName: string) => void
  logout: () => void
  loadBook: () => Promise<void>
  createBook: (name: string) => Promise<Book | null>
  joinBook: (inviteCode: string) => Promise<boolean>
  loadCategories: () => Promise<void>
  loadChatMessages: () => Promise<void>
  addChatMessage: (role: 'user' | 'assistant', content: string, parsedRecords?: ChatMessage['parsedRecords']) => Promise<void>
  loadMonthlyStats: (year: number, month: number) => Promise<void>
  loadExpenses: (filters?: { categoryId?: string; userId?: string; startDate?: string; endDate?: string; type?: string }) => Promise<void>
  addExpense: (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => Promise<ExpenseRecord | null>
  batchAddExpenses: (records: Array<Omit<ExpenseRecord, 'id' | 'createdAt' | 'bookId' | 'userId' | 'userName' | 'userAvatar'>>) => Promise<ExpenseRecord[]>
  deleteExpense: (recordId: string) => Promise<boolean>
  updateSavingsGoal: (title: string, targetAmount: number) => Promise<void>
  updateProfile: (name: string) => Promise<void>
  loadMembers: () => Promise<void>
  createInviteCode: () => Promise<string>
  getShareLink: () => string
  pendingInviteCode: string
}

const AppContext = createContext<AppState | null>(null)

// 从URL获取参数（H5环境）
const getUrlParam = (key: string): string => {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get(key) || ''
    }
  } catch { /* ignore */ }
  return ''
}

// 设置URL参数（不刷新页面）
const setUrlParam = (key: string, value: string) => {
  try {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set(key, value)
      window.history.replaceState({}, '', url.toString())
    }
  } catch { /* ignore */ }
}

const getUserId = () => {
  try {
    // 优先从URL获取（保证同一链接=同一用户）
    const urlUid = getUrlParam('uid')
    if (urlUid) {
      Taro.setStorageSync('userId', urlUid)
      return urlUid
    }
    // 其次从本地存储获取
    const stored = Taro.getStorageSync('userId')
    if (stored) {
      setUrlParam('uid', stored)
      return stored
    }
    // 都没有则生成新的
    const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    Taro.setStorageSync('userId', newId)
    setUrlParam('uid', newId)
    return newId
  } catch {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

// 获取URL中的邀请码
const getInviteCodeFromUrl = (): string => {
  return getUrlParam('invite') || ''
}

// 生成分享链接
const generateShareLink = (inviteCode: string): string => {
  try {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('invite', inviteCode)
      // 移除uid参数，让朋友生成自己的身份
      url.searchParams.delete('uid')
      return url.toString()
    }
  } catch { /* ignore */ }
  return `?invite=${inviteCode}`
}

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState(getUserId)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [book, setBook] = useState<Book | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [pendingInviteCode] = useState(getInviteCodeFromUrl)
  const userIdRef = useRef(userId)

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const initUser = useCallback(async (name?: string) => {
    const uName = name || Taro.getStorageSync('userName') || ''
    try {
      const res = await Network.request({
        url: '/api/user/login',
        method: 'POST',
        data: { userId: userIdRef.current, name: uName || '小伙伴' },
      })
      console.log('[API] user/login response:', JSON.stringify(res.data))
      const userData = (res.data as { data: { id: string; name: string; avatar: string; bookId: string | null } }).data
      setUserName(userData.name)
      setUserAvatar(userData.avatar)
      setIsLoggedIn(true)
      if (uName) Taro.setStorageSync('userName', uName)
    } catch (err) {
      console.error('initUser error:', err)
    }
  }, [])

  const login = useCallback((newUserId: string, name: string) => {
    setUserId(newUserId)
    userIdRef.current = newUserId
    setUserName(name)
    setIsLoggedIn(true)
    Taro.setStorageSync('userId', newUserId)
    Taro.setStorageSync('userName', name)
    setUrlParam('uid', newUserId)
  }, [])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setUserId('')
    setUserName('')
    setUserAvatar('')
    setBook(null)
    Taro.removeStorageSync('userId')
    Taro.removeStorageSync('userName')
  }, [])

  const loadBook = useCallback(async () => {
    try {
      const res = await Network.request({ url: `/api/book/info?userId=${userIdRef.current}` })
      console.log('[API] book/info response:', JSON.stringify(res.data))
      const bookData = (res.data as { data: Book | null }).data
      setBook(bookData)
    } catch (err) {
      console.error('loadBook error:', err)
    }
  }, [])

  const createBook = useCallback(async (name: string) => {
    const res = await Network.request({
      url: '/api/book/create',
      method: 'POST',
      data: { userId: userIdRef.current, name },
    })
    console.log('[API] book/create response:', JSON.stringify(res.data))
    const b = (res.data as { data: Book }).data
    setBook(b)
    return b
  }, [])

  const joinBook = useCallback(async (inviteCode: string) => {
    const res = await Network.request({
      url: '/api/book/join',
      method: 'POST',
      data: { userId: userIdRef.current, inviteCode },
    })
    console.log('[API] book/join response:', JSON.stringify(res.data))
    const result = (res.data as { code: number; msg: string; data: Book | null })
    if (result.data) {
      setBook(result.data)
    }
    return result.code === 200 && !!result.data
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const res = await Network.request({ url: '/api/book/categories' })
      console.log('[API] book/categories response:', JSON.stringify(res.data))
      const cats = (res.data as { data: Category[] }).data
      setCategories(cats)
    } catch (err) {
      console.error('loadCategories error:', err)
    }
  }, [])

  const loadChatMessages = useCallback(async () => {
    if (!book) return
    try {
      const res = await Network.request({ url: `/api/chat/messages?bookId=${book.id}` })
      console.log('[API] chat/messages response:', JSON.stringify(res.data))
      const msgs = (res.data as { data: ChatMessage[] }).data
      setChatMessages(msgs)
    } catch (err) {
      console.error('loadChatMessages error:', err)
    }
  }, [book])

  const addChatMessage = useCallback(async (role: 'user' | 'assistant', content: string, parsedRecords?: ChatMessage['parsedRecords']) => {
    if (!book) return
    try {
      const res = await Network.request({
        url: '/api/chat/message',
        method: 'POST',
        data: { bookId: book.id, userId: userIdRef.current, role, content, parsedRecords },
      })
      console.log('[API] chat/message response:', JSON.stringify(res.data))
      const msg = (res.data as { data: ChatMessage }).data
      setChatMessages(prev => [...prev, msg])
    } catch (err) {
      console.error('addChatMessage error:', err)
    }
  }, [book])

  const loadMonthlyStats = useCallback(async (year: number, month: number) => {
    if (!book) return
    try {
      const res = await Network.request({ url: `/api/expense/stats?bookId=${book.id}&year=${year}&month=${month}` })
      console.log('[API] expense/stats response:', JSON.stringify(res.data))
      const stats = (res.data as { data: MonthlyStats }).data
      setMonthlyStats(stats)
    } catch (err) {
      console.error('loadMonthlyStats error:', err)
    }
  }, [book])

  const loadExpenses = useCallback(async (filters?: { categoryId?: string; userId?: string; startDate?: string; endDate?: string; type?: string }) => {
    if (!book) return
    try {
      let url = `/api/expense/list?bookId=${book.id}`
      if (filters?.categoryId) url += `&categoryId=${filters.categoryId}`
      if (filters?.userId) url += `&userId=${filters.userId}`
      if (filters?.startDate) url += `&startDate=${filters.startDate}`
      if (filters?.endDate) url += `&endDate=${filters.endDate}`
      if (filters?.type) url += `&type=${filters.type}`
      const res = await Network.request({ url })
      console.log('[API] expense/list response:', JSON.stringify(res.data))
      const exps = (res.data as { data: ExpenseRecord[] }).data
      setExpenses(exps)
    } catch (err) {
      console.error('loadExpenses error:', err)
    }
  }, [book])

  const addExpense = useCallback(async (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const res = await Network.request({
      url: '/api/expense/add',
      method: 'POST',
      data: record,
    })
    console.log('[API] expense/add response:', JSON.stringify(res.data))
    return (res.data as { data: ExpenseRecord }).data
  }, [])

  const batchAddExpenses = useCallback(async (records: Array<Omit<ExpenseRecord, 'id' | 'createdAt' | 'bookId' | 'userId' | 'userName' | 'userAvatar'>>) => {
    if (!book) return []
    const res = await Network.request({
      url: '/api/expense/batch-add',
      method: 'POST',
      data: { bookId: book.id, userId: userIdRef.current, userName, userAvatar, records },
    })
    console.log('[API] expense/batch-add response:', JSON.stringify(res.data))
    return (res.data as { data: ExpenseRecord[] }).data
  }, [book, userName, userAvatar])

  const deleteExpense = useCallback(async (recordId: string) => {
    const res = await Network.request({
      url: '/api/expense/delete',
      method: 'DELETE',
      data: { recordId },
    })
    console.log('[API] expense/delete response:', JSON.stringify(res.data))
    return (res.data as { data: boolean }).data
  }, [])

  const updateSavingsGoal = useCallback(async (title: string, targetAmount: number) => {
    if (!book) return
    const res = await Network.request({
      url: '/api/book/savings-goal',
      method: 'PUT',
      data: { bookId: book.id, title, targetAmount },
    })
    console.log('[API] book/savings-goal response:', JSON.stringify(res.data))
    const updatedBook = (res.data as { data: Book }).data
    setBook(updatedBook)
  }, [book])

  const updateProfile = useCallback(async (name: string) => {
    const res = await Network.request({
      url: '/api/user/update',
      method: 'PUT',
      data: { userId: userIdRef.current, name },
    })
    console.log('[API] user/update response:', JSON.stringify(res.data))
    setUserName(name)
    Taro.setStorageSync('userName', name)
  }, [])

  const loadMembers = useCallback(async () => {
    if (!book) return
    try {
      const res = await Network.request({ url: `/api/book/members?bookId=${book.id}` })
      console.log('[API] book/members response:', JSON.stringify(res.data))
    } catch (err) {
      console.error('loadMembers error:', err)
    }
  }, [book])

  const createInviteCode = useCallback(async () => {
    if (!book) return ''
    const res = await Network.request({
      url: '/api/book/invite',
      method: 'POST',
      data: { bookId: book.id },
    })
    console.log('[API] book/invite response:', JSON.stringify(res.data))
    const result = (res.data as { data: { inviteCode: string } }).data
    return result.inviteCode
  }, [book])

  const getShareLink = useCallback(() => {
    if (!book?.inviteCode) return ''
    return generateShareLink(book.inviteCode)
  }, [book])

  const value: AppState = {
    userId, userName, userAvatar, isLoggedIn,
    book, categories, chatMessages, monthlyStats, expenses,
    initUser, login, logout, loadBook, createBook, joinBook,
    loadCategories, loadChatMessages, addChatMessage,
    loadMonthlyStats, loadExpenses, addExpense, batchAddExpenses,
    deleteExpense, updateSavingsGoal, updateProfile,
    loadMembers, createInviteCode, getShareLink,
    pendingInviteCode,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppStore = (): AppState => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider')
  }
  return context
}
