import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

/** The page as static HTML, so the hero paints before any JavaScript runs. */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
