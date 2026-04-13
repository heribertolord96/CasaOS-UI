/** Same-origin iframe ↔ parent shell (EmbeddedViewer) communication. */

export const SHELL_EMBED_MSG_TYPE = 'casaos-shell-embed'

/**
 * Ask the parent window to close the embedded window with this id (see windowManager.openApps).
 * No-op if not running inside an iframe.
 */
export function postEmbedCloseToParent(embedId) {
  if (typeof window === 'undefined' || window.self === window.top) {
    return
  }
  if (!embedId || typeof embedId !== 'string') {
    return
  }
  window.parent.postMessage(
    {
      type: SHELL_EMBED_MSG_TYPE,
      action: 'close',
      embedId,
    },
    window.location.origin,
  )
}
