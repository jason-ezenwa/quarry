# @quarry/lint-rules

The custom rules from the `agentic-ai` repo's `lint-rules/`, copied verbatim.
They are written against the ESLint rule API, which oxlint's JS plugin support
runs as is, so both apps load them from their `.oxlintrc.json` under the
`local` namespace.

Each app lists the rules it uses in its own config, because oxlint's JSON
config cannot import a rule set. When a rule is added here, add it to the
config of each app it applies to.

| Rule | Server | Web | Kind |
| --- | --- | --- | --- |
| `no-adr-references` | error | error | Blocking |
| `no-optional-nullable-mismatch` | error | error | Blocking |
| `no-noisy-comments` | warn | warn | Advisory, never promoted |
| `no-cross-module-model-access` | error | | Blocking |
| `no-untyped-mongoose-create` | error | | Blocking |
| `no-await-waterfall` | | error | Blocking |
| `no-hardcoded-tailwind-colors` | | error | Blocking |
| `no-inline-styles` | | error | Blocking |
| `no-regexp-in-render` | | error | Blocking |

Every blocking rule is an error because the codebase starts clean of all of
them. The rules' tests live beside them in `agentic-ai`, which is the record
of what each rule means.
