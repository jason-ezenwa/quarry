const WIDTHS = { phone: 390, desktop: 1440 } as const

const MIN_WIDTH = /\(min-width:\s*([\d.]+)(px|rem)\)/

// jsdom has no layout, so `matchMedia` answers width queries for the chosen size. Reset after each test.
export function setViewport(size: keyof typeof WIDTHS) {
  const width = WIDTHS[size]

  window.matchMedia = (query: string) => {
    const match = MIN_WIDTH.exec(query)
    const min = match ? Number(match[1]) * (match[2] === 'rem' ? 16 : 1) : Infinity
    return {
      matches: width >= min,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }
  }
}

export function resetViewport() {
  Reflect.deleteProperty(window, 'matchMedia')
}
