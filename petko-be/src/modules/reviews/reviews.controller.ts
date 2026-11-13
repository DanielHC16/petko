import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { ReviewsService } from './reviews.service'
import {
  AdminReviewPageDto,
  ReviewContextDto,
  ReviewPageDto,
  ReviewVersionQueryDto,
  ReviewVisibilityDto,
  SaveReviewDto,
} from './dto/review.dto'
import type {
  OwnReview,
  PublicReviewPage,
  ReviewContext,
  ReviewPage,
} from './reviews.types'

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('products/:productId/reviews')
  @Header('Cache-Control', 'no-store')
  async list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ReviewPageDto,
  ): Promise<PublicReviewPage> {
    return this.reviews.list(productId, query)
  }

  @Get('products/:productId/reviews/me')
  @UseGuards(AuthGuard)
  async context(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ReviewContextDto,
    @CurrentUser() user: UserProfile,
  ): Promise<ReviewContext> {
    return this.reviews.context(user.id, productId, query.order_id)
  }

  @Post('products/:productId/reviews')
  @UseGuards(AuthGuard)
  async save(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SaveReviewDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OwnReview> {
    return this.reviews.save(user.id, productId, dto)
  }

  @Get('reviews/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async listAdmin(
    @Query() query: AdminReviewPageDto,
  ): Promise<ReviewPage<OwnReview>> {
    return this.reviews.listAdmin(query)
  }

  @Delete('reviews/:id')
  @UseGuards(AuthGuard)
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ReviewVersionQueryDto,
    @CurrentUser() user: UserProfile,
  ): Promise<{ removed: true }> {
    return this.reviews.withdraw(user.id, id, query.expected_version)
  }

  @Patch('reviews/:id/visibility')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVisibilityDto,
  ): Promise<OwnReview> {
    return this.reviews.moderate(id, dto)
  }
}
