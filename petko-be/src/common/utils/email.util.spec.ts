import { escapeLikePattern, normalizeEmail } from './email.util'

describe('email utils', () => {
  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail(' Foo@Bar.COM ')).toBe('foo@bar.com')
  })

  it('escapeLikePattern escapes ilike wildcards and backslashes', () => {
    expect(escapeLikePattern('a_b%c\\d')).toBe('a\\_b\\%c\\\\d')
  })

  it('escapeLikePattern leaves ordinary emails untouched', () => {
    expect(escapeLikePattern('foo@bar.com')).toBe('foo@bar.com')
  })
})
