import { useEffect, useRef } from 'react'
import { DEMO_VIEWPORT } from '../demo/demo.constants'

// Keeps `--demo-scale` on the element at its width over the app's own, so the app inside fills it.
export function useDemoScale<Element extends HTMLElement>() {
  const ref = useRef<Element>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      element.style.setProperty('--demo-scale', String(entry.contentRect.width / DEMO_VIEWPORT.width))
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return ref
}
