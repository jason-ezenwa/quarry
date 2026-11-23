import { noAdrReferences } from './no-adr-references.js'
import { noAwaitWaterfall } from './no-await-waterfall.js'
import { noCrossModuleModelAccess } from './no-cross-module-model-access.js'
import { noHardcodedTailwindColors } from './no-hardcoded-tailwind-colors.js'
import { noInlineStyles } from './no-inline-styles.js'
import { noNoisyComments } from './no-noisy-comments.js'
import { noOptionalNullableMismatch } from './no-optional-nullable-mismatch.js'
import { noRegexpInRender } from './no-regexp-in-render.js'
import { noUntypedMongooseCreate } from './no-untyped-mongoose-create.js'

// Apps register this under the `local` namespace in their .oxlintrc.json, so
// every rule here is addressable as `local/<rule-name>`.
export const PLUGIN_NAMESPACE = 'local'

export const lintPlugin = {
  meta: { name: PLUGIN_NAMESPACE },
  rules: {
    'no-adr-references': noAdrReferences,
    'no-await-waterfall': noAwaitWaterfall,
    'no-cross-module-model-access': noCrossModuleModelAccess,
    'no-hardcoded-tailwind-colors': noHardcodedTailwindColors,
    'no-inline-styles': noInlineStyles,
    'no-noisy-comments': noNoisyComments,
    'no-optional-nullable-mismatch': noOptionalNullableMismatch,
    'no-regexp-in-render': noRegexpInRender,
    'no-untyped-mongoose-create': noUntypedMongooseCreate,
  },
}

// Oxlint loads JS plugins through their default export.
export default lintPlugin
