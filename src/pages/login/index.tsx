import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Network } from '@/network'
import { useAppStore } from '@/store'

// 获取URL参数
const getUrlParam = (key: string): string => {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get(key) || ''
    }
  } catch { /* ignore */ }
  return ''
}

// 从localStorage获取或生成userId
const getOrCreateUserId = (): string => {
  try {
    const stored = Taro.getStorageSync('userId')
    if (stored) return stored
    const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    Taro.setStorageSync('userId', newId)
    return newId
  } catch {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

export default function LoginPage() {
  const { login, joinBook, loadBook } = useAppStore()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 检查URL中是否有邀请码
  const inviteCode = getUrlParam('invite')

  // 检查是否已登录
  useEffect(() => {
    const storedUserId = Taro.getStorageSync('userId')
    const storedUserName = Taro.getStorageSync('userName')
    if (storedUserId && storedUserName) {
      // 已登录，直接进入
      handleEnter(storedUserId, storedUserName)
    }
  }, [])

  const handleEnter = async (userId?: string, name?: string) => {
    const finalUserId = userId || getOrCreateUserId()
    const finalName = name || nickname.trim() || '匿名'

    if (!name && !nickname.trim()) {
      setError('请输入你的昵称')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 保存用户信息到localStorage
      Taro.setStorageSync('userId', finalUserId)
      Taro.setStorageSync('userName', finalName)

      // 登录
      login(finalUserId, finalName)

      // 如果有邀请码，尝试加入账本
      if (inviteCode) {
        const success = await joinBook(inviteCode)
        if (success) {
          await loadBook()
          Taro.showToast({ title: '已加入账本', icon: 'success' })
          Taro.redirectTo({ url: '/pages/index/index' })
          return
        }
      }

      // 没有邀请码或加入失败，检查是否已有账本
      try {
        const bookRes = await Network.request({
          url: '/api/book/info',
          method: 'GET',
          data: { userId: finalUserId },
        })
        const bookData = bookRes.data as { code: number; data: { id: string } | null }
        if (bookData.code === 200 && bookData.data?.id) {
          // 已有账本，直接加载
          await loadBook()
          Taro.redirectTo({ url: '/pages/index/index' })
          return
        }
      } catch { /* ignore */ }

      // 没有账本，创建一个
      const createRes = await Network.request({
        url: '/api/book/create',
        method: 'POST',
        data: {
          userId: finalUserId,
          name: `${finalName}的账本`,
        },
      })
      const createData = createRes.data as { code: number; data: { id: string } }
      if (createData.code === 200 && createData.data?.id) {
        await loadBook()
        Taro.redirectTo({ url: '/pages/index/index' })
      } else {
        setError('创建账本失败，请重试')
      }
    } catch (err) {
      console.error('Enter error:', err)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    handleEnter()
  }

  return (
    <View className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-white px-6">
      <View className="w-full max-w-sm">
        {/* Logo区域 */}
        <View className="flex flex-col items-center mb-10">
          <Text className="block text-6xl mb-4">💕</Text>
          <Text className="block text-2xl font-bold text-gray-800">
            俩个人的账本
          </Text>
          <Text className="block text-sm text-gray-500 mt-2">
            和TA一起记录每一笔
          </Text>
        </View>

        {/* 输入区域 */}
        <Card className="shadow-lg border-0 rounded-2xl">
          <CardContent className="p-6">
            {inviteCode ? (
              <View className="mb-4 p-3 bg-orange-50 rounded-xl">
                <Text className="block text-sm text-orange-600 text-center">
                  有人邀请你一起记账啦
                </Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="block text-sm text-gray-600 mb-2">
                输入你的昵称
              </Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  placeholder="比如：小明、宝宝"
                  value={nickname}
                  onInput={(e) => setNickname(e.detail.value)}
                  maxlength={20}
                />
              </View>
            </View>

            {error ? (
              <Text className="block text-sm text-red-500 mb-4 text-center">
                {error}
              </Text>
            ) : null}

            <Button
              className="w-full h-12 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-xl text-base font-medium"
              onClick={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white text-base">
                {loading ? '进入中...' : inviteCode ? '加入并记账' : '开始记账'}
              </Text>
            </Button>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <View className="mt-6 text-center">
          <Text className="block text-xs text-gray-400">
            你的数据会保存在这个设备上
          </Text>
          <Text className="block text-xs text-gray-400 mt-1">
            分享链接给朋友，一起记账吧
          </Text>
        </View>
      </View>
    </View>
  )
}
