import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAppStore } from '@/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Funnel, Trash2 } from 'lucide-react-taro'
import type { ExpenseRecord } from '@/store'

const DetailPage = () => {
  const { book, categories, expenses, loadExpenses, deleteExpense, loadMonthlyStats } = useAppStore()

  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [showFilter, setShowFilter] = useState(false)
  const [swipedId, setSwipedId] = useState<string | null>(null)

  useEffect(() => {
    if (book) {
      const filters: { type?: string; categoryId?: string } = {}
      if (filterType !== 'all') filters.type = filterType
      if (filterCategoryId) filters.categoryId = filterCategoryId
      loadExpenses(filters)
    }
  }, [book?.id, filterType, filterCategoryId])

  const handleDelete = async (recordId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          await deleteExpense(recordId)
          const now = new Date()
          await loadExpenses()
          await loadMonthlyStats(now.getFullYear(), now.getMonth() + 1)
          setSwipedId(null)
        }
      },
    })
  }

  // 按日期分组
  const groupedByDate = expenses.reduce<Record<string, ExpenseRecord[]>>((acc, record) => {
    if (!acc[record.date]) acc[record.date] = []
    acc[record.date].push(record)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) return '今天'
    if (dateStr === yesterday.toISOString().split('T')[0]) return '昨天'

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
  }

  const getDayTotal = (records: ExpenseRecord[]) => {
    const expense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
    const income = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    return { expense, income }
  }

  return (
    <View className="min-h-screen bg-[#FFF9F5]">
      {/* 筛选栏 */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex items-center justify-between mb-3">
          <Text className="block text-xl font-bold text-[#5D4037]">明细</Text>
          <Button
            variant="ghost"
            className="rounded-full bg-[#FFF0E8] h-8 px-3"
            onClick={() => setShowFilter(!showFilter)}
          >
            <Funnel size={14} color="#FF8E53" />
            <Text className="text-xs text-[#FF8E53] ml-1">筛选</Text>
          </Button>
        </View>

        {/* 类型切换 */}
        <View className="flex gap-2 mb-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'expense', label: '支出' },
            { key: 'income', label: '收入' },
          ].map(item => (
            <View
              key={item.key}
              className={`px-4 py-2 rounded-full ${filterType === item.key ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53]' : 'bg-white'}`}
              onClick={() => { setFilterType(item.key); setFilterCategoryId('') }}
            >
              <Text className={`text-xs ${filterType === item.key ? 'text-white font-medium' : 'text-[#8D6E63]'}`}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 分类筛选 */}
        {showFilter && (
          <ScrollView scrollX className="whitespace-nowrap py-2">
            <View className="flex gap-2">
              <View
                className={`px-3 py-1 rounded-full flex-shrink-0 ${!filterCategoryId ? 'bg-[#FF6B6B]' : 'bg-white'}`}
                onClick={() => setFilterCategoryId('')}
              >
                <Text className={`text-xs ${!filterCategoryId ? 'text-white' : 'text-[#8D6E63]'}`}>全部分类</Text>
              </View>
              {categories.map(cat => (
                <View
                  key={cat.id}
                  className={`px-3 py-1 rounded-full flex-shrink-0 ${filterCategoryId === cat.id ? 'bg-[#FF6B6B]' : 'bg-white'}`}
                  onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? '' : cat.id)}
                >
                  <Text className={`text-xs ${filterCategoryId === cat.id ? 'text-white' : 'text-[#8D6E63]'}`}>
                    {cat.emoji} {cat.name}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* 记录列表 */}
      <ScrollView scrollY className="px-4 pb-20" style={{ height: 'calc(100vh - 200px)' }}>
        {sortedDates.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="block text-4xl mb-3">📋</Text>
            <Text className="block text-sm text-[#8D6E63]">还没有记录哦</Text>
            <Text className="block text-xs text-[#BCAAA4] mt-1">去首页记一笔吧~</Text>
          </View>
        ) : (
          sortedDates.map(date => {
            const records = groupedByDate[date]
            const dayTotal = getDayTotal(records)
            return (
              <View key={date} className="mb-4">
                {/* 日期头 */}
                <View className="flex items-center justify-between py-2">
                  <Text className="block text-sm font-medium text-[#5D4037]">{formatDate(date)}</Text>
                  <View className="flex gap-3">
                    {dayTotal.expense > 0 && (
                      <Text className="text-xs text-[#FF6B6B]">支出 {dayTotal.expense.toFixed(2)}</Text>
                    )}
                    {dayTotal.income > 0 && (
                      <Text className="text-xs text-[#66BB6A]">收入 {dayTotal.income.toFixed(2)}</Text>
                    )}
                  </View>
                </View>

                {/* 记录卡片 */}
                <Card className="rounded-2xl shadow-sm overflow-hidden mb-2">
                  {records.map((record, idx) => (
                    <View key={record.id} className="relative">
                      <View
                        className={`flex items-center justify-between px-4 py-3 ${idx < records.length - 1 ? 'border-b border-[#FFF0E8]' : ''}`}
                        onClick={() => setSwipedId(swipedId === record.id ? null : record.id)}
                      >
                        <View className="flex items-center gap-3 flex-1">
                          <View
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${categories.find(c => c.id === record.categoryId)?.color || '#90A4AE'}15` }}
                          >
                            <Text className="text-lg">{record.categoryEmoji}</Text>
                          </View>
                          <View className="flex-1">
                            <View className="flex items-center gap-2">
                              <Text className="block text-sm font-medium text-[#5D4037]">{record.categoryName}</Text>
                              <Badge className="bg-[#FFF0E8] border-0 px-2 py-0">
                                <Text className="text-xs text-[#BCAAA4]">{record.userName}</Text>
                              </Badge>
                            </View>
                            {record.note ? (
                              <Text className="block text-xs text-[#BCAAA4] mt-1">{record.note}</Text>
                            ) : null}
                          </View>
                        </View>
                        <Text className={`text-base font-bold ${record.type === 'income' ? 'text-[#66BB6A]' : 'text-[#FF6B6B]'}`}>
                          {record.type === 'income' ? '+' : '-'}{record.amount.toFixed(2)}
                        </Text>
                      </View>

                      {/* 删除按钮 */}
                      {swipedId === record.id && (
                        <View
                          className="absolute right-0 top-0 bottom-0 w-16 bg-[#FF6B6B] flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); handleDelete(record.id) }}
                        >
                          <Trash2 size={18} color="#ffffff" />
                        </View>
                      )}
                    </View>
                  ))}
                </Card>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

export default DetailPage
