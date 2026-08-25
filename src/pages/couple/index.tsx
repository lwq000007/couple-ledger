import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Heart, Target, Calendar } from 'lucide-react-taro'

const CouplePage = () => {
  const { book, monthlyStats, updateSavingsGoal } = useAppStore()

  const [showGoalEdit, setShowGoalEdit] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalAmount, setGoalAmount] = useState('')

  useEffect(() => {
    if (book) {
      setGoalTitle(book.savingsGoal.title)
      setGoalAmount(String(book.savingsGoal.targetAmount))
    }
  }, [book?.id])

  const handleSaveGoal = async () => {
    if (!goalTitle.trim() || !goalAmount) return
    await updateSavingsGoal(goalTitle.trim(), parseFloat(goalAmount))
    setShowGoalEdit(false)
  }

  // 计算记账天数
  const getDaysSinceCreation = () => {
    if (!book?.createdAt) return 0
    const created = new Date(book.createdAt)
    const now = new Date()
    return Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const savingsProgress = book
    ? Math.min(Math.round((book.savingsGoal.currentAmount / book.savingsGoal.targetAmount) * 100), 100)
    : 0

  const totalExpense = monthlyStats?.totalExpense || 0
  const memberExpense = monthlyStats?.memberExpense || []
  const maxMemberAmount = Math.max(...memberExpense.map(m => m.amount), 1)

  return (
    <View className="min-h-screen bg-[#FFF9F5]">
      <ScrollView scrollY className="px-4 pt-4 pb-20" style={{ height: '100vh' }}>
        {/* 头部 */}
        <View className="text-center mb-4">
          <Text className="block text-xl font-bold text-[#5D4037]">情侣空间</Text>
          {book && (
            <Text className="block text-xs text-[#BCAAA4] mt-1">
              已一起记账 {getDaysSinceCreation()} 天
            </Text>
          )}
        </View>

        {/* 储蓄目标 */}
        <Card className="rounded-2xl shadow-sm mb-4 overflow-hidden">
          <View className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] p-4">
            <View className="flex items-center justify-between mb-2">
              <View className="flex items-center gap-2">
                <Target size={18} color="#ffffff" />
                <Text className="text-sm font-medium text-white">{book?.savingsGoal.title || '储蓄目标'}</Text>
              </View>
              <Button
                variant="ghost"
                className="h-7 px-2 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                onClick={() => setShowGoalEdit(true)}
              >
                <Text className="text-xs text-white">编辑</Text>
              </Button>
            </View>
            <View className="flex items-end justify-between mb-2">
              <Text className="text-2xl font-bold text-white">
                {book?.savingsGoal.currentAmount.toFixed(0) || '0'}
              </Text>
              <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                / {book?.savingsGoal.targetAmount.toFixed(0) || '0'} 元
              </Text>
            </View>
            <View className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <View
                className="bg-white rounded-full h-2"
                style={{ width: `${savingsProgress}%` }}
              />
            </View>
            <Text className="block text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>已完成 {savingsProgress}%</Text>
          </View>
        </Card>

        {/* 双方支出对比 */}
        {memberExpense.length > 0 && (
          <Card className="rounded-2xl shadow-sm mb-4">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-4">
                <Heart size={18} color="#FF6B6B" />
                <Text className="block text-base font-bold text-[#5D4037]">双方支出对比</Text>
              </View>

              {memberExpense.map(member => (
                <View key={member.userId} className="mb-4 last:mb-0">
                  <View className="flex items-center justify-between mb-2">
                    <View className="flex items-center gap-2">
                      <View className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center">
                        <Text className="text-xs text-white">{member.name.charAt(0)}</Text>
                      </View>
                      <Text className="text-sm font-medium text-[#5D4037]">{member.name}</Text>
                    </View>
                    <Text className="text-sm font-bold text-[#FF6B6B]">{member.amount.toFixed(2)} 元</Text>
                  </View>
                  <View className="w-full bg-[#FFF0E8] rounded-full h-3">
                    <View
                      className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] rounded-full h-3"
                      style={{ width: `${Math.max((member.amount / maxMemberAmount) * 100, 2)}%` }}
                    />
                  </View>
                </View>
              ))}

              {memberExpense.length === 2 && (
                <View className="mt-3 pt-3 border-t border-[#FFF0E8] text-center">
                  <Text className="text-xs text-[#8D6E63]">
                    {memberExpense[0].amount > memberExpense[1].amount
                      ? `${memberExpense[0].name}本月花得多一些哦`
                      : memberExpense[0].amount < memberExpense[1].amount
                        ? `${memberExpense[1].name}本月花得多一些哦`
                        : '你们花得一样多'}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* 温馨统计 */}
        <Card className="rounded-2xl shadow-sm mb-4">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              <Calendar size={18} color="#FF8E53" />
              <Text className="block text-base font-bold text-[#5D4037]">温馨数据</Text>
            </View>
            <View className="grid grid-cols-2 gap-3">
              <View className="bg-[#FFF0E8] rounded-xl p-3 text-center">
                <Text className="block text-2xl font-bold text-[#FF6B6B]">{getDaysSinceCreation()}</Text>
                <Text className="block text-xs text-[#8D6E63] mt-1">记账天数</Text>
              </View>
              <View className="bg-[#FFF0E8] rounded-xl p-3 text-center">
                <Text className="block text-2xl font-bold text-[#FF8E53]">{book?.members.length || 0}</Text>
                <Text className="block text-xs text-[#8D6E63] mt-1">共同记账人</Text>
              </View>
              <View className="bg-[#FFF0E8] rounded-xl p-3 text-center">
                <Text className="block text-2xl font-bold text-[#66BB6A]">{totalExpense.toFixed(0)}</Text>
                <Text className="block text-xs text-[#8D6E63] mt-1">本月支出(元)</Text>
              </View>
              <View className="bg-[#FFF0E8] rounded-xl p-3 text-center">
                <Text className="block text-2xl font-bold text-[#5C6BC0]">{savingsProgress}%</Text>
                <Text className="block text-xs text-[#8D6E63] mt-1">目标完成度</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 未配对提示 */}
        {book && book.members.length < 2 && (
          <Card className="rounded-2xl shadow-sm mb-4 border border-dashed border-[#FF8E53]">
            <CardContent className="p-4 text-center">
              <Text className="block text-3xl mb-2">💌</Text>
              <Text className="block text-sm text-[#5D4037] mb-1">邀请你的另一半</Text>
              <Text className="block text-xs text-[#BCAAA4] mb-3">
                去「我的」页面分享邀请码，一起记账吧~
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {/* 编辑目标弹窗 */}
      <Dialog open={showGoalEdit} onOpenChange={setShowGoalEdit}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <Text className="block text-lg font-bold text-[#5D4037]">编辑储蓄目标</Text>
          </DialogHeader>
          <View className="py-2">
            <Text className="block text-sm text-[#8D6E63] mb-2">目标名称</Text>
            <View className="bg-[#FFF0E8] rounded-xl px-4 py-3 mb-3">
              <Input
                className="w-full bg-transparent text-[#5D4037]"
                placeholder="如：旅行基金"
                value={goalTitle}
                onInput={e => setGoalTitle(e.detail.value)}
              />
            </View>
            <Text className="block text-sm text-[#8D6E63] mb-2">目标金额</Text>
            <View className="bg-[#FFF0E8] rounded-xl px-4 py-3 mb-4">
              <Input
                className="w-full bg-transparent text-[#5D4037]"
                placeholder="输入目标金额"
                type="digit"
                value={goalAmount}
                onInput={e => setGoalAmount(e.detail.value)}
              />
            </View>
          </View>
          <View className="flex gap-3">
            <Button
              className="flex-1 rounded-xl bg-[#FFF0E8] text-[#8D6E63]"
              onClick={() => setShowGoalEdit(false)}
            >
              <Text className="text-[#8D6E63]">取消</Text>
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white"
              onClick={handleSaveGoal}
            >
              <Text className="text-white">保存</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export default CouplePage
