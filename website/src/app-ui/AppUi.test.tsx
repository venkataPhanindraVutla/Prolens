import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AppCalculators, AppCoach, AppGear, AppLightScreen, AppToolkit } from './AppScreens'
import AppViewfinder from './AppViewfinder'

test('the viewfinder shows the app’s HUD, zoom and mode strip', () => {
  render(<AppViewfinder preview={<div />} />)
  const hud = screen.getByTestId('app-hud')
  for (const label of ['ISO', 'Shutter', 'Aperture', 'Lens', 'WB', 'EV', 'Focus']) expect(within(hud).getByText(label)).toBeInTheDocument()
  expect(within(hud).getByText('1/120A')).toBeInTheDocument()
  expect(screen.getByText('1×')).toBeInTheDocument()
  const modes = screen.getByTestId('app-modes')
  expect(within(modes).getByText('Photo')).toHaveAttribute('data-selected', 'true')
  expect(within(modes).getAllByRole('listitem', { hidden: true })).toHaveLength(7)
})

test('the selected mode and tool states come from props', () => {
  render(<AppViewfinder preview={<div />} mode="Night" tools={{ zebra: true }} />)
  expect(within(screen.getByTestId('app-modes')).getByText('Night')).toHaveAttribute('data-selected', 'true')
  expect(screen.getByTestId('tool-zebra')).toHaveAttribute('data-on', 'true')
  expect(screen.getByTestId('tool-grid')).toHaveAttribute('data-on', 'true')
})

test('the other screens carry the app’s own titles and sample values', () => {
  render(
    <>
      <AppToolkit />
      <AppCalculators />
      <AppLightScreen />
      <AppCoach />
      <AppGear />
    </>,
  )
  for (const t of ['Toolkit', 'Calculators', 'Light', 'Coach', 'Gear']) expect(screen.getAllByRole('heading', { name: t }).length).toBeGreaterThan(0)
  expect(screen.getByText('2.51 m')).toBeInTheDocument()
  expect(screen.getByText('Street')).toBeInTheDocument()
  expect(screen.getAllByText('Sony A7 IV').length).toBeGreaterThan(0)
})
