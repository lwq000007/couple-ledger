import { Injectable } from '@nestjs/common'
import { supabase } from './supabase'
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
  { id: 'entertainment', name: '娱乐', emoji: '', color: '#FFA726' },
  { id: 'home', name: '居家', emoji: '🏠', color: '#66BB6A' },
  { id: 'medical', name: '医疗', emoji: '', color: '#EF5350' },
  { id: 'education', name: '教育', emoji: '📚', color: '#5C6BC0' },
  { id: 'clothing', name: '服饰', emoji: '', color: '#EC407A' },
  { id: 'digital', name: '数码', emoji: '📱', color: '#78909C' },
  { id: 'gift', name: '礼物', emoji: '🎁', color: '#FF7043' },
  { id: 'pet', name: '宠物', emoji: '🐱', color: '#8D6E63' },
  { id: 'social', name: '社交', emoji: '🍻', color: '#FFCA28' },
  { id: 'salary', name: '工资', emoji: '💰', color: '#66BB6A' },
  { id: 'bonus', name: '奖金', emoji: '', color: '#FFA726' },
  { id: 'other_income', name: '其他收入', emoji: '💵', color: '#26A69A' },
  { id: 'other', name: '其他', emoji: '📝', color: '#90A4AE' },
]

function genId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
  async register(username: string, password: string, displayName?: string): Promise<{ success: boolean; message: string; userId?: string }> {
    if (!username || !password) {
      return { success: false, message: '用户名和密码不能为空' }
    }

    // 检查用户名是否已存在
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existing) {
      return { success: false, message: '用户名已存在' }
    }

    const userId = genId()
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        display_name: displayName || username,
      })

    if (error) {
      return { success: false, message: '注册失败' }
    }

    // 存储账号密码（使用 users 表的扩展字段或单独存储）
    // 这里简化处理，实际应该用单独的表
    const { error: accountError } = await supabase
      .from('users')
      .update({ password })
      .eq('id', userId)

    if (accountError) {
      return { success: false, message: '注册失败' }
    }

    return { success: true, message: '注册成功', userId }
  }

  // 账号登录
  async login(username: string, password: string): Promise<{ success: boolean; message: string; userId?: string; user?: User }> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      return { success: false, message: '用户不存在' }
    }

    if (user.password !== password) {
      return { success: false, message: '密码错误' }
    }

    const userData: User = {
      id: user.id,
      name: user.display_name,
      avatar: user.avatar || '',
      bookId: user.book_id || null,
    }

    return { success: true, message: '登录成功', userId: user.id, user: userData }
  }

  // 用户相关
  async getOrCreateUser(userId: string, name?: string, avatar?: string): Promise<User> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user) {
      // 创建新用户
      await supabase
        .from('users')
        .insert({
          id: userId,
          username: userId,
          display_name: name || '用户',
          avatar: avatar || '',
        })

      return {
        id: userId,
        name: name || '用户',
        avatar: avatar || '',
        bookId: null,
      }
    }

    // 更新用户信息
    if (name || avatar) {
      await supabase
        .from('users')
        .update({
          display_name: name || user.display_name,
          avatar: avatar || user.avatar,
        })
        .eq('id', userId)
    }

    return {
      id: user.id,
      name: user.display_name,
      avatar: user.avatar || '',
      bookId: user.book_id || null,
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user) return undefined

    return {
      id: user.id,
      name: user.display_name,
      avatar: user.avatar || '',
      bookId: user.book_id || null,
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User | undefined> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.display_name = data.name
    if (data.avatar !== undefined) updateData.avatar = data.avatar
    if (data.bookId !== undefined) updateData.book_id = data.bookId

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    return this.getUser(userId)
  }

  // 账本相关
  async createBook(userId: string, bookName: string): Promise<Book> {
    const user = await this.getOrCreateUser(userId)
    const bookId = genId()
    const inviteCode = genInviteCode()

    // 创建账本
    await supabase
      .from('books')
      .insert({
        id: bookId,
        name: bookName,
        owner_id: userId,
        invite_code: inviteCode,
      })

    // 添加成员
    await supabase
      .from('book_members')
      .insert({
        book_id: bookId,
        user_id: userId,
      })

    // 更新用户的账本ID
    await this.updateUser(userId, { bookId })

    // 创建默认储蓄目标
    await supabase
      .from('savings_goals')
      .insert({
        id: genId(),
        book_id: bookId,
        title: '旅行基金',
        target_amount: 10000,
        current_amount: 0,
      })

    return {
      id: bookId,
      name: bookName,
      inviteCode,
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
  }

  async getBookByInviteCode(inviteCode: string): Promise<Book | undefined> {
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (!book) return undefined

    return this.getBookById(book.id)
  }

  async getBookById(bookId: string): Promise<Book | undefined> {
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (!book) return undefined

    // 获取成员
    const { data: members } = await supabase
      .from('book_members')
      .select('*, users(display_name, avatar)')
      .eq('book_id', bookId)

    // 获取储蓄目标
    const { data: goal } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('book_id', bookId)
      .single()

    return {
      id: book.id,
      name: book.name,
      inviteCode: book.invite_code,
      members: (members || []).map(m => ({
        userId: m.user_id,
        name: m.users?.display_name || '用户',
        avatar: m.users?.avatar || '',
        role: m.user_id === book.owner_id ? 'owner' : 'partner',
        joinedAt: m.joined_at,
      })),
      savingsGoal: goal ? {
        title: goal.title,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
      } : { title: '旅行基金', targetAmount: 10000, currentAmount: 0 },
      createdAt: book.created_at,
    }
  }

  async joinBook(userId: string, inviteCode: string): Promise<{ success: boolean; message: string; book?: Book }> {
    const book = await this.getBookByInviteCode(inviteCode)
    if (!book) return { success: false, message: '邀请码无效' }
    if (book.members.length >= 2) return { success: false, message: '账本已满' }
    if (book.members.some(m => m.userId === userId)) return { success: false, message: '你已在账本中' }

    const user = await this.getOrCreateUser(userId)

    // 添加成员
    await supabase
      .from('book_members')
      .insert({
        book_id: book.id,
        user_id: userId,
      })

    // 更新用户的账本ID
    await this.updateUser(userId, { bookId: book.id })

    // 重新获取账本
    const updatedBook = await this.getBookById(book.id)

    return { success: true, message: '加入成功', book: updatedBook }
  }

  async getUserBook(userId: string): Promise<Book | undefined> {
    const user = await this.getUser(userId)
    if (!user?.bookId) return undefined
    return this.getBookById(user.bookId)
  }

  async updateSavingsGoal(bookId: string, title: string, targetAmount: number): Promise<Book | undefined> {
    await supabase
      .from('savings_goals')
      .upsert({
        book_id: bookId,
        title,
        target_amount: targetAmount,
      })
      .eq('book_id', bookId)

    return this.getBookById(bookId)
  }

  // 记账相关
  async addExpense(record: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord> {
    const recordId = genId()

    await supabase
      .from('expenses')
      .insert({
        id: recordId,
        book_id: record.bookId,
        user_id: record.userId,
        user_name: record.userName,
        user_avatar: record.userAvatar || '',
        type: record.type,
        category_id: record.categoryId,
        category_name: record.categoryName,
        category_emoji: record.categoryEmoji,
        amount: record.amount,
        note: record.note || '',
        date: record.date,
      })

    // 更新储蓄目标（收入累加）
    if (record.type === 'income') {
      const { data: goal } = await supabase
        .from('savings_goals')
        .select('current_amount')
        .eq('book_id', record.bookId)
        .single()

      if (goal) {
        await supabase
          .from('savings_goals')
          .update({ current_amount: goal.current_amount + record.amount })
          .eq('book_id', record.bookId)
      }
    }

    return {
      ...record,
      id: recordId,
      createdAt: new Date().toISOString(),
    }
  }

  async deleteExpense(recordId: string): Promise<boolean> {
    const { data: record } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', recordId)
      .single()

    if (!record) return false

    // 如果是收入，更新储蓄目标
    if (record.type === 'income') {
      const { data: goal } = await supabase
        .from('savings_goals')
        .select('current_amount')
        .eq('book_id', record.book_id)
        .single()

      if (goal) {
        await supabase
          .from('savings_goals')
          .update({ current_amount: Math.max(0, goal.current_amount - record.amount) })
          .eq('book_id', record.book_id)
      }
    }

    await supabase
      .from('expenses')
      .delete()
      .eq('id', recordId)

    return true
  }

  async updateExpense(recordId: string, data: Partial<ExpenseRecord>): Promise<ExpenseRecord | undefined> {
    const updateData: any = {}
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId
    if (data.categoryName !== undefined) updateData.category_name = data.categoryName
    if (data.categoryEmoji !== undefined) updateData.category_emoji = data.categoryEmoji
    if (data.note !== undefined) updateData.note = data.note
    if (data.date !== undefined) updateData.date = data.date

    await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', recordId)

    const { data: record } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', recordId)
      .single()

    if (!record) return undefined

    return {
      id: record.id,
      bookId: record.book_id,
      userId: record.user_id,
      userName: record.user_name,
      userAvatar: record.user_avatar,
      type: record.type,
      categoryId: record.category_id,
      categoryName: record.category_name,
      categoryEmoji: record.category_emoji,
      amount: record.amount,
      note: record.note,
      date: record.date,
      createdAt: record.created_at,
    }
  }

  async getBookExpenses(bookId: string, filters?: { categoryId?: string; userId?: string; startDate?: string; endDate?: string; type?: string }): Promise<ExpenseRecord[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('book_id', bookId)

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate)
    }

    const { data: records } = await query.order('created_at', { ascending: false })

    return (records || []).map(r => ({
      id: r.id,
      bookId: r.book_id,
      userId: r.user_id,
      userName: r.user_name,
      userAvatar: r.user_avatar,
      type: r.type,
      categoryId: r.category_id,
      categoryName: r.category_name,
      categoryEmoji: r.category_emoji,
      amount: r.amount,
      note: r.note,
      date: r.date,
      createdAt: r.created_at,
    }))
  }

  // 统计
  async getMonthlyStats(bookId: string, year: number, month: number): Promise<MonthlyStats> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    const { data: records } = await supabase
      .from('expenses')
      .select('*')
      .eq('book_id', bookId)
      .like('date', `${monthStr}%`)

    const expenseRecords = records || []

    const totalExpense = expenseRecords
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + e.amount, 0)

    const totalIncome = expenseRecords
      .filter(e => e.type === 'income')
      .reduce((s, e) => s + e.amount, 0)

    // 获取账本成员
    const book = await this.getBookById(bookId)
    const memberExpense = book
      ? book.members.map(m => ({
        userId: m.userId,
        name: m.name,
        avatar: m.avatar,
        amount: expenseRecords
          .filter(e => e.user_id === m.userId && e.type === 'expense')
          .reduce((s, e) => s + e.amount, 0),
      }))
      : []

    // 分类统计
    const categoryMap = new Map<string, { categoryId: string; name: string; emoji: string; amount: number }>()
    expenseRecords
      .filter(e => e.type === 'expense')
      .forEach(e => {
        const existing = categoryMap.get(e.category_id)
        if (existing) {
          existing.amount += e.amount
        } else {
          categoryMap.set(e.category_id, {
            categoryId: e.category_id,
            name: e.category_name,
            emoji: e.category_emoji,
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
      const dayAmount = expenseRecords
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

  // 聊天相关
  async getChatMessages(bookId: string, limit = 50): Promise<ChatMessage[]> {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (messages || []).map(m => ({
      id: m.id,
      bookId: m.book_id,
      userId: m.user_id,
      role: m.role,
      content: m.content,
      parsedRecords: m.parsed_records,
      createdAt: m.created_at,
    }))
  }

  async addChatMessage(bookId: string, userId: string, role: 'user' | 'assistant', content: string, parsedRecords?: any[]): Promise<ChatMessage> {
    const messageId = genId()

    await supabase
      .from('chat_messages')
      .insert({
        id: messageId,
        book_id: bookId,
        user_id: userId,
        role,
        content,
        parsed_records: parsedRecords || [],
      })

    return {
      id: messageId,
      bookId,
      userId,
      role,
      content,
      parsedRecords: parsedRecords || [],
      createdAt: new Date().toISOString(),
    }
  }
}
