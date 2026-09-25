import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import type { Share } from '@/lib/data'
import { Dialogue } from './Talk'

const share = (id: string, authorId: string, body: string): Share => ({
  id,
  authorId,
  body,
  prompt: 'need',
  reflectionId: `r-${id}`,
  checkinId: 'c1',
  coupleId: 'k1',
  sharedAt: '2026-01-01T00:00:00Z',
  withdrawnAt: null,
})

test('AC-4.2, AC-4.3 runs both rounds in order with the right speaker and topics', () => {
  render(
    <MemoryRouter>
      <Dialogue
        checkinId="c1"
        me={{ id: 'm', name: 'Maja' }}
        partner={{ id: 'e', name: 'Erik' }}
        shares={[share('s1', 'm', 'To know we are okay.'), share('s2', 'e', 'Half an hour to land.')]}
      />
    </MemoryRouter>,
  )
  const next = () => fireEvent.click(screen.getByRole('button', { name: /Next|Begin/ }))
  const heading = () => document.activeElement?.textContent

  expect(heading()).toBe('Sit together, somewhere quiet')
  next()
  expect(heading()).toBe('Maja, what would you like to talk about?')
  // Only the sender's own shares are offered, plus "Something else".
  expect(screen.getByText('To know we are okay.')).toBeInTheDocument()
  expect(screen.queryByText('Half an hour to land.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('To know we are okay.'))

  const seen: string[] = []
  for (let i = 0; i < 4; i++) {
    next()
    seen.push(`${heading()} by ${screen.getByText(/speaks$/).textContent}`)
  }
  expect(seen).toEqual(['Share by Maja speaks', 'Mirror by Erik speaks', 'Validate by Erik speaks', 'Empathise by Erik speaks'])

  next()
  expect(heading()).toBe('Erik, what would you like to talk about?')
  for (let i = 0; i < 4; i++) next()
  expect(screen.getByText(/speaks$/).textContent).toBe('Maja speaks')
  expect(heading()).toBe('Empathise')

  next()
  expect(heading()).toBe('Thank each other for listening')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(heading()).toBe('Empathise')
})
