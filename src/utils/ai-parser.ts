// AI 自然语言记账解析器
// 根据关键词匹配分类，提取金额，支持单笔/多笔混合输入

export interface CategoryInfo {
  id: string
  name: string
  emoji: string
  color: string
}

export interface ParsedItem {
  categoryId: string
  categoryName: string
  categoryEmoji: string
  amount: number
  note: string
  type: 'expense' | 'income'
}

// 分类关键词映射
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['吃饭', '午餐', '晚餐', '早餐', '外卖', '饭', '菜', '面', '粉', '火锅', '烧烤', '小吃', '快餐', '麦当劳', '肯德基', 'kfc', '奶茶', '咖啡', '饮料', '果汁', '酒', '宵夜', '零食', '水果', '蛋糕', '面包', '甜点', '早餐', '午饭', '晚饭', '食堂', '美团', '饿了么', '点餐', '鸡腿', '汉堡', '披萨', '寿司', '麻辣烫', '冒菜', '串串', '炸鸡', '烧烤', '粥', '包子', '饺子', '馄饨', '豆浆', '粥', '茶', '啤酒', '红酒', '白酒', '酸奶', '矿泉水', '可乐', '雪碧'],
  transport: ['打车', '地铁', '公交', '滴滴', '出租', '加油', '停车', '过路费', '高铁', '火车', '飞机', '机票', '共享单车', '骑车', '交通', '高速', 'ETC', '充电', '摩拜', '哈啰', '青桔'],
  shopping: ['超市', '淘宝', '京东', '拼多多', '购物', '买', '日用品', '纸巾', '洗衣液', '牙膏', '洗发水', '沐浴露', '化妆品', '护肤', '面膜'],
  entertainment: ['电影', '游戏', 'KTV', '唱歌', '唱歌', '旅游', '门票', '景区', '乐园', '演出', '音乐会', '话剧', '展览', '健身', '运动', '球', '跑步', '游泳', '瑜伽', 'spa', '按摩', '剧本杀', '密室'],
  home: ['房租', '水电', '电费', '水费', '燃气', '物业', '网费', '宽带', '家具', '家电', '装修', '维修', '打扫', '保洁', '煤气'],
  medical: ['医院', '药', '体检', '看病', '挂号', '门诊', '牙科', '眼科', '体检', '保险', '医疗', '感冒', '发烧'],
  education: ['书', '课程', '培训', '学费', '考试', '文具', '网课', '辅导', '教材'],
  clothing: ['衣服', '裤子', '鞋', '包', '帽子', '外套', '裙子', 'T恤', '卫衣', '运动服', '内衣', '袜子'],
  digital: ['手机', '电脑', '平板', '耳机', '充电器', '数据线', '键盘', '鼠标', 'U盘', '硬盘', '相机'],
  gift: ['礼物', '红包', '生日', '情人节', '纪念日', '七夕', '圣诞', '礼物', '惊喜', '花', '玫瑰'],
  pet: ['猫粮', '狗粮', '宠物', '猫', '狗', '兽医', '宠物医院'],
  social: ['聚餐', '聚会', '请客', '份子钱', '随礼', '红包', 'AA', '应酬', '团建'],
  salary: ['工资', '薪水', '底薪', '月薪'],
  bonus: ['奖金', '年终奖', '绩效', '提成', '加班费', '补贴'],
  other_income: ['收入', '进账', '到账', '收款', '回款', '报销'],
}

