import { Controller, Get, Post, Put, Delete, Body, Query } from '@nestjs/common'
import { DataService } from '@/data.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly dataService: DataService) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string; displayName?: string }) {
    const result = await this.dataService.register(body.username, body.password, body.displayName)
    return { code: result.success ? 200 : 400, msg: result.message, data: { userId: result.userId } }
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.dataService.login(body.username, body.password)
    return { code: result.success ? 200 : 400, msg: result.message, data: { userId: result.userId, user: result.user } }
  }
}

@Controller('book')
export class BookController {
  constructor(private readonly dataService: DataService) {}

  @Get('categories')
  getCategories() {
    return { code: 200, msg: 'success', data: this.dataService.getCategories() }
  }

  @Post('create')
  async createBook(@Body() body: { userId: string; name: string }) {
    const book = await this.dataService.createBook(body.userId, body.name || '我们的小账本')
    return { code: 200, msg: 'success', data: book }
  }

  @Get('info')
  async getBookInfo(@Query('userId') userId: string) {
    const book = await this.dataService.getUserBook(userId)
    return { code: 200, msg: 'success', data: book || null }
  }

  @Post('join')
  async joinBook(@Body() body: { userId: string; inviteCode: string }) {
    const result = await this.dataService.joinBook(body.userId, body.inviteCode)
    return { code: 200, msg: result.message, data: result.book || null }
  }

  @Put('savings-goal')
  async updateSavingsGoal(@Body() body: { bookId: string; title: string; targetAmount: number }) {
    const book = await this.dataService.updateSavingsGoal(body.bookId, body.title, body.targetAmount)
    return { code: 200, msg: 'success', data: book }
  }
}

@Controller('expense')
export class ExpenseController {
  constructor(private readonly dataService: DataService) {}

  @Post('add')
  async addExpense(@Body() body: {
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
    const record = await this.dataService.addExpense(body)
    return { code: 200, msg: 'success', data: record }
  }

  @Post('batch-add')
  async batchAddExpenses(@Body() body: {
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
    const records = await Promise.all(body.records.map(r =>
      this.dataService.addExpense({
        ...r,
        bookId: body.bookId,
        userId: body.userId,
        userName: body.userName,
        userAvatar: body.userAvatar,
      }),
    ))
    return { code: 200, msg: 'success', data: records }
  }

  @Delete('delete')
  async deleteExpense(@Body() body: { recordId: string }) {
    const success = await this.dataService.deleteExpense(body.recordId)
    return { code: success ? 200 : 404, msg: success ? 'success' : '记录不存在' }
  }

  @Put('update')
  async updateExpense(@Body() body: { recordId: string } & Partial<{
    amount: number
    categoryId: string
    categoryName: string
    categoryEmoji: string
    note: string
    date: string
  }>) {
    const { recordId, ...data } = body
    const record = await this.dataService.updateExpense(recordId, data)
    return { code: record ? 200 : 404, msg: record ? 'success' : '记录不存在', data: record }
  }

  @Get('list')
  async getExpenseList(
    @Query('bookId') bookId: string,
    @Query('categoryId') categoryId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    const records = await this.dataService.getBookExpenses(bookId, {
      categoryId,
      userId,
      startDate,
      endDate,
      type,
    })
    return { code: 200, msg: 'success', data: records }
  }

  @Get('stats')
  async getStats(
    @Query('bookId') bookId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const stats = await this.dataService.getMonthlyStats(bookId, parseInt(year), parseInt(month))
    return { code: 200, msg: 'success', data: stats }
  }
}

@Controller('chat')
export class ChatController {
  constructor(private readonly dataService: DataService) {}

  @Get('messages')
  async getMessages(@Query('bookId') bookId: string) {
    const messages = await this.dataService.getChatMessages(bookId)
    return { code: 200, msg: 'success', data: messages }
  }

  @Post('message')
  async addMessage(@Body() body: {
    bookId: string
    userId: string
    role: 'user' | 'assistant'
    content: string
    parsedRecords?: any[]
  }) {
    const message = await this.dataService.addChatMessage(
      body.bookId,
      body.userId,
      body.role,
      body.content,
      body.parsedRecords,
    )
    return { code: 200, msg: 'success', data: message }
  }
}

@Controller()
export class AppController {
  @Get('hello')
  getHello() {
    return { code: 200, msg: 'success', data: { message: 'Hello from 俩个人的账本 API' } }
  }
}
