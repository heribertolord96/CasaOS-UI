/**
 * Shared defaults for dashboard “General” settings blocks (TopBar, App menu).
 * Keeps language/search lists in sync without required props when a parent omits bindings.
 */
import messages from '@/assets/lang'

export const DEFAULT_SEARCH_ENGINES = [
  { url: 'https://duckduckgo.com/?q=', name: 'DuckDuckGo' },
  { url: 'https://www.google.com/search?q=', name: 'Google' },
  { url: 'https://www.bing.com/search?q=', name: 'Bing' },
  { url: 'https://www.startpage.com/do/search?cat=web&pl=chrome&query=', name: 'StartPage' },
  { url: 'https://search.brave.com/search?source=web&q=', name: 'Brave' },
]

export function defaultLanguagesList() {
  return Object.entries(messages).map(([key, value]) => ({
    lang: key,
    name: value.lang_name,
  }))
}
