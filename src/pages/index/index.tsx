import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect, useRef } from 'react'
import Taro from '@tarojs/taro'
import { useAppStore } from '@/store'
import { parseExpenseText } from '@/utils/ai-parser'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Send } from 'lucide-react-taro'
import './index.css'

const IndexPage = () => {
  const {
    userName, book, chatMessages, monthlyStats, pendingInviteCode, isLoggedIn,
    initUser, loadBook, loadCategories, loadChatMessages,
    loadMonthlyStats, addChatMessage, batchAddExpenses, createBook, joinBook,
  } = useAppStore()

  const [inputText, setInputText] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [setupName, setSetupName] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingItems, setPendingItems] = useState<Array<{
    categoryId: string; categoryName: string; categoryEmoji: string
    amount: number; note: string; type: 'expense' | 'income'; confirmed: boolean
  }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollId = useRef('')

  // 检查登录状态，未登录则跳转到登录页
  useEffect(() => {
    if (!isLoggedIn) {
      Taro.redirectTo({ url: '/pages/login/index' })
    }
  }, [isLoggedIn])

  useEffect(() => {
    const init = async () => {
      const storedName = Taro.getStorageSync('userName')
      await initUser(storedName || undefined)
      await loadBook()
      await loadCategories()

      // 如果URL中有邀请码，自动加入账本
      if (pendingInviteCode) {
        const success = await joinBook(pendingInviteCode)
        if (success) {
          Taro.showToast({ title: '已加入账本', icon: 'success' })
          await loadBook()
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (book) {
      loadChatMessages()
      const now = new Date()
      loadMonthlyStats(now.getFullYear(), now.getMonth() + 1)
    }
  }, [book?.id])

  useEffect(() => {
    if (!userName && !showSetup) {
      setShowSetup(true)
    }
  }, [userName])

  const handleSetup = async () => {
    if (!setupName.trim()) return
    Taro.setStorageSync('userName', setupName.trim())
    await initUser(setupName.trim())
    await createBook(`${setupName.trim()}的小账本`)
    setShowSetup(false)
  }

  const handleSend = async () => {
    if (!inputText.trim() || !book || isProcessing) return

    const text = inputText.trim()
    setInputText('')
    setIsProcessing(true)

    // 添加用户消息
    await addChatMessage('user', text)

    // AI 解析
    const result = parseExpenseText(text)

    if (result.items.length > 0) {
      const parsedRecords = result.items.map(item => ({
        ...item,
        confirmed: false,
      }))
      setPendingItems(parsedRecords)

      await addChatMessage(
        'assistant',
        result.message,
        parsedRecords,
      )
      setShowConfirm(true)
    } else {
      await addChatMessage('assistant', result.message)
    }

    setIsProcessing(false)

    // 滚动到底部
    setTimeout(() => {
      scrollId.current = `msg-${Date.now()}`
    }, 100)
  }

  const handleConfirmRecords = async () => {
    if (pendingItems.length === 0 || !book) return

    const confirmedItems = pendingItems.filter(i => i.confirmed !== false)
    if (confirmedItems.length === 0) {
      setShowConfirm(false)
      setPendingItems([])
      return
    }

    const records = confirmedItems.map(item => ({
      type: item.type,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categoryEmoji: item.categoryEmoji,
      amount: item.amount,
      note: item.note,
      date: new Date().toISOString().split('T')[0],
    }))

    await batchAddExpenses(records)
    await addChatMessage('assistant', `已记录 ${confirmedItems.length} 笔账目~`)

    // 刷新统计
    const now = new Date()
    await loadMonthlyStats(now.getFullYear(), now.getMonth() + 1)

    setShowConfirm(false)
    setPendingItems([])
  }

  const toggleItemConfirm = (index: number) => {
    setPendingItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, confirmed: item.confirmed === false ? true : false } : item,
      ),
    )
  }

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // 初始设置弹窗
  if (showSetup) {
    return (
      <View className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center px-6">
        <View className="text-center mb-8">
          <Text className="block text-5xl mb-4">💑</Text>
          <Text className="block text-2xl font-bold text-[#5D4037] mb-2">俩个人的账本</Text>
          <Text className="block text-sm text-[#8D6E63]">记录你们的每一笔共同生活</Text>
        </View>
        <Card className="w-full rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <Text className="block text-base font-medium text-[#5D4037] mb-4">你叫什么名字呀？</Text>
            <View className="bg-[#FFF0E8] rounded-xl px-4 py-3 mb-4">
              <Input
                className="w-full bg-transparent text-[#5D4037]"
                placeholder="输入你的名字"
                value={setupName}
                onInput={e => setSetupName(e.detail.value)}
                onConfirm={handleSetup}
              />
            </View>
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white font-medium"
              onClick={handleSetup}
            >
              <Text className="text-white">开始记账</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-[#FFF9F5] flex flex-col">
      {/* 概览区域 */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex items-center justify-between mb-3">
          <View>
            <Text className="block text-lg font-bold text-[#5D4037]">{currentMonth}月账本</Text>
            <Text className="block text-xs text-[#BCAAA4]">{currentYear}年{currentMonth}月</Text>
          </View>
          {book && (
            <Badge className="bg-[#FFF0E8] text-[#FF8E53] border-0">
              <Text className="text-xs text-[#FF8E53]">{book.members.length}人共同记账</Text>
            </Badge>
          )}
        </View>

        {/* 统计卡片 */}
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <View className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] p-4">
            <View className="flex justify-between items-center">
              <View className="flex-1">
                <Text className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>本月支出</Text>
                <Text className="block text-2xl font-bold text-white">
                  {monthlyStats?.totalExpense.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View className="mx-4" style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View className="flex-1">
                <Text className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>本月收入</Text>
                <Text className="block text-2xl font-bold text-white">
                  {monthlyStats?.totalIncome.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View className="mx-4" style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View className="flex-1">
                <Text className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>结余</Text>
                <Text className="block text-2xl font-bold text-white">
                  {monthlyStats?.balance.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* 分类支出 */}
      {monthlyStats && monthlyStats.categoryBreakdown.length > 0 && (
        <View className="px-4 py-2">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <View className="flex items-center justify-between mb-3">
                <Text className="block text-base font-bold text-[#5D4037]">支出分类</Text>
              </View>
              <View className="flex flex-wrap gap-2">
                {monthlyStats.categoryBreakdown.slice(0, 6).map(cat => (
                  <View key={cat.categoryId} className="flex items-center gap-1 bg-[#FFF0E8] rounded-full px-3 py-2">
                    <Text className="text-sm">{cat.emoji}</Text>
                    <Text className="text-xs text-[#5D4037]">{cat.name}</Text>
                    <Text className="text-xs text-[#FF6B6B] font-medium">{cat.percentage}%</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        </View>
      )}

      {/* 近7天趋势 */}
      {monthlyStats && monthlyStats.dailyTrend.some(d => d.amount > 0) && (
        <View className="px-4 py-2">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <Text className="block text-base font-bold text-[#5D4037] mb-3">近7天趋势</Text>
              <View className="flex items-end justify-between h-20 gap-1">
                {monthlyStats.dailyTrend.map((day, idx) => {
                  const maxAmount = Math.max(...monthlyStats.dailyTrend.map(d => d.amount), 1)
                  const height = Math.max((day.amount / maxAmount) * 100, 4)
                  const dayLabel = day.date.split('-')[2]
                  return (
                    <View key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <View
                        className="w-full rounded-t-md bg-gradient-to-t from-[#FF6B6B] to-[#FF8E53]"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      <Text className="text-xs text-[#BCAAA4]">{parseInt(dayLabel)}日</Text>
                    </View>
                  )
                })}
              </View>
            </CardContent>
          </Card>
        </View>
      )}

      {/* 聊天记录 */}
      <ScrollView
        scrollY
        className="flex-1 px-4 py-2"
        scrollIntoView={scrollId.current}
        scrollWithAnimation
      >
        {chatMessages.length === 0 && !monthlyStats && (
          <View className="flex flex-col items-center justify-center py-12">
            <Text className="block text-4xl mb-3">📝</Text>
            <Text className="block text-sm text-[#8D6E63] text-center">
              在下方输入你的花销{'\n'}AI 会自动帮你记账哦~
            </Text>
          </View>
        )}

        {chatMessages.map(msg => (
          <View
            key={msg.id}
            id={`msg-${msg.id}`}
            className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <View className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center mr-2 flex-shrink-0">
                <Text className="text-xs text-white">AI</Text>
              </View>
            )}
            <View className={`max-w-70% ${msg.role === 'user' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] rounded-2xl rounded-br-sm' : 'bg-white rounded-2xl rounded-bl-sm shadow-sm'} px-4 py-2`}>
              <Text className={`block text-sm ${msg.role === 'user' ? 'text-white' : 'text-[#5D4037]'}`}>
                {msg.content}
              </Text>
              {msg.parsedRecords && msg.parsedRecords.length > 0 && (
                <View className="mt-2 pt-2 border-t border-[#FFE0D0]">
                  {msg.parsedRecords.map((record, idx) => (
                    <View key={idx} className="flex items-center justify-between py-1">
                      <View className="flex items-center gap-2">
                        <Text className="text-sm">{record.categoryEmoji}</Text>
                        <Text className="text-xs text-[#8D6E63]">{record.categoryName}</Text>
                      </View>
                      <Text className={`text-sm font-medium ${record.type === 'income' ? 'text-[#66BB6A]' : 'text-[#FF6B6B]'}`}>
                        {record.type === 'income' ? '+' : '-'}{record.amount.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {msg.role === 'user' && (
              <View className="w-8 h-8 rounded-full bg-[#FFF0E8] flex items-center justify-center ml-2 flex-shrink-0">
                <Text className="text-xs text-[#FF6B6B]">{userName?.charAt(0) || '我'}</Text>
              </View>
            )}
          </View>
        ))}

        {isProcessing && (
          <View className="flex justify-start mb-3">
            <View className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center mr-2">
              <Text className="text-xs text-white">AI</Text>
            </View>
            <View className="bg-white rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
              <Text className="block text-sm text-[#BCAAA4]">正在分析中...</Text>
            </View>
          </View>
        )}

        <View id={scrollId.current} className="h-4" />
      </ScrollView>

      {/* 底部输入栏 */}
      <View
        style={{
          position: 'fixed', bottom: 50, left: 0, right: 0,
          display: 'flex', flexDirection: 'row', gap: '8px',
          padding: '10px 16px', backgroundColor: '#fff',
          borderTop: '1px solid #FFE0D0', zIndex: 100,
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#FFF9F5', borderRadius: '20px', padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
          <Input
            style={{ width: '100%', fontSize: '14px', backgroundColor: 'transparent' }}
            placeholder="说说花了什么钱..."
            value={inputText}
            onInput={e => setInputText(e.detail.value)}
            onConfirm={handleSend}
            confirmType="send"
          />
        </View>
        <View style={{ flexShrink: 0 }}>
          <Button
            className="rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] w-10 h-10 p-0"
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
          >
            <Send size={18} color="#ffffff" />
          </Button>
        </View>
      </View>

      {/* 确认弹窗 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <Text className="block text-lg font-bold text-[#5D4037]">确认记账</Text>
          </DialogHeader>
          <View className="py-2">
            {pendingItems.map((item, idx) => (
              <View
                key={idx}
                className={`flex items-center justify-between py-3 px-3 rounded-xl mb-2 ${item.confirmed === false ? 'bg-gray-50 opacity-50' : 'bg-[#FFF0E8]'}`}
                onClick={() => toggleItemConfirm(idx)}
              >
                <View className="flex items-center gap-2">
                  <Text className="text-lg">{item.categoryEmoji}</Text>
                  <View>
                    <Text className="block text-sm font-medium text-[#5D4037]">{item.categoryName}</Text>
                    {item.note ? (
                      <Text className="block text-xs text-[#BCAAA4]">{item.note}</Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex items-center gap-2">
                  <Text className={`text-base font-bold ${item.type === 'income' ? 'text-[#66BB6A]' : 'text-[#FF6B6B]'}`}>
                    {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)}
                  </Text>
                  {item.confirmed !== false ? (
                    <View className="w-5 h-5 rounded-full bg-[#FF6B6B] flex items-center justify-center">
                      <Text className="text-xs text-white">✓</Text>
                    </View>
                  ) : (
                    <View className="w-5 h-5 rounded-full border-2 border-[#BCAAA4]" />
                  )}
                </View>
              </View>
            ))}
          </View>
          <View className="flex gap-3 mt-2">
            <Button
              className="flex-1 rounded-xl bg-[#FFF0E8] text-[#8D6E63]"
              onClick={() => setShowConfirm(false)}
            >
              <Text className="text-[#8D6E63]">取消</Text>
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white"
              onClick={handleConfirmRecords}
            >
              <Text className="text-white">确认记账</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* 底部占位 */}
      <View className="h-24" />
    </View>
  )
}

export default IndexPage
