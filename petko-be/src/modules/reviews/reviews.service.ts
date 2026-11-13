import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ReviewsRepository } from './reviews.repository'
import type {
  AdminReviewPageDto,
  ReviewPageDto,
  ReviewVisibilityDto,
  SaveReviewDto,
} from './dto/review.dto'
import type {
  OwnReview,
  PublicReviewPage,
  ReviewContext,
  ReviewPage,
} from './reviews.types'

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repository: ReviewsRepository,
    private readonly config: ConfigService,
  ) {}

  private ensureEnabled(): void {
    if (this.config.get<boolean>('PRODUCT_REVIEWS_ENABLED') === false)
      throw new ServiceUnavailableException(
        'Reviews are temporarily unavailable. Please try again later.',
      )
  }

  async list(
    productId: string,
    query: ReviewPageDto,
  ): Promise<PublicReviewPage> {
    this.ensureEnabled()
    return this.repository.list(productId, query)
  }

  async context(
    userId: string,
    productId: string,
    orderId?: string,
  ): Promise<ReviewContext> {
    this.ensureEnabled()
    return this.repository.context(userId, productId, orderId)
  }

  async save(
    userId: string,
    productId: string,
    dto: SaveReviewDto,
  ): Promise<OwnReview> {
    this.ensureEnabled()
    return this.repository.save(userId, productId, dto)
  }

  async withdraw(
    userId: string,
    id: string,
    version: number,
  ): Promise<{ removed: true }> {
    this.ensureEnabled()
    await this.repository.withdraw(userId, id, version)
    return { removed: true }
  }

  async listAdmin(query: AdminReviewPageDto): Promise<ReviewPage<OwnReview>> {
    this.ensureEnabled()
    return this.repository.listAdmin(query)
  }

  async moderate(id: string, dto: ReviewVisibilityDto): Promise<OwnReview> {
    this.ensureEnabled()
    return this.repository.moderate(id, dto)
  }
}
