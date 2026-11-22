import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Shared by unit and integration tests. Vitest globals are off, so Testing
// Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
})

// jsdom lacks the layout APIs Radix's checkbox, select and tooltip call.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Element.prototype.scrollIntoView ??= function () {}

// jsdom logs "not implemented" for scrolling, which ScrollRestoration does.
window.scrollTo = () => {}

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= function () {}
