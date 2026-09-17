import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAppStore } from '@/store'
import { supabaseService } from '@/services/supabase-service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { User, Copy, Users, Settings, ChevronRight, Heart, Share2 } from 'lucide-react-taro'

const ProfilePage = () => {
  const { userId, userName, book, joinBook } = useAppStore()

  const [showEditName, setShowEditName] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newName, setNewName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    setNewName(userName)
  }, [userName])

  const handleSaveName = async () => {
    if (!newName.trim()) return
    await supabaseService.updateUserProfile(userId, { displayName: newName.trim() })
    setShowEditName(false)
    Taro.showToast({ title: '已更新', icon: 'success' })
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    const success = await joinBook(inviteCode.trim().toUpperCase())
    if (success) {
      setShowJoin(false)
      setInviteCode('')
      Taro.showToast({ title: '加入成功', icon: 'success' })
    } else {
      Taro.showToast({ title: '邀请码无效', icon: 'none' })
    }
  }

  const handleCopyCode = () => {
    if (!book?.inviteCode) return
    Taro.setClipboardData({
      data: book.inviteCode,
      success: () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
    })
  }

  const handleCopyShareLink = () => {
    if (!book?.inviteCode) return
    const baseUrl = window.location.origin
    const link = `${baseUrl}?invite=${book.inviteCode}`
    Taro.setClipboardData({
      data: link,
      success: () => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      },
    })
  }

  return (
    <View className="min-h-screen bg-[#FFF9F5]">
      <ScrollView scrollY className="px-4 pt-4 pb-20" style={{ height: '100vh' }}>
        {/* 个人信息卡片 */}
        <Card className="rounded-2xl shadow-sm mb-4 overflow-hidden">
          <View className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] p-6">
            <View className="flex items-center gap-4">
              <View className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Text className="text-2xl text-white font-bold">{userName?.charAt(0) || '?'}</Text>
              </View>
              <View className="flex-1">
                <Text className="block text-lg font-bold text-white">{userName || '未设置'}</Text>
                <Text className="block text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {book ? `已加入「${book.name}」` : '还未创建账本'}
                </Text>
              </View>
              <Button
                variant="ghost"
                className="h-8 px-3 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                onClick={() => setShowEditName(true)}
              >
                <Text className="text-xs text-white">编辑</Text>
              </Button>
            </View>
          </View>
        </Card>

        {/* 邀请配对 */}
        {book && (
          <Card className="rounded-2xl shadow-sm mb-4">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-3">
                <Heart size={18} color="#FF6B6B" />
                <Text className="block text-base font-bold text-[#5D4037]">邀请配对</Text>
              </View>

              {book.members.length < 2 ? (
                <View>
                  <Text className="block text-sm text-[#8D6E63] mb-3">
                    分享链接给朋友，TA打开即可自动加入账本
                  </Text>
                  <View className="bg-[#FFF0E8] rounded-xl p-4 mb-3">
                    <View className="flex items-center justify-between mb-3">
                      <View>
                        <Text className="block text-xs text-[#BCAAA4] mb-1">我的邀请码</Text>
                        <Text className="block text-2xl font-bold text-[#FF6B6B] tracking-widest">
                          {book.inviteCode}
                        </Text>
                      </View>
                      <Button
                        className="rounded-xl bg-[#FFE0D0]"
                        onClick={handleCopyCode}
                      >
                        <Copy size={14} color="#FF6B6B" />
                        <Text className="text-[#FF6B6B] ml-1">{copied ? '已复制' : '复制码'}</Text>
                      </Button>
                    </View>
                    <Button
                      className="w-full rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white"
                      onClick={handleCopyShareLink}
                    >
                      <Share2 size={14} color="#ffffff" />
                      <Text className="text-white ml-1">{linkCopied ? '链接已复制，快发给TA' : '复制邀请链接'}</Text>
                    </Button>
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="block text-sm text-[#8D6E63] mb-3">
                    你们已成功配对，一起记账吧~
                  </Text>
                  {book.members.map(member => (
                    <View key={member.userId} className="flex items-center gap-3 py-2">
                      <View className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center">
                        <Text className="text-sm text-white font-medium">{member.name.charAt(0)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="block text-sm font-medium text-[#5D4037]">{member.name}</Text>
                        <Text className="block text-xs text-[#BCAAA4]">
                          {member.role === 'owner' ? '创建者' : '另一半'}
                        </Text>
                      </View>
                      <View className="w-2 h-2 rounded-full bg-[#66BB6A]" />
                    </View>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* 功能列表 */}
        <Card className="rounded-2xl shadow-sm mb-4">
          <View
            className="flex items-center justify-between px-4 py-4 border-b border-[#FFF0E8]"
            onClick={() => setShowJoin(true)}
          >
            <View className="flex items-center gap-3">
              <Users size={18} color="#FF8E53" />
              <Text className="text-sm text-[#5D4037]">加入他人账本</Text>
            </View>
            <ChevronRight size={16} color="#BCAAA4" />
          </View>
          <View className="flex items-center justify-between px-4 py-4 border-b border-[#FFF0E8]">
            <View className="flex items-center gap-3">
              <Settings size={18} color="#FF8E53" />
              <Text className="text-sm text-[#5D4037]">分类管理</Text>
            </View>
            <ChevronRight size={16} color="#BCAAA4" />
          </View>
          <View className="flex items-center justify-between px-4 py-4">
            <View className="flex items-center gap-3">
              <User size={18} color="#FF8E53" />
              <Text className="text-sm text-[#5D4037]">关于</Text>
            </View>
            <ChevronRight size={16} color="#BCAAA4" />
          </View>
        </Card>

        {/* 版本信息 */}
        <View className="text-center py-4">
          <Text className="block text-xs text-[#BCAAA4]">俩个人的账本 v1.0.0</Text>
          <Text className="block text-xs text-[#BCAAA4] mt-1">用心记录每一笔共同生活</Text>
        </View>
      </ScrollView>

      {/* 编辑名字弹窗 */}
      <Dialog open={showEditName} onOpenChange={setShowEditName}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <Text className="block text-lg font-bold text-[#5D4037]">修改昵称</Text>
          </DialogHeader>
          <View className="py-2">
            <View className="bg-[#FFF0E8] rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-[#5D4037]"
                placeholder="输入新昵称"
                value={newName}
                onInput={e => setNewName(e.detail.value)}
              />
            </View>
          </View>
          <View className="flex gap-3">
            <Button
              className="flex-1 rounded-xl bg-[#FFF0E8] text-[#8D6E63]"
              onClick={() => setShowEditName(false)}
            >
              <Text className="text-[#8D6E63]">取消</Text>
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white"
              onClick={handleSaveName}
            >
              <Text className="text-white">保存</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* 加入账本弹窗 */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <Text className="block text-lg font-bold text-[#5D4037]">加入账本</Text>
          </DialogHeader>
          <View className="py-2">
            <Text className="block text-sm text-[#8D6E63] mb-2">输入对方分享的邀请码</Text>
            <View className="bg-[#FFF0E8] rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-[#5D4037] text-center text-xl tracking-widest font-bold"
                placeholder="输入6位邀请码"
                value={inviteCode}
                onInput={e => setInviteCode(e.detail.value.toUpperCase())}
                maxlength={6}
              />
            </View>
          </View>
          <View className="flex gap-3">
            <Button
              className="flex-1 rounded-xl bg-[#FFF0E8] text-[#8D6E63]"
              onClick={() => setShowJoin(false)}
            >
              <Text className="text-[#8D6E63]">取消</Text>
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white"
              onClick={handleJoin}
            >
              <Text className="text-white">加入</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export default ProfilePage
