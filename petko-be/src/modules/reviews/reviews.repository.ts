import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
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
export class ReviewsRepository {
  private readonly logger = new Logger(ReviewsRepository.name)

  constructor(private readonly supabase: SupabaseService) {}

  async list(
    productId: string,
    query: ReviewPageDto,
  ): Promise<PublicReviewPage> {
    return this.call<PublicReviewPage>('petko_product_reviews', {
      p_product_id: productId,
      p_page: query.page,
      p_limit: query.limit,
    })
  }

  async context(
    userId: string,
    productId: string,
    orderId?: string,
  ): Promise<ReviewContext> {
    return this.call<ReviewContext>('petko_review_context', {
      p_user_id: userId,
      p_product_id: productId,
      p_order_id: orderId ?? null,
    })
  }

  async save(
    userId: string,
    productId: string,
    dto: SaveReviewDto,
  ): Promise<OwnReview> {
    return this.call<OwnReview>('petko_save_product_review', {
      p_user_id: userId,
      p_product_id: productId,
      p_order_item_id: dto.order_item_id,
      p_rating: dto.rating,
      p_comment: dto.comment ?? '',
      p_expected_version: dto.expected_version ?? null,
    })
  }

  async withdraw(
    userId: string,
    id: string,
    version: number,
  ): Promise<boolean> {
    return this.call<boolean>('petko_withdraw_product_review', {
      p_user_id: userId,
      p_review_id: id,
      p_expected_version: version,
    })
  }

  async listAdmin(query: AdminReviewPageDto): Promise<ReviewPage<OwnReview>> {
    return this.call<ReviewPage<OwnReview>>('petko_admin_product_reviews', {
      p_page: query.page,
      p_limit: query.limit,
      p_visibility: query.visibility,
    })
  }

  async moderate(id: string, dto: ReviewVisibilityDto): Promise<OwnReview> {
    return this.call<OwnReview>('petko_moderate_product_review', {
      p_review_id: id,
      p_is_hidden: dto.is_hidden,
      p_expected_version: dto.expected_version,
    })
  }

  private async call<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.supabase.admin
      .rpc(name, args)
      .returns<T>()
    if (error) this.fail(error)
    if (data === null || data === undefined)
      throw new InternalServerErrorException('Could not load or save reviews.')
    // Each private RPC has the schema-verified non-array result declared by its caller;
    // postgrest-js's array compatibility conditional cannot resolve a generic T.
    return data as T
  }

  private fail(error: PostgrestError): never {
    if (error.code === 'P4040')
      throw new NotFoundException('Review or purchase not found.')
    if (error.code === 'P4090' || error.code === '23505')
      throw new ConflictException(
        'This review has changed. Refresh it and try again.',
      )
    if (error.code === 'P4091')
      throw new ConflictException(
        'Confirm receipt of this purchase before reviewing it.',
      )
    if (error.code === 'P4000')
      throw new BadRequestException('Check the rating and review details.')
    this.logger.error(
      `Reviews database request failed: ${error.code} ${error.message}`,
    )
    throw new InternalServerErrorException(
      'Could not load or save reviews. Please try again.',
    )
  }
}
