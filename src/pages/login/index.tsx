import { useState } from 'react'
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

export default function LoginPage() {
  const { login, joinBook, loadBook } = useAppStore()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 检查URL中是否有邀请码
  const inviteCode = getUrlParam('invite')

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isRegister) {
        // 注册
        const res = await Network.request({
          url: '/api/auth/register',
          method: 'POST',
          data: {
            username: username.trim(),
            password: password.trim(),
            displayName: displayName.trim() || username.trim(),
          },
        })
        console.log('Register response:', res.data)
        const data = res.data as { code: number; msg: string; data: { userId: string } }
        if (data.code === 200 && data.data?.userId) {
          // 注册成功后登录
          login(data.data.userId, username.trim())
          // 如果有邀请码，自动加入账本
          if (inviteCode) {
            const success = await joinBook(inviteCode)
            if (success) {
              await loadBook()
              Taro.showToast({ title: '已加入账本', icon: 'success' })
            }
          }
          Taro.redirectTo({ url: '/pages/index/index' })
        } else {
          setError(data.msg || '注册失败')
        }
      } else {
        // 登录
        const res = await Network.request({
          url: '/api/auth/login',
          method: 'POST',
          data: {
            username: username.trim(),
            password: password.trim(),
          },
        })
        console.log('Login response:', res.data)
        const data = res.data as { code: number; msg: string; data: { userId: string; user: { name: string } } }
        if (data.code === 200 && data.data?.userId) {
          login(data.data.userId, data.data.user?.name || username.trim())
          // 如果有邀请码，自动加入账本
          if (inviteCode) {
            const success = await joinBook(inviteCode)
            if (success) {
              await loadBook()
              Taro.showToast({ title: '已加入账本', icon: 'success' })
            }
          }
          Taro.redirectTo({ url: '/pages/index/index' })
        } else {
          setError(data.msg || '登录失败')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <View className="mb-8 text-center">
        <Text className="block text-5xl mb-2">💑</Text>
        <Text className="block text-2xl font-bold text-stone-800">俩个人的账本</Text>
        <Text className="block text-sm text-stone-500 mt-1">和TA一起记录每一笔</Text>
      </View>

      {/* Invite hint */}
      {inviteCode ? (
        <View className="mb-4 px-4 py-2 bg-coral-50 rounded-xl">
          <Text className="block text-sm text-coral text-center">
            有人邀请你加入账本，登录后自动加入
          </Text>
        </View>
      ) : null}

      {/* Login Card */}
      <Card className="w-full max-w-sm bg-white rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <Text className="block text-lg font-semibold text-stone-800 mb-4">
            {isRegister ? '注册新账号' : '登录'}
          </Text>

          <View className="space-y-3">
            <View>
              <Text className="block text-xs text-stone-500 mb-1">用户名</Text>
              <View className="bg-stone-50 rounded-xl px-4 py-2">
                <Input
                  className="w-full bg-transparent text-sm"
                  placeholder="输入用户名"
                  value={username}
                  onInput={(e) => setUsername(e.detail.value)}
                />
              </View>
            </View>

            <View>
              <Text className="block text-xs text-stone-500 mb-1">密码</Text>
              <View className="bg-stone-50 rounded-xl px-4 py-2">
                <Input
                  className="w-full bg-transparent text-sm"
                  placeholder="输入密码"
                  password
                  value={password}
                  onInput={(e) => setPassword(e.detail.value)}
                />
              </View>
            </View>

            {isRegister && (
              <View>
                <Text className="block text-xs text-stone-500 mb-1">昵称（可选）</Text>
                <View className="bg-stone-50 rounded-xl px-4 py-2">
                  <Input
                    className="w-full bg-transparent text-sm"
                    placeholder="你想被称呼的名字"
                    value={displayName}
                    onInput={(e) => setDisplayName(e.detail.value)}
                  />
                </View>
              </View>
            )}
          </View>

          {error ? (
            <Text className="block text-xs text-red-500 mt-3">{error}</Text>
          ) : null}

          <Button
            className="w-full mt-5 h-11 rounded-xl text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white">{loading ? '处理中...' : isRegister ? '注册' : '登录'}</Text>
          </Button>

          <View className="mt-4 text-center">
            <Text
              className="text-sm text-coral"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Hint */}
      <View className="mt-6 text-center">
        <Text className="block text-xs text-stone-400">
          注册后告诉对方你的用户名和密码
        </Text>
        <Text className="block text-xs text-stone-400 mt-1">
           TA登录后即可一起记账
        </Text>
      </View>
    </View>
  )
}
