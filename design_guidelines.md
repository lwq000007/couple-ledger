# 设计指南 - 俩个人的账本

## 品牌定位

- 产品定位：情侣共同记账小程序，温馨、亲密、有烟火气
- 设计风格：暖系清新，圆角卡片，留白舒适
- 目标用户：恋爱中的年轻情侣，注重共同生活记录

## 配色方案

### 主色板
- 主色（珊瑚粉）：`bg-[#FF6B6B]` / `text-[#FF6B6B]`
- 辅助色（暖橘）：`bg-[#FF8E53]` / `text-[#FF8E53]`
- 渐变方向：从珊瑚粉到暖橘 `from-[#FF6B6B] to-[#FF8E53]`

### 背景色
- 页面背景（奶油白）：`bg-[#FFF9F5]`
- 卡片背景：`bg-white`
- 分组区域：`bg-[#FFF0E8]`

### 文字色
- 主文字（暖棕）：`text-[#5D4037]`
- 次要文字：`text-[#8D6E63]`
- 辅助/占位文字：`text-[#BCAAA4]`

### 语义色
- 收入（薄荷绿）：`text-[#66BB6A]` / `bg-[#E8F5E9]`
- 支出（珊瑚粉）：`text-[#FF6B6B]` / `bg-[#FFEBEE]`
- 警告/删除：`text-red-500`

## 字体规范

- 金额数字：`text-2xl font-bold`，使用等宽对齐
- 分类名称：`text-base font-medium`
- 时间/备注：`text-xs text-[#BCAAA4]`
- 页面标题：`text-xl font-bold text-[#5D4037]`

## 间距系统

- 页面水平边距：`px-4`
- 卡片内边距：`p-4`
- 卡片间距：`gap-3` 或 `mb-3`
- 卡片圆角：`rounded-2xl`
- 卡片阴影：`shadow-sm`

## 组件使用原则

- 通用 UI 组件（按钮、输入框、弹窗、Tabs、Card、Badge 等）优先使用 `@/components/ui/*`
- 新页面开发前先拆分 UI 单元，映射到组件库
- 禁止用 View/Text 手搓通用组件

## 导航结构

底部 TabBar 导航（5个Tab）：
1. 账本（首页概览）- pages/index/index
2. 明细 - pages/detail/index
3. 记一笔（中间突出按钮）- 触发弹窗/对话
4. 情侣空间 - pages/couple/index
5. 我的 - pages/profile/index

## 状态展示原则

- 空状态：温馨文案引导 + 柔和图标
- 加载态：Skeleton 骨架屏
- 操作反馈：轻量 Toast 提示
