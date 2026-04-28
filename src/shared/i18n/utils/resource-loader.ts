import i18n from '../core/config'
import type { SupportedLanguage } from '../core/types'

export const resourceLoaders: Record<string, () => Promise<any>> = {
  en: () => import('../locales/en'),
  ja: () => import('../locales/ja'),
  'pt-BR': () => import('../locales/pt-BR'),
}

export async function loadResourcesFor(
  language: SupportedLanguage
): Promise<void> {
  console.log('[resource-loader] ========================================')
  console.log('[resource-loader] Loading resources for:', language)
  console.log(
    '[resource-loader] Available loaders:',
    Object.keys(resourceLoaders)
  )
  console.log(
    '[resource-loader] Has common bundle?',
    i18n.hasResourceBundle(language, 'common')
  )

  if (i18n.hasResourceBundle(language, 'common')) {
    console.log('[resource-loader] Resources already loaded for:', language)

    // Debug: Check what's actually inside the loaded bundle
    console.log('[resource-loader] 🔍 INSPECT pt-BR mcp bundle:')
    const mcpBundle = i18n.getResourceBundle(language, 'mcp')
    console.log('[resource-loader] Full mcp bundle:', mcpBundle)
    console.log('[resource-loader] marketplace object:', mcpBundle?.marketplace)
    console.log(
      '[resource-loader] marketplace.title:',
      mcpBundle?.marketplace?.title
    )
    console.log(
      '[resource-loader] Test t():',
      i18n.t('marketplace.title', { lng: language, ns: 'mcp' })
    )

    return
  }

  const loader = resourceLoaders[language]
  if (!loader) {
    console.error('[resource-loader] ❌ No loader found for:', language)
    console.error(
      '[resource-loader] Available loaders:',
      Object.keys(resourceLoaders)
    )
    return
  }

  console.log('[resource-loader] ✅ Loader found for:', language)

  try {
    console.log('[resource-loader] Calling loader...')
    const mod = (await loader()) as
      | { default?: Record<string, unknown> }
      | undefined
    console.log('[resource-loader] Module loaded:', mod ? 'yes' : 'no')

    const resources: Record<string, unknown> = (mod && mod.default) || {}
    console.log(
      '[resource-loader] Resources extracted:',
      resources ? 'yes' : 'no'
    )
    console.log('[resource-loader] Loaded namespaces:', Object.keys(resources))
    console.log(
      '[resource-loader] Sample data (marketplace.title):',
      (resources.mcp as any)?.marketplace?.title || 'NOT FOUND'
    )

    Object.entries(resources).forEach(([ns, data]) => {
      console.log(
        '[resource-loader] Processing namespace:',
        ns,
        'has bundle?',
        i18n.hasResourceBundle(language, ns)
      )
      if (!i18n.hasResourceBundle(language, ns)) {
        // Parameters: (lng, ns, resources, deep, overwrite)
        // deep: true - merge with existing translations
        // overwrite: true - overwrite existing keys
        i18n.addResourceBundle(language, ns, data, true, true)
        console.log(
          '[resource-loader] ✅ Added bundle:',
          language,
          ns,
          'keys:',
          Object.keys(data as any).length
        )
      }
    })

    // Force i18next to reload the resources
    console.log('[resource-loader] 🔄 Reloading resources...')
    await i18n.reloadResources(language)
    console.log('[resource-loader] ✅ Resources reloaded')

    console.log(
      '[resource-loader] ✅ Successfully loaded resources for:',
      language
    )
    console.log(
      '[resource-loader] Final check - has mcp bundle?',
      i18n.hasResourceBundle(language, 'mcp')
    )

    // Test if we can actually retrieve the translations
    console.log(
      '[resource-loader] 🧪 TEST: i18n.t("marketplace.title", { lng: language, ns: "mcp" }):',
      i18n.t('marketplace.title', { lng: language, ns: 'mcp' })
    )
    console.log(
      '[resource-loader] 🧪 TEST: i18n.getResourceBundle(language, "mcp")?.marketplace?.title:',
      i18n.getResourceBundle(language, 'mcp')?.marketplace?.title
    )

    console.log('[resource-loader] ========================================')
  } catch (err) {
    console.error(
      '[resource-loader] ❌ Failed to load language resources for',
      language,
      err
    )
  }
}
