# i18n Module Architecture

This directory provides internationalization (i18n) for the Cockpit Portal using `i18next` + `react-i18next` with SSR-safe, lazy language loading.

## Folder Structure

```
i18n/
  core/                # Runtime core (i18n instance + provider)
    config.ts          # Main i18n instance configuration
    constants.ts       # Supported languages, namespaces, cookie key
    provider.tsx       # I18n provider with lazy loading support
    types.ts           # Type-safe translation namespace contracts
  locales/             # Static translation resources grouped per language
    en/ index.ts       # Aggregates namespaces for English
    ja/ index.ts       # Aggregates namespaces for Japanese
  server/              # Server-only helpers (server actions + detectors)
    actions.ts         # Server actions for cookie management
    index.ts           # Server module barrel export
    language-detector.ts # Language detection and cookie utilities
  ui/                  # UI-only presentation bits (loading skeletons)
    language-loading.tsx # Minimal loading component
  utils/               # Client/runtime utilities (lazy resource loader)
    resource-loader.ts # Dynamic language resource loader
  index.ts             # Barrel exports (public surface)
```

## Key Concepts

1. **Lazy Loading**: Default language (`en`) is eagerly loaded at init; other languages load on-demand.
2. **Resource Loading**: `loadResourcesFor(lang)` dynamically imports locale bundles exactly once.
3. **Hydration Safety**: `I18nProvider` preloads the initial language from cookies before rendering to avoid flash/mismatch.
4. **Server Utilities**: Server-side language detection and cookie management via Next.js Server Actions.
5. **Minimal UI**: Loading components designed to prevent layout shift during initialization.

## Adding a New Language

1. Create `locales/<code>/` with JSON files for each namespace listed in `core/constants.ts`
2. Add an `index.ts` in that folder aggregating namespaces (mirror existing pattern)
3. Extend `supportedLngs` array in `core/constants.ts`
4. Update the loader map in `utils/resource-loader.ts` to include the new language dynamic import
5. Provide translated values for all keys to maintain type safety

## Adding a New Namespace

1. Add the namespace string to `namespaces` array in `core/constants.ts`
2. Add matching JSON files for every language under `locales/<lang>/`
3. Update each language `index.ts` to include the new namespace in the exported object
4. Define the namespace interface in `core/types.ts` for type safety

## Usage Examples

### Hook Usage

```tsx
import { useI18n } from '@/hooks/use-i18n'

function Example() {
  const { t, changeLanguage, currentLanguage, isReady } = useI18n('common')

  if (!isReady) return null

  return (
    <div>
      <p>{t('button.save')}</p>
      <button
        onClick={() => changeLanguage(currentLanguage === 'en' ? 'ja' : 'en')}
      >
        Switch Language
      </button>
    </div>
  )
}
```

### Server Language Detection

```ts
import { headers } from 'next/headers'

import { detectServerLanguage } from '@/i18n/server/language-detector'

// Inside a Next.js layout or page (server component)
const cookieHeader = headers().get('cookie')
const initialLanguage = cookieHeader ? detectServerLanguage(cookieHeader) : 'en'
```

### Importing from Barrel

```ts
import { i18n, I18nProvider, loadResourcesFor, SupportedLanguage } from '@/i18n'
```

## Design Principles

- **Hydration Safety**: No flash of untranslated content or layout shifts
- **Performance**: Lazy loading for scalability with multiple languages
- **Type Safety**: Full TypeScript support for translation keys and namespaces
- **Modularity**: Clean separation of concerns (server vs client vs UI vs core)
- **Compatibility**: Stable public API via barrel exports

## Best Practices

| ✅ Do                                                | ❌ Avoid                             |
| ---------------------------------------------------- | ------------------------------------ |
| Import from `@/i18n` barrel                          | Deep path imports that bypass barrel |
| Add new languages via `utils/resource-loader.ts` map | Wildcard/glob imports for locales    |
| Check `isReady` before rendering translated UI       | Rendering without hydration guard    |
| Use the `useI18n()` hook for consistent behavior     | Direct i18next usage in components   |

## Development Notes

- All core functionality lives in the `core/` directory
- Server utilities are isolated in `server/` for proper Next.js separation
- UI components in `ui/` are minimal to prevent layout shift
- Resource loading is handled by utilities in `utils/`
- Backward compatibility is maintained through re-exports at the root level

---

_This documentation reflects the current architecture. Update this file when making structural changes to maintain accuracy._
