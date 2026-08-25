// 分类定义
export interface Category {
  id: string
  name: string
  emoji: string
  color: string
}

// 记账记录
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
  date: string // YYYY-MM-DD
  createdAt: string
}

// 账本
export interface Book {
  id: string
  name: string
  inviteCode: string
  members: BookMember[]
  savingsGoal: SavingsGoal
  createdAt: string
}

// 账本成员
export interface BookMember {
  userId: string
  name: string
  avatar: string
  role: 'owner' | 'partner'
  joinedAt: string
}

// 储蓄目标
export interface SavingsGoal {
  title: string
  targetAmount: number
  currentAmount: number
}

// 用户
export interface User {
  id: string
  name: string
  avatar: string
  bookId: string | null
}

// 聊天消息
export interface ChatMessage {
  id: string
  bookId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  parsedRecords?: ParsedRecord[]
  createdAt: string
}

// AI解析出的记录
export interface ParsedRecord {
  categoryId: string
  categoryName: string
  categoryEmoji: string
  amount: number
  note: string
  type: 'expense' | 'income'
  confirmed: boolean
}

// 统计
export interface MonthlyStats {
  totalExpense: number
  totalIncome: number
  balance: number
  memberExpense: { userId: string; name: string; avatar: string; amount: number }[]
  categoryBreakdown: { categoryId: string; name: string; emoji: string; amount: number; percentage: number }[]
  dailyTrend: { date: string; amount: number }[]
}
