/**
 * Copilot Integration Components
 *
 * Components for registering CopilotKit actions, suggestions,
 * and readables using the unified config pattern.
 */

export {
  CopilotActionsRegistrar,
  type ActionHandler,
  type ActionRender,
  type ActionRenderHITL,
  type ActionHandlerEntry,
  type ActionHandlerRegistry,
} from './CopilotActionsRegistrar'

export {
  CopilotSuggestionsRegistrar,
  type SuggestionContextProvider,
} from './CopilotSuggestionsRegistrar'

export {
  CopilotReadablesRegistrar,
  type ReadableDataProvider,
  type ReadableDataProviderRegistry,
} from './CopilotReadablesRegistrar'
