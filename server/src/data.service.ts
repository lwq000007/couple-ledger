import { Injectable } from '@nestjs/common'
import type {
  Book,
  ExpenseRecord,
  User,
  ChatMessage,
  Category,
  MonthlyStats,
} from '@/types'

// 内置分类
const CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', emoji: '🍜', color: '#FF6B6B' },
  { id: 'transport', name: '交通', emoji: '🚗', color: '#42A5F5' },
  { id: 'shopping', name: '购物', emoji: '🛍️', color: '#AB47BC' },
  { id: 'entertainment', name: '娱乐', emoji: '🎮', color: '#FFA726' },
  { id: 'home', name: '居家', emoji: '🏠', color: '#66BB6A' },
  { id: 'medical', name: '医疗', emoji: '💊', color: '#EF5350' },
  { id: 'education', name: '教育', emoji: '📚', color: '#5C6BC0' },
  { id: 'clothing', name: '服饰', emoji: '👗', color: '#EC407A' },
  { id: 'digital', name: '数码', emoji: '📱', color: '#78909C' },
  { id: 'gift', name: '礼物', emoji: '🎁', color: '#FF7043' },
  { id: 'pet', name: '宠物', emoji: '🐱', color: '#8D6E63' },
  { id: 'social', name: '社交', emoji: '🍻', color: '#FFCA28' },
  { id: 'salary', name: '工资', emoji: '💰', color: '#66BB6A' },
  { id: 'bonus', name: '奖金', emoji: '🎉', color: '#FFA726' },
  { id: 'other_income', name: '其他收入', emoji: '💵', color: '#26A69A' },
  { id: 'other', name: '其他', emoji: '📝', color: '#90A4AE' },
]

// 内存数据存储
const books = new Map<string, Book>()
const expenses = new Map<string, ExpenseRecord>()
const users = new Map<string, User>()
const chatMessages = new Map<string, ChatMessage>()

// 账号存储: username -> { password, userId }
const accounts = new Map<string, { password: string; userId: string }>()

let idCounter = 1
function genId(): string {
  return `id_${Date.now()}_${idCounter++}`
}

function genInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

@Injectable()
export class DataService {
  getCategories(): Category[] {
    return CATEGORIES
  }

  // 账号注册
  register(username: string, password: string, displayName?: string): { success: boolean; message: string; userId?: string } {
    if (!username || !password) {
      return { success: false, message: '用户名和密码不能为空' }
    }
    if (accounts.has(username)) {
      return { success: false, message: '用户名已存在' }
    }
    const userId = genId()
    accounts.set(username, { password, userId })
    this.getOrCreateUser(userId, displayName || username)
    return { success: true, message: '注册成功', userId }
  }

  // 账号登录
  login(username: string, password: string): { success: boolean; message: string; userId?: string; user?: User } {
    const account = accounts.get(username)
    if (!account) {
      return { success: false, message: '用户不存在' }
    }
    if (account.password !== password) {
      return { success: false, message: '密码错误' }
    }
    const user = this.getUser(account.userId)
    return { success: true, message: '登录成功', userId: account.userId, user }
  }

  // 用户相关
  getOrCreateUser(userId: string, name?: string, avatar?: string): User {
    if (!users.has(userId)) {
      users.set(userId, {
        id: userId,
        name: name || '用户',
        avatar: avatar || '',
        bookId: null,
      })
    } else if (name) {
      const u = users.get(userId)!
      u.name = name
      if (avatar) u.avatar = avatar
    }
    return users.get(userId)!
  }

  getUser(userId: string): User | undefined {
    return users.get(userId)
  }

  updateUser(userId: string, data: Partial<User>): User | undefined {
    const user = users.get(userId)
    if (user) {
      Object.assign(user, data)
    }
    return user
  }

