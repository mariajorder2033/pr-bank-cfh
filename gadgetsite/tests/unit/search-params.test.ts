import { expect, test } from 'vitest'
import { queryFromSearchParams } from '@/lib/content/search-params'

test('reads brands, price range, stock, sort and page from the URL', () => {
  expect(
    queryFromSearchParams(
      {
        brands: 'apple,samsung',
        min: '1000',
        max: '5000',
        inStock: '1',
        sort: 'price_asc',
        page: '2',
      },
      { category: 'phones' },
    ),
  ).toMatchObject({
    category: 'phones',
    brands: ['apple', 'samsung'],
    min: 1000,
    max: 5000,
    inStock: true,
    sort: 'price_asc',
    page: 2,
  })
})

test('ignores malformed values instead of failing', () => {
  const q = queryFromSearchParams({ min: '-5', max: 'abc', sort: 'bogus', page: '0' })
  expect(q).toMatchObject({ sort: 'newest', page: 1 })
  expect(q.min).toBeUndefined()
  expect(q.max).toBeUndefined()
})

test('drops brand slugs that are not plain slugs', () => {
  expect(queryFromSearchParams({ brands: 'apple,a\u0000b' }).brands).toEqual(['apple'])
})
