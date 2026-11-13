import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { ServiceUnavailableException } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { ReviewsRepository } from './reviews.repository'
import { AdminReviewPageDto, ReviewPageDto } from './dto/review.dto'

describe('ReviewsService', () => {
  let service: ReviewsService
  const repository = {
    list: jest.fn(),
    context: jest.fn(),
    save: jest.fn(),
    withdraw: jest.fn(),
    listAdmin: jest.fn(),
    moderate: jest.fn(),
  }
  const config = { get: jest.fn() }
  beforeEach(async () => {
    jest.clearAllMocks()
    config.get.mockReturnValue(true)
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: repository },
        { provide: ConfigService, useValue: config },
      ],
    }).compile()
    service = module.get(ReviewsService)
  })

  it('passes only explicit owner and review inputs through the feature boundary', async () => {
    const dto = { order_item_id: 'item', rating: 5 }
    await service.save('owner', 'product', dto)
    expect(repository.save).toHaveBeenCalledWith('owner', 'product', dto)
    await service.context('owner', 'product', 'order')
    expect(repository.context).toHaveBeenCalledWith('owner', 'product', 'order')
    await expect(service.withdraw('owner', 'review', 2)).resolves.toEqual({
      removed: true,
    })
    expect(repository.withdraw).toHaveBeenCalledWith('owner', 'review', 2)
  })

  it('can disable every review operation without changing catalog/order services', async () => {
    config.get.mockReturnValue(false)
    const tasks = [
      () => service.list('product', new ReviewPageDto()),
      () => service.context('owner', 'product'),
      () =>
        service.save('owner', 'product', { order_item_id: 'item', rating: 5 }),
      () => service.withdraw('owner', 'review', 0),
      () => service.listAdmin(new AdminReviewPageDto()),
      () =>
        service.moderate('review', { is_hidden: true, expected_version: 0 }),
    ]
    for (const task of tasks)
      await expect(task()).rejects.toThrow(ServiceUnavailableException)
    for (const method of Object.values(repository))
      expect(method).not.toHaveBeenCalled()
  })
})
