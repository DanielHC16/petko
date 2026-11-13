import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'
import { ReviewsRepository } from './reviews.repository'

@Module({
  imports: [ConfigModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
