import { supabase } from '@/utils/supabase'
import type { Book, BookMember, ExpenseRecord, Category, MonthlyStats, ChatMessage } from '@/store'

const CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', emoji: '🍜', color: '#FF6B6B' },
  { id: 'transport', name: '交通', emoji: '🚗', color: '#4ECDC4' },
  { id: 'shopping', name: '购物', emoji: '🛍️', color: '#FF8E53' },
  { id: 'entertainment', name: '娱乐', emoji: '🎮', color: '#A78BFA' },
  { id: 'home', name: '居家', emoji: '🏠', color: '#34D399' },
  { id: 'medical', name: '医疗', emoji: '💊', color: '#F472B6' },
  { id: 'education', name: '教育', emoji: '📚', color: '#60A5FA' },
  { id: 'salary', name: '工资', emoji: '💰', color: '#FBBF24' },
  { id: 'redpacket', name: '红包', emoji: '🧧', color: '#FB923C' },
  { id: 'transfer', name: '转账', emoji: '💸', color: '#A78BFA' },
  { id: 'other', name: '其他', emoji: '📦', color: '#9CA3AF' },
]

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export const supabaseService = {
  // 用户
  async register(username: string, displayName: string): Promise<{ userId: string }> {
    const { data: existing } = await supabase.from('users').select('id').eq('username', username).single()
    if (existing) throw new Error('用户名已存在')
    const userId = generateId()
    const { error } = await supabase.from('users').insert({
      id: userId, username, display_name: displayName, avatar: ''
    })
    if (error) throw error
    return { userId }
  },

  async login(username: string): Promise<{ userId: string; displayName: string; avatar: string } | null> {
    const { data } = await supabase.from('users').select('id, display_name, avatar').eq('username', username).single()
    return data ? { userId: data.id, displayName: data.display_name, avatar: data.avatar || '' } : null
  },

  async updateUserProfile(userId: string, updates: { displayName?: string; avatar?: string }): Promise<void> {
    const dbUpdates: Record<string, string> = {}
    if (updates.displayName) dbUpdates.display_name = updates.displayName
    if (updates.avatar) dbUpdates.avatar = updates.avatar
    await supabase.from('users').update(dbUpdates).eq('id', userId)
  },

  // 账本
  async createBook(userId: string, name: string): Promise<Book> {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const bookId = generateId()

    await supabase.from('books').insert({
      id: bookId, name, owner_id: userId, invite_code: inviteCode
    })
    await supabase.from('book_members').insert({
      book_id: bookId, user_id: userId
    })

    const { data: user } = await supabase.from('users').select('display_name, avatar').eq('id', userId).single()
    return {
      id: bookId, name, inviteCode,
      members: [{ userId, name: user?.display_name || '', avatar: user?.avatar || '', role: 'owner', joinedAt: new Date().toISOString() }],
      savingsGoal: { title: '', targetAmount: 0, currentAmount: 0 },
      createdAt: new Date().toISOString()
    }
  },

  async loadBook(userId: string): Promise<Book | null> {
    const { data: memberships } = await supabase.from('book_members').select('book_id').eq('user_id', userId)
    if (!memberships || memberships.length === 0) return null

    const bookId = memberships[0].book_id
    const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single()
    if (!book) return null

    const { data: memberRows } = await supabase.from('book_members').select('user_id, joined_at').eq('book_id', bookId)
    const memberIds = (memberRows || []).map(m => m.user_id)
    const { data: users } = await supabase.from('users').select('*').in('id', memberIds)

    const members: BookMember[] = (memberRows || []).map(m => {
      const user = (users || []).find(u => u.id === m.user_id)
      return {
        userId: m.user_id,
        name: user?.display_name || '',
        avatar: user?.avatar || '',
        role: m.user_id === book.owner_id ? 'owner' as const : 'partner' as const,
        joinedAt: m.joined_at
      }
    })

    const { data: goal } = await supabase.from('savings_goals').select('*').eq('book_id', bookId).single()

    return {
      id: book.id, name: book.name, inviteCode: book.invite_code,
      members,
      savingsGoal: goal ? { title: goal.title, targetAmount: Number(goal.target_amount), currentAmount: Number(goal.current_amount) } : { title: '', targetAmount: 0, currentAmount: 0 },
      createdAt: book.created_at
    }
  },

  async joinBook(inviteCode: string, userId: string): Promise<Book | null> {
    const { data: book } = await supabase.from('books').select('*').eq('invite_code', inviteCode).single()
    if (!book) return null

    const { data: existing } = await supabase.from('book_members').select('*').eq('book_id', book.id).eq('user_id', userId).single()
    if (!existing) {
      await supabase.from('book_members').insert({ book_id: book.id, user_id: userId })
    }

    return this.loadBook(userId)
  },

  // 分类
  getCategories(): Category[] {
    return CATEGORIES
  },

  // 记账
  async addExpense(record: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord> {
    const newRecord = { ...record, id: generateId(), createdAt: new Date().toISOString() }
    await supabase.from('expenses').insert({
      id: newRecord.id, book_id: newRecord.bookId, user_id: newRecord.userId,
      user_name: newRecord.userName, user_avatar: newRecord.userAvatar,
      type: newRecord.type, category_id: newRecord.categoryId,
      category_name: newRecord.categoryName, category_emoji: newRecord.categoryEmoji,
      amount: newRecord.amount, note: newRecord.note, date: newRecord.date
    })
    return newRecord
  },

  async batchAddExpenses(bookId: string, userId: string, userName: string, userAvatar: string, records: Array<{ type: 'expense' | 'income'; categoryId: string; categoryName: string; categoryEmoji: string; amount: number; note: string; date: string }>): Promise<ExpenseRecord[]> {
    const items = records.map(r => ({
      id: generateId(), bookId, userId, userName, userAvatar, ...r, createdAt: new Date().toISOString()
    }))
    await supabase.from('expenses').insert(items.map(i => ({
      id: i.id, book_id: i.bookId, user_id: i.userId,
      user_name: i.userName, user_avatar: i.userAvatar,
      type: i.type, category_id: i.categoryId,
      category_name: i.categoryName, category_emoji: i.categoryEmoji,
      amount: i.amount, note: i.note, date: i.date
    })))
    return items
  },

  async loadExpenses(bookId: string, filters?: { categoryId?: string; userId?: string; startDate?: string; endDate?: string; type?: string }): Promise<ExpenseRecord[]> {
    let query = supabase.from('expenses').select('*').eq('book_id', bookId)

    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters?.userId) query = query.eq('user_id', filters.userId)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.startDate) query = query.gte('date', filters.startDate)
    if (filters?.endDate) query = query.lte('date', filters.endDate)

    const { data } = await query.order('date', { ascending: false }).order('created_at', { ascending: false })
    return (data || []).map(r => ({
      id: r.id, bookId: r.book_id, userId: r.user_id,
      userName: r.user_name, userAvatar: r.user_avatar || '',
      type: r.type as 'expense' | 'income',
      categoryId: r.category_id, categoryName: r.category_name,
      categoryEmoji: r.category_emoji, amount: Number(r.amount),
      note: r.note || '', date: r.date, createdAt: r.created_at
    }))
  },

  async deleteExpense(recordId: string): Promise<void> {
    await supabase.from('expenses').delete().eq('id', recordId)
  },

  async loadMonthlyStats(bookId: string, year: number, month: number): Promise<MonthlyStats> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('book_id', bookId)
      .gte('date', startDate)
      .lt('date', endDate)

    const list = expenses || []

    const totalExpense = list.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
    const totalIncome = list.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)

    // 成员支出
    const memberMap: Record<string, { name: string; avatar: string; amount: number }> = {}
    list.filter(r => r.type === 'expense').forEach(r => {
      if (!memberMap[r.user_id]) memberMap[r.user_id] = { name: r.user_name, avatar: r.user_avatar || '', amount: 0 }
      memberMap[r.user_id].amount += Number(r.amount)
    })
    const memberExpense = Object.entries(memberMap).map(([userId, v]) => ({ userId, ...v }))

    // 分类分析
    const catMap: Record<string, { name: string; emoji: string; amount: number }> = {}
    list.filter(r => r.type === 'expense').forEach(r => {
      if (!catMap[r.category_id]) catMap[r.category_id] = { name: r.category_name, emoji: r.category_emoji, amount: 0 }
      catMap[r.category_id].amount += Number(r.amount)
    })
    const categoryBreakdown = Object.entries(catMap).map(([categoryId, v]) => ({
      categoryId, ...v, percentage: totalExpense > 0 ? Math.round((v.amount / totalExpense) * 10000) / 100 : 0
    }))

    // 7天趋势
    const dailyMap: Record<string, number> = {}
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dailyMap[key] = 0
    }
    list.filter(r => r.type === 'expense').forEach(r => {
      if (dailyMap[r.date] !== undefined) dailyMap[r.date] += Number(r.amount)
    })
    const dailyTrend = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }))

    return { totalExpense, totalIncome, balance: totalIncome - totalExpense, memberExpense, categoryBreakdown, dailyTrend }
  },

  // 聊天
  async loadChatMessages(bookId: string): Promise<ChatMessage[]> {
    const { data } = await supabase.from('chat_messages').select('*').eq('book_id', bookId).order('created_at', { ascending: true })
    return (data || []).map(r => ({
      id: r.id, bookId: r.book_id, userId: r.user_id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      parsedRecords: r.parsed_records,
      createdAt: r.created_at
    }))
  },

  async addChatMessage(bookId: string, userId: string, role: 'user' | 'assistant', content: string, parsedRecords?: ChatMessage['parsedRecords']): Promise<ChatMessage> {
    const msg = { id: generateId(), bookId, userId, role, content, parsedRecords, createdAt: new Date().toISOString() }
    await supabase.from('chat_messages').insert({
      id: msg.id, book_id: msg.bookId, user_id: msg.userId,
      role: msg.role, content: msg.content,
      parsed_records: parsedRecords || null
    })
    return msg
  },

  // 储蓄目标
  async updateSavingsGoal(bookId: string, title: string, targetAmount: number): Promise<void> {
    const { data: existing } = await supabase.from('savings_goals').select('id').eq('book_id', bookId).single()
    if (existing) {
      await supabase.from('savings_goals').update({ title, target_amount: targetAmount }).eq('book_id', bookId)
    } else {
      await supabase.from('savings_goals').insert({ id: generateId(), book_id: bookId, title, target_amount: targetAmount })
    }
  }
}