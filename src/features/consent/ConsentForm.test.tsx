import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ConsentForm } from './ConsentForm'

test('AC-1.2 Continue is disabled until the required consent is checked; optional ones start unchecked', () => {
  const onSubmit = vi.fn()
  render(<ConsentForm onSubmit={onSubmit} />)

  const boxes = screen.getAllByRole('checkbox')
  expect(boxes).toHaveLength(3)
  boxes.forEach((box) => expect(box).not.toBeChecked())

  const continueButton = screen.getByRole('button', { name: 'Continue' })
  expect(continueButton).toBeDisabled()

  fireEvent.click(screen.getByRole('checkbox', { name: /Store my reflections/ }))
  expect(continueButton).toBeEnabled()

  fireEvent.click(continueButton)
  expect(onSubmit).toHaveBeenCalledWith({
    store_reflections: true,
    ai_insights: false,
    therapist_access: false,
  })
})
