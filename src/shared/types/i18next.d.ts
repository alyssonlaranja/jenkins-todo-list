// Import the original type declarations
import 'i18next'

// Import manual types (maintained for backward compatibility)
import type { TranslationResources } from '@/shared/i18n'

declare module 'i18next' {
  interface CustomTypeOptions {
    // Custom namespace type
    defaultNS: 'common'
    // Use manual types - auto-generated types available in generated-types.ts
    // but they cause TypeScript compiler issues due to size
    resources: TranslationResources
    // Return type customization
    returnNull: false
    returnEmptyString: false
    returnObjects: false
    // Allow any string key (fallback for new keys not yet in types)
    allowObjectInHTMLChildren: true
  }
}

// Extend the TFunction to allow any string (for new keys not yet typed)
declare module 'react-i18next' {
  interface CustomTypeOptions {
    allowObjectInHTMLChildren: true
  }
}
