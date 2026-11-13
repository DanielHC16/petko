import { Test } from '@nestjs/testing'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'
import { AuthGuard } from '@/common/guards/auth.guard'
import { ReviewPageDto } from './dto/review.dto'
import type { UserProfile } from '@/common/types/authenticated-request.type'

describe('ReviewsController', () => {
  const service = {
    list: jest.fn(),
    context: jest.fn(),
    save: jest.fn(),
    withdraw: jest.fn(),
    listAdmin: jest.fn(),
    moderate: jest.fn(),
  }
  let controller: ReviewsController
  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()
    controller = module.get(ReviewsController)
  })
  it('takes owner identity from the authenticated actor', async () => {
    const actor: UserProfile = {
      id: 'owner',
      full_name: 'Owner',
      email: 'owner@example.invalid',
      avatar_url: '',
      role: 'customer',
      tos_accepted: true,
    }
    await controller.context('product', { order_id: 'order' }, actor)
    expect(service.context).toHaveBeenCalledWith('owner', 'product', 'order')
    await controller.save(
      'product',
      { order_item_id: 'item', rating: 5 },
      actor,
    )
    expect(service.save).toHaveBeenCalledWith('owner', 'product', {
      order_item_id: 'item',
      rating: 5,
    })
    await controller.withdraw('review', { expected_version: 2 }, actor)
    expect(service.withdraw).toHaveBeenCalledWith('owner', 'review', 2)
  })
  it('delegates public pagination without attaching private context', async () => {
    const query = new ReviewPageDto()
    await controller.list('product', query)
    expect(service.list).toHaveBeenCalledWith('product', query)
    expect(service.context).not.toHaveBeenCalled()
  })
})
