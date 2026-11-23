import { createCn } from 'cn/config'

// Registers the type roles and control heights so a caller's class replaces the
// default instead of stacking, and a colour class never swallows a type role.
export const cn = createCn({
  extend: {
    theme: {
      spacing: ['control', 'control-sm', 'control-lg', 'field', 'field-lg'],
    },
    classGroups: {
      'font-size': [
        {
          text: [
            'title',
            'question',
            'reading',
            'ui',
            'ui-strong',
            'small',
            'label',
            'pill',
            'doc-title',
            'doc-body',
            'doc-caps',
            'wordmark',
            'field',
          ],
        },
      ],
    },
  },
})
