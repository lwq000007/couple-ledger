import { createContext, useContext, useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { supabaseService } from '@/services/supabase-service'

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
  login: (userId: string, userName: string, avatar?: string) => void
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
}

const AppContext = createContext<AppState | null>(null)

const userIdRef = { current: '' }

function getSavedUserId(): string {
  try {
    const saved = Taro.getStorageSync('couple_userId')
    if (saved) return saved
  } catch (_) {}
  const params = new URLSearchParams(window.location.search)
  return params.get('uid') || ''
}

function getSavedUserName(): string {
  try {
    return Taro.getStorageSync('couple_userName') || ''
  } catch (_) { return '' }
}

function getSavedUserAvatar(): string {
  try {
    return Taro.getStorageSync('couple_userAvatar') || ''
  } catch (_) { return '' }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState(getSavedUserId)
  const [userName, setUserName] = useState(getSavedUserName)
  const [userAvatar, setUserAvatar] = useState(getSavedUserAvatar)
  const [isLoggedIn, setIsLoggedIn] = useState(!!getSavedUserId())
  const [book, setBook] = useState<Book | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])

  const saveUserId = (id: string) => {
    userIdRef.current = id
    setUserId(id)
    try { Taro.setStorageSync('couple_userId', id) } catch (_) {}
  }
  const saveUserName = (name: string) => {
    setUserName(name)
    try { Taro.setStorageSync('couple_userName', name) } catch (_) {}
  }
  const saveUserAvatar = (avatar: string) => {
    setUserAvatar(avatar)
    try { Taro.setStorageSync('couple_userAvatar', avatar) } catch (_) {}
  }

  const login = useCallback((id: string, name: string, avatar?: string) => {
    saveUserId(id)
    saveUserName(name)
    if (avatar) saveUserAvatar(avatar)
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
    saveUserId('')
    saveUserName('')
    saveUserAvatar('')
    setUserId('')
    setUserName('')
    setUserAvatar('')
    setIsLoggedIn(false)
    setBook(null)
    setChatMessages([])
    setMonthlyStats(null)
    setExpenses([])
    try { Taro.removeStorageSync('couple_userId') } catch (_) {}
  }, [])

  const initUser = useCallback(async (name?: string) => {
    const existingId = getSavedUserId()
    if (existingId) {
      login(existingId, getSavedUserName(), getSavedUserAvatar())
      return
    }
    const params = new URLSearchParams(window.location.search)
    const inviteCode = params.get('invite')
    if (!name) return

    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    try {
      await supabaseService.register(newId, name)
    } catch (_) {
      // if register fails (e.g., duplicate), just use the id
    }
    saveUserId(newId)
    saveUserName(name)
    setIsLoggedIn(true)

    if (inviteCode) {
      const joined = await supabaseService.joinBook(inviteCode, newId)
      if (joined) {
        setBook(joined)
        params.delete('invite')
        const newUrl = `${window.location.pathname}?uid=${newId}`
        window.history.replaceState({}, '', newUrl)
      }
    } else {
      const newUrl = `${window.location.pathname}?uid=${newId}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [login])

  const loadBook = useCallback(async () => {
    if (!userIdRef.current) return
    const b = await supabaseService.loadBook(userIdRef.current)
    setBook(b)
  }, [])

  const createBook = useCallback(async (name: string): Promise<Book | null> => {
    if (!userIdRef.current) return null
    const b = await supabaseService.createBook(userIdRef.current, name)
    setBook(b)
    return b
  }, [])

  const joinBook = useCallback(async (inviteCode: string): Promise<boolean> => {
    if (!userIdRef.current) return false
    const b = await supabaseService.joinBook(inviteCode, userIdRef.current)
    if (b) { setBook(b); return true }
    return false
  }, [])

  const loadCategories = useCallback(async () => {
    setCategories(supabaseService.getCategories())
  }, [])

  const loadChatMessages = useCallback(async () => {
    if (!book?.id) return
    const msgs = await supabaseService.loadChatMessages(book.id)
    setChatMessages(msgs)
  }, [book?.id])

  const addChatMessage = useCallback(async (role: 'user' | 'assistant', content: string, parsedRecords?: ChatMessage['parsedRecords']) => {
    if (!book?.id || !userIdRef.current) return
    const msg = await supabaseService.addChatMessage(book.id, userIdRef.current, role, content, parsedRecords)
    setChatMessages(prev => [...prev, msg])
  }, [book?.id, book?.inviteCode])

  const loadMonthlyStats = useCallback(async (year: number, month: number) => {
    if (!book?.id) return
    const stats = await supabaseService.loadMonthlyStats(book.id, year, month)
    setMonthlyStats(stats)
  }, [book?.id])

  const loadExpenses = useCallback(async (filters?) => {
    if (!book?.id) return
    const items = await supabaseService.loadExpenses(book.id, filters)
    setExpenses(items)
  }, [book?.id])

  const addExpense = useCallback(async (record: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord | null> => {
    const r = await supabaseService.addExpense(record)
    setExpenses(prev => [r, ...prev])
    return r
  }, [])

  const batchAddExpenses = useCallback(async (records): Promise<ExpenseRecord[]> => {
    if (!book?.id || !userIdRef.current) return []
    const items = await supabaseService.batchAddExpenses(
      book.id, userIdRef.current, userName, userAvatar, records
    )
    setExpenses(prev => [...items, ...prev])
    return items
  }, [book?.id, userName, userAvatar])

  const deleteExpense = useCallback(async (recordId: string): Promise<boolean> => {
    await supabaseService.deleteExpense(recordId)
    setExpenses(prev => prev.filter(r => r.id !== recordId))
    return true
  }, [])

  const updateSavingsGoal = useCallback(async (title: string, targetAmount: number) => {
    if (!book?.id) return
    await supabaseService.updateSavingsGoal(book.id, title, targetAmount)
    setBook(prev => prev ? {
      ...prev,
      savingsGoal: { ...prev.savingsGoal, title, targetAmount }
    } : null)
  }, [book?.id])

  const value: AppState = {
    userId, userName, userAvatar, isLoggedIn, book, categories, chatMessages, monthlyStats, expenses,
    initUser, login, logout, loadBook, createBook, joinBook, loadCategories,
    loadChatMessages, addChatMessage, loadMonthlyStats, loadExpenses,
    addExpense, batchAddExpenses, deleteExpense, updateSavingsGoal
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useAppStore() {
  return useApp()
}