  // 账本相关
  createBook(userId: string, bookName: string): Book {
    const user = this.getOrCreateUser(userId)
    const bookId = genId()
    const book: Book = {
      id: bookId,
      name: bookName,
      inviteCode: genInviteCode(),
      members: [
        {
          userId,
          name: user.name,
          avatar: user.avatar,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      savingsGoal: { title: '旅行基金', targetAmount: 10000, currentAmount: 0 },
      createdAt: new Date().toISOString(),
    }
    books.set(bookId, book)
    user.bookId = bookId
    return book
  }

  getBookByInviteCode(inviteCode: string): Book | undefined {
    for (const book of books.values()) {
      if (book.inviteCode === inviteCode) return book
    }
    return undefined
  }

  joinBook(userId: string, inviteCode: string): { success: boolean; message: string; book?: Book } {
    const book = this.getBookByInviteCode(inviteCode)
    if (!book) return { success: false, message: '邀请码无效' }
    if (book.members.length >= 2) return { success: false, message: '账本已满' }
    if (book.members.some(m => m.userId === userId)) return { success: false, message: '你已在账本中' }

    const user = this.getOrCreateUser(userId)
    book.members.push({
      userId,
      name: user.name,
      avatar: user.avatar,
      role: 'partner',
      joinedAt: new Date().toISOString(),
    })
    user.bookId = book.id
    return { success: true, message: '加入成功', book }
  }

  getUserBook(userId: string): Book | undefined {
    const user = users.get(userId)
    if (!user?.bookId) return undefined
    return books.get(user.bookId)
  }

  updateSavingsGoal(bookId: string, title: string, targetAmount: number): Book | undefined {
    const book = books.get(bookId)
    if (book) {
      book.savingsGoal.title = title
      book.savingsGoal.targetAmount = targetAmount
    }
    return book
  }

  // 记账相关
  addExpense(record: Omit<ExpenseRecord, 'id' | 'createdAt'>): ExpenseRecord {
    const fullRecord: ExpenseRecord = {
      ...record,
      id: genId(),
      createdAt: new Date().toISOString(),
    }
    expenses.set(fullRecord.id, fullRecord)

    // 更新储蓄目标（收入累加）
    if (record.type === 'income') {
      const book = books.get(record.bookId)
      if (book) {
        book.savingsGoal.currentAmount += record.amount
      }
    }

    return fullRecord
  }

  deleteExpense(recordId: string): boolean {
    const record = expenses.get(recordId)
    if (record) {
      if (record.type === 'income') {
        const book = books.get(record.bookId)
        if (book) {
          book.savingsGoal.currentAmount = Math.max(0, book.savingsGoal.currentAmount - record.amount)
        }
      }
      expenses.delete(recordId)
      return true
    }
    return false
  }

  updateExpense(recordId: string, data: Partial<ExpenseRecord>): ExpenseRecord | undefined {
    const record = expenses.get(recordId)
    if (record) {
      Object.assign(record, data)
    }
    return record
  }

  getBookExpenses(bookId: string, filters?: { categoryId?: string; userId?: string; startDate?: string; endDate?: string; type?: string }): ExpenseRecord[] {
    let records = Array.from(expenses.values()).filter(e => e.bookId === bookId)

    if (filters?.categoryId) {
      records = records.filter(e => e.categoryId === filters.categoryId)
    }
    if (filters?.userId) {
      records = records.filter(e => e.userId === filters.userId)
    }
    if (filters?.type) {
      records = records.filter(e => e.type === filters.type)
    }
    if (filters?.startDate) {
      records = records.filter(e => e.date >= filters.startDate!)
    }
    if (filters?.endDate) {
      records = records.filter(e => e.date <= filters.endDate!)
    }

    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  // 统计
  getMonthlyStats(bookId: string, year: number, month: number): MonthlyStats {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const records = Array.from(expenses.values()).filter(
      e => e.bookId === bookId && e.date.startsWith(monthStr),
    )

    const totalExpense = records.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const totalIncome = records.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)

    const book = books.get(bookId)
    const memberExpense = book
      ? book.members.map(m => ({
        userId: m.userId,
        name: m.name,
        avatar: m.avatar,
        amount: records.filter(e => e.userId === m.userId && e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      }))
      : []

    const categoryMap = new Map<string, { categoryId: string; name: string; emoji: string; amount: number }>()
    records.filter(e => e.type === 'expense').forEach(e => {
      const existing = categoryMap.get(e.categoryId)
      if (existing) {
        existing.amount += e.amount
      } else {
        categoryMap.set(e.categoryId, {
          categoryId: e.categoryId,
          name: e.categoryName,
          emoji: e.categoryEmoji,
          amount: e.amount,
        })
      }
    })
    const categoryBreakdown = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // 近7天趋势
    const dailyTrend: { date: string; amount: number }[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayAmount = records
        .filter(e => e.date === dateStr && e.type === 'expense')
        .reduce((s, e) => s + e.amount, 0)
      dailyTrend.push({ date: dateStr, amount: dayAmount })
    }

    return {
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      memberExpense,
      categoryBreakdown,
      dailyTrend,
    }
  }

  // 聊天消息
  addChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const fullMsg: ChatMessage = {
      ...msg,
      id: genId(),
      createdAt: new Date().toISOString(),
    }
    chatMessages.set(fullMsg.id, fullMsg)
    return fullMsg
  }

  getBookChatMessages(bookId: string): ChatMessage[] {
    return Array.from(chatMessages.values())
      .filter(m => m.bookId === bookId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
}
