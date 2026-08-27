import { Module } from '@nestjs/common'
import {
  AuthController,
  BookController,
  ExpenseController,
  UserController,
  ChatController,
} from '@/app.controller'
import { DataService } from '@/data.service'

@Module({
  imports: [],
  controllers: [AuthController, BookController, ExpenseController, UserController, ChatController],
  providers: [DataService],
})
export class AppModule {}
