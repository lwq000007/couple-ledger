import { Controller, Get, Post, Put, Delete, Body, Query } from '@nestjs/common'
import { DataService } from '@/data.service'

@Controller('book')
export class BookController {
  constructor(private readonly dataService: DataService) {}

  @Get('categories')
  getCategories() {
    return { code: 200, msg: 'success', data: this.dataService.getCategories() }
  }

  @Post('create')
  createBook(@Body() body: { userId: string; name: string }) {
    const book = this.dataService.createBook(body.userId, body.name || '我们的小账本')
    return { code: 200, msg: 'success', data: book }
  }

  @Get('info')
  getBookInfo(@Query('userId') userId: string) {
    const book = this.dataService.getUserBook(userId)
    return { code: 200, msg: 'success', data: book || null }
  }

  @Post('join')
  joinBook(@Body() body: { userId: string; inviteCode: string }) {
    const result = this.dataService.joinBook(body.userId, body.inviteCode)
    return { code: 200, msg: result.message, data: result.book || null }
  }

  @Put('savings-goal')
  updateSavingsGoal(@Body() body: { bookId: string; title: string; targetAmount: number }) {
    const book = this.dataService.updateSavingsGoal(body.bookId, body.title, body.targetAmount)
    return { code: 200, msg: 'success', data: book }
  }
}

@Controller('expense')
export class ExpenseController {
  constructor(private readonly dataService: DataService) {}

  @Post('add')
  addExpense(@Body() body: {
    bookId: string
    userId: string
    userName: string
    userAvatar: string
    type: 'expense' | 'income'
    categoryId: string
    categoryName: string
    categoryEmoji: string
    amount: number
    note: string
    date: string
  }) {
    const record = this.dataService.addExpense(body)
    return { code: 200, msg: 'success', data: record }
  }

  @Post('batch-add')
  batchAddExpenses(@Body() body: {
    bookId: string
    userId: string
    userName: string
    userAvatar: string
    records: Array<{
      type: 'expense' | 'income'
      categoryId: string
      categoryName: string
      categoryEmoji: string
      amount: number
      note: string
      date: string
    }>
  }) {
    const records = body.records.map(r =>
      this.dataService.addExpense({
        ...r,
        bookId: body.bookId,
        userId: body.userId,
        userName: body.userName,
        userAvatar: body.userAvatar,
      }),
    )
    return { code: 200, msg: 'success', data: records }
  }

  @Delete('delete')
  deleteExpense(@Body() body: { recordId: string }) {
    const success = this.dataService.deleteExpense(body.recordId)
    return { code: 200, msg: success ? 'success' : '记录不存在', data: success }
  }

  @Put('update')
  updateExpense(@Body() body: { recordId: string; data: Record<string, unknown> }) {
    const record = this.dataService.updateExpense(body.recordId, body.data)
    return { code: 200, msg: 'success', data: record }
  }

  @Get('list')
  getExpenseList(
    @Query('bookId') bookId: string,
    @Query('categoryId') categoryId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    const records = this.dataService.getBookExpenses(bookId, {
      categoryId,
      userId,
      startDate,
      endDate,
      type,
    })
    return { code: 200, msg: 'success', data: records }
  }

  @Get('stats')
  getMonthlyStats(
    @Query('bookId') bookId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const stats = this.dataService.getMonthlyStats(bookId, parseInt(year), parseInt(month))
    return { code: 200, msg: 'success', data: stats }
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly dataService: DataService) {}

  @Post('login')
  login(@Body() body: { userId: string; name?: string; avatar?: string }) {
    const user = this.dataService.getOrCreateUser(body.userId, body.name, body.avatar)
    return { code: 200, msg: 'success', data: user }
  }

  @Put('update')
  updateUser(@Body() body: { userId: string; name?: string; avatar?: string }) {
    const user = this.dataService.updateUser(body.userId, { name: body.name, avatar: body.avatar })
    return { code: 200, msg: 'success', data: user }
  }

  @Get('info')
  getUserInfo(@Query('userId') userId: string) {
    const user = this.dataService.getUser(userId)
    return { code: 200, msg: 'success', data: user || null }
  }
}

@Controller('chat')
export class ChatController {
  constructor(private readonly dataService: DataService) {}

  @Get('messages')
  getMessages(@Query('bookId') bookId: string) {
    const messages = this.dataService.getBookChatMessages(bookId)
    return { code: 200, msg: 'success', data: messages }
  }

  @Post('message')
  addMessage(@Body() body: {
    bookId: string
    userId: string
    role: 'user' | 'assistant'
    content: string
    parsedRecords?: Array<{
      categoryId: string
      categoryName: string
      categoryEmoji: string
      amount: number
      note: string
      type: 'expense' | 'income'
      confirmed: boolean
    }>
  }) {
    const msg = this.dataService.addChatMessage(body)
    return { code: 200, msg: 'success', data: msg }
  }
}