// 从文本中提取金额
function extractAmounts(text: string): number[] {
  const amounts: number[] = []

  // 匹配模式：数字 + 元/块/¥ 或者 纯数字（前后有特定上下文）
  const patterns = [
    /(\d+\.?\d*)\s*[元块¥]/g,
    /[花了消费支出共计总共]*\s*(\d+\.?\d*)\s*[元块¥]?/g,
    /(\d+\.?\d*)\s*[元块]/g,
    /[¥￥]\s*(\d+\.?\d*)/g,
  ]

  // 先尝试用 "XX元" 格式
  const directMatches = text.match(/(\d+\.?\d*)\s*[元块¥]/g)
  if (directMatches) {
    directMatches.forEach(m => {
      const num = parseFloat(m.match(/(\d+\.?\d*)/)?.[1] || '0')
      if (num > 0) amounts.push(num)
    })
    return amounts
  }

  // 尝试从 "花了XX" 格式提取
  const spentMatches = text.match(/(?:花了|消费|支出|共计|总共|花了|用|付|花)\s*(\d+\.?\d*)/g)
  if (spentMatches) {
    spentMatches.forEach(m => {
      const num = parseFloat(m.match(/(\d+\.?\d*)/)?.[1] || '0')
      if (num > 0) amounts.push(num)
    })
    return amounts
  }

  // 使用通用 patterns
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(m => {
      const num = parseFloat(m[1])
      if (num > 0 && !amounts.includes(num)) {
        amounts.push(num)
      }
    })
    if (amounts.length > 0) break
  }

  return amounts
}

// 检测是收入还是支出
function detectType(text: string, category: string): 'expense' | 'income' {
  const incomeKeywords = ['工资', '收入', '进账', '到账', '收款', '回款', '报销', '奖金', '年终奖', '提成', '赚了', '收到']
  const isIncome = incomeKeywords.some(k => text.includes(k))
  if (isIncome) return 'income'

  const incomeCategories = ['salary', 'bonus', 'other_income']
  if (incomeCategories.includes(category)) return 'income'

  return 'expense'
}

// 匹配分类
function matchCategory(text: string): CategoryInfo | null {
  let bestMatch: { id: string; count: number } | null = null

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let count = 0
    for (const kw of keywords) {
      if (text.includes(kw)) count++
    }
    if (count > 0 && (!bestMatch || count > bestMatch.count)) {
      bestMatch = { id: catId, count }
    }
  }

  if (bestMatch) {
    const cat = CATEGORIES.find(c => c.id === bestMatch!.id)
    return cat || null
  }
  return null
}

// 内置分类列表
const CATEGORIES: CategoryInfo[] = [
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

// 分割多条记录
function splitItems(text: string): string[] {
  // 用 "还"、"又"、"也"、"、"、"和"、"以及" 等分隔
  const separators = /(?:，|,|；|;|还|又|也|以及|和)/
  const parts = text.split(separators).map(s => s.trim()).filter(s => s.length > 0)
  return parts.length > 1 ? parts : [text]
}

// 提取备注
function extractNote(text: string): string {
  // 移除金额部分，剩余作为备注
  const cleaned = text
    .replace(/(\d+\.?\d*)\s*[元块¥]/g, '')
    .replace(/花了|消费|支出|共计|总共|花|用|付/g, '')
    .trim()
  return cleaned
}

// 主解析函数
export function parseExpenseText(text: string): { items: ParsedItem[]; message: string } {
  if (!text.trim()) {
    return { items: [], message: '请输入记账内容哦~' }
  }

  const parts = splitItems(text)
  const items: ParsedItem[] = []

  for (const part of parts) {
    const category = matchCategory(part)
    const amounts = extractAmounts(part)

    if (amounts.length === 0) {
      continue
    }

    for (const amount of amounts) {
      const cat = category || CATEGORIES.find(c => c.id === 'other')!
      const type = detectType(part, cat.id)
      const note = extractNote(part)

      items.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.emoji,
        amount,
        note,
        type,
      })
    }
  }

  if (items.length === 0) {
    return {
      items: [],
      message: '没有识别到金额信息，请描述一下花了多少钱吧~ 例如："午饭花了25元"',
    }
  }

  const totalAmount = items.reduce((s, i) => s + i.amount, 0)
  const typeText = items.some(i => i.type === 'income') ? '收入' : '支出'
  const message = `已识别 ${items.length} 笔${typeText}，共 ${totalAmount.toFixed(1)} 元`

  return { items, message }
}

export function getCategories(): CategoryInfo[] {
  return CATEGORIES
}
