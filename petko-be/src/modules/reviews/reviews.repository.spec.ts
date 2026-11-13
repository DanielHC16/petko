import { Test } from '@nestjs/testing'
import { HttpException, InternalServerErrorException } from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import { ReviewsRepository } from './reviews.repository'
import { AdminReviewPageDto, ReviewPageDto } from './dto/review.dto'

describe('ReviewsRepository', () => {
  let repository: ReviewsRepository
  const rpc = jest.fn()
  const result = { data: {}, error: null }

  beforeEach(async () => {
    jest.clearAllMocks()
    rpc.mockReturnValue({ returns: () => Promise.resolve(result) })
    const module = await Test.createTestingModule({
      providers: [
        ReviewsRepository,
        { provide: SupabaseService, useValue: { admin: { rpc } } },
      ],
    }).compile()
    repository = module.get(ReviewsRepository)
  })

  it('uses the deliberate public projection RPC and bounded pagination', async () => {
    await repository.list('product', { ...new ReviewPageDto(), page: 2 })
    expect(rpc).toHaveBeenCalledWith('petko_product_reviews', {
      p_product_id: 'product',
      p_page: 2,
      p_limit: 10,
    })
  })

  it('binds private context to actor and optional owned order', async () => {
    await repository.context('owner', 'product', 'order')
    expect(rpc).toHaveBeenCalledWith('petko_review_context', {
      p_user_id: 'owner',
      p_product_id: 'product',
      p_order_id: 'order',
    })
    await repository.context('owner', 'product')
    expect(rpc).toHaveBeenLastCalledWith('petko_review_context', {
      p_user_id: 'owner',
      p_product_id: 'product',
      p_order_id: null,
    })
  })

  it('keeps actor/product separate from writable fields and defaults optional comment', async () => {
    await repository.save('owner', 'product', {
      order_item_id: 'item',
      rating: 4,
    })
    expect(rpc).toHaveBeenCalledWith('petko_save_product_review', {
      p_user_id: 'owner',
      p_product_id: 'product',
      p_order_item_id: 'item',
      p_rating: 4,
      p_comment: '',
      p_expected_version: null,
    })
    await repository.save('owner', 'product', {
      order_item_id: 'item',
      rating: 3,
      comment: 'Changed',
      expected_version: 0,
    })
    expect(rpc).toHaveBeenLastCalledWith(
      'petko_save_product_review',
      expect.objectContaining({ p_expected_version: 0, p_comment: 'Changed' }),
    )
  })

  it('binds withdrawal to owner/version and moderation to flag/version only', async () => {
    await repository.withdraw('owner', 'review', 2)
    expect(rpc).toHaveBeenCalledWith('petko_withdraw_product_review', {
      p_user_id: 'owner',
      p_review_id: 'review',
      p_expected_version: 2,
    })
    await repository.moderate('review', {
      is_hidden: true,
      expected_version: 3,
    })
    expect(rpc).toHaveBeenLastCalledWith('petko_moderate_product_review', {
      p_review_id: 'review',
      p_is_hidden: true,
      p_expected_version: 3,
    })
    await repository.listAdmin({
      ...new AdminReviewPageDto(),
      visibility: 'hidden',
    })
    expect(rpc).toHaveBeenLastCalledWith('petko_admin_product_reviews', {
      p_page: 1,
      p_limit: 20,
      p_visibility: 'hidden',
    })
  })

  it.each([
    ['P4040', 404],
    ['P4090', 409],
    ['P4091', 409],
    ['23505', 409],
    ['P4000', 400],
  ] as const)(
    'maps %s to safe HTTP %s without leaking database text',
    async (code, status) => {
      rpc.mockReturnValue({
        returns: () =>
          Promise.resolve({
            data: null,
            error: { code, message: 'private database detail' },
          }),
      })
      try {
        await repository.list('product', new ReviewPageDto())
        throw new Error('Expected rejection')
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(HttpException)
        if (!(error instanceof HttpException)) throw error
        expect(error.getStatus()).toBe(status)
        expect(error.message).not.toContain('private database detail')
      }
    },
  )

  it('rejects missing results instead of treating a failed write as success', async () => {
    rpc.mockReturnValue({
      returns: () => Promise.resolve({ data: null, error: null }),
    })
    await expect(repository.withdraw('owner', 'review', 0)).rejects.toThrow(
      InternalServerErrorException,
    )
  })
})
