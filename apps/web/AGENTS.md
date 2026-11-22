# apps/web

## Building UI

- Use the primitives in `src/components/ui`. They are shadcn components
  restyled to the design system, so use them as they are.
- Before building anything new, check the `/design-system` page (dev server,
  `src/pages/design-system`). If a primitive or variant for it exists, use it.
- Style minimally. Position primitives with layout classes only: flex, grid,
  gap, margin, width. Colour, type, radius and control height come from the
  primitive and the tokens in `src/index.css`, never from the call site.
- Colours are semantic tokens (`bg-primary`, `text-muted-foreground`). Raw
  palette colours, hex values and inline styles fail lint.
- Text uses the type roles (`text-h1`, `text-title`, `text-lead`, `text-body`,
  `text-label`, `text-caption`), not `text-sm` and friends.

## When the design needs something a primitive can't do

Add a new variant to the primitive. Don't restyle it at the call site, and
don't change an existing variant to fit one frame, because other screens
depend on it. A one-off look gets its own variant, shown on the
`/design-system` page.
