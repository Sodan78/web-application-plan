import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { NotFound } from './NotFound'

test('renders a link home', () => {
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
})
