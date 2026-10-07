import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateAdminAccessEmailDto } from './create-admin-access-email.dto'

describe('CreateAdminAccessEmailDto', () => {
  it('normalizes a valid email to trimmed lowercase', async () => {
    const dto = plainToInstance(CreateAdminAccessEmailDto, {
      email: '  Foo@Bar.COM ',
    })
    expect(dto.email).toBe('foo@bar.com')
    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it.each(['nope', '', 42])('rejects %p', async (email) => {
    const dto = plainToInstance(CreateAdminAccessEmailDto, { email })
    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('email')
  })
})
