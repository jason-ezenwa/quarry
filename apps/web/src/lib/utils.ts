import { createCn } from 'cn/config'

// Registers the type roles and control heights so a caller's class replaces the
// default instead of stacking, and a colour class never swallows a type role.
export const cn = createCn({
  extend: {
    theme: {
      spacing: ['control', 'control-sm', 'control-lg', 'control-xs'],
    },
    classGroups: {
      'font-size': [
        {
          text: ['h1', 'title', 'lead', 'body', 'label', 'caption', 'wordmark', 'field'],
        },
      ],
    },
  },
})
