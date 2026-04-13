<script>
export default {
  name: 'EmbeddedViewer',
  props: {
    app: {
      type: Object,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      loading: true,
      loadError: false,
      loadTimeout: null,
      drag: null,
      resize: null,
      /** Initial iframe URL; use navUrl after restore without forcing reactive src updates on nav sync */
      iframeEntrySrc: '',
      /** Enhanced mode: blocks iframes from stealing pointer during drag/resize */
      dragShield: false,
      /** getBoundingClientRect of .embedded-desktop while dragging (for fixed shield) */
      desktopRect: null,
      /** One-shot open animation in enhanced mode */
      enhancedEntryActive: false,
      /** Enhanced: drag starts only after pointer moves past slop (px) — avoids breaking double-click maximize */
      pendingTitleDrag: null,
      urlInputValue: '',
      urlInputFocused: false,
      /** Per-window visibility (persisted in workspace when rememberWorkspace is on) */
      urlBarVisible: true,
      navHistory: [],
      navIndex: 0,
      /** Skip pushing iframe URL to nav stack (back/forward) */
      suppressHistoryPush: false,
    }
  },
  computed: {
    isEnhanced() {
      return this.$store.getters['preferences/embeddedViewerMode'] === 'enhanced'
    },
    urlBarMode() {
      return this.$store.getters['preferences/urlBarMode']
    },
    showUrlBarPref() {
      return this.$store.getters['preferences/showUrlBar']
    },
    shouldShowUrlBar() {
      if (this.urlBarMode === 'never') {
        return false
      }
      if (this.urlBarMode === 'always') {
        return this.urlBarVisible
      }
      return this.showUrlBarPref && this.urlBarVisible
    },
    showTitlebarUrlToggle() {
      return this.urlBarMode !== 'never'
        && (this.urlBarMode === 'always' || this.showUrlBarPref)
    },
    isSameOrigin() {
      try {
        const u = new URL(this.iframeEntrySrc, window.location.href)
        return u.origin === window.location.origin
      } catch {
        return false
      }
    },
    canNavigate() {
      return this.isSameOrigin && !this.loadError
    },
    canGoBack() {
      return this.navIndex > 0
    },
    canGoForward() {
      return this.navIndex < this.navHistory.length - 1
    },
    urlBarSecurityIcon() {
      return this.isSameOrigin ? 'lock' : 'lock-open-variant'
    },
    urlBarSecurityClass() {
      return this.isSameOrigin ? 'is-secure' : 'is-external'
    },
    dragShieldStyle() {
      if (!this.dragShield || !this.desktopRect) {
        return { display: 'none' }
      }
      const r = this.desktopRect
      return {
        position: 'fixed',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        zIndex: 2147483000,
        cursor: this.resize ? 'nwse-resize' : 'grabbing',
        touchAction: 'none',
      }
    },
    iframeStyle() {
      return {
        width: '100%',
        height: '100%',
        border: 'none',
      }
    },
    shellStyle() {
      const a = this.app
      const z = a.zIndex || 100
      if (a.maximized) {
        return {
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          zIndex: z,
          display: 'flex',
        }
      }
      const r = a.rect || { left: 8, top: 8, width: 70, height: 75 }
      return {
        position: 'absolute',
        left: `${r.left}%`,
        top: `${r.top}%`,
        width: `${r.width}%`,
        height: `${r.height}%`,
        zIndex: z,
        display: 'flex',
      }
    },
    /** Distinct label when several instances share the same group (e.g. two Memos windows). */
    titlebarLabel() {
      const open = this.$store.getters['windowManager/openApps']
      const gk = this.app.groupKey != null ? this.app.groupKey : this.app.name
      const siblings = open.filter(
        a => (a.groupKey != null ? a.groupKey : a.name) === gk,
      )
      if (siblings.length <= 1) {
        return this.app.name
      }
      const pos = siblings.findIndex(a => a.id === this.app.id) + 1
      return `${this.app.name} · ${pos}/${siblings.length}`
    },
    /**
     * Embedded same-origin Casa UI (App Store, Files, text editor): not a third-party URL.
     * Hide chrome actions that target an external tab (close / open in new tab).
     */
    isCasaShellEmbedded() {
      const id = this.app.id || ''
      return id.startsWith('casa-store-') || id.startsWith('casa-files-')
    },
    /** Native Files app in embedded shell — show filesystem path in URL bar, not the SPA URL. */
    isCasaFilesEmbedded() {
      return (this.app.id || '').startsWith('casa-files-')
    },
  },
  watch: {
    isActive(val) {
      if (val) {
        this.$nextTick(() => this.maybeSyncNavFromIframe())
      }
    },
    'app.navUrl'() {
      this.syncUrlInputFromApp()
    },
    'app.url'() {
      this.syncUrlInputFromApp()
    },
    'app.urlBarVisible'(v) {
      if (v === false) {
        this.urlBarVisible = false
      } else if (v === true) {
        this.urlBarVisible = true
      }
    },
  },
  created() {
    const initial = this.app.navUrl || this.app.url
    this.iframeEntrySrc = initial
    if (this.isCasaFilesEmbedded) {
      const p = this.filesPathFromShellUrl(initial)
      this.urlInputValue = p != null ? p : initial
    } else {
      this.urlInputValue = initial
    }
    this.navHistory = [initial]
    this.navIndex = 0
    if (this.app.urlBarVisible === false) {
      this.urlBarVisible = false
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onEmbedHotkeys, true)
    this.startLoadTimeout()
    if (this.isEnhanced) {
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          this.enhancedEntryActive = true
        })
      })
    }
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onEmbedHotkeys, true)
    clearTimeout(this.loadTimeout)
    this.endDragResize()
  },
  methods: {
    syncUrlInputFromApp() {
      if (this.urlInputFocused) {
        return
      }
      const n = this.app.navUrl && String(this.app.navUrl).trim()
      const full = n || this.app.url || ''
      if (this.isCasaFilesEmbedded) {
        const p = this.filesPathFromShellUrl(full)
        this.urlInputValue = p != null ? p : full
      } else {
        this.urlInputValue = full
      }
    },
    /**
     * Allow only http(s) navigation; block javascript/data/vbscript.
     * Relative paths resolve against the CasaOS shell origin (same-origin routes).
     */
    normalizeNavigateUrl(raw) {
      const s = String(raw || '').trim()
      if (!s) {
        return null
      }
      const lower = s.toLowerCase()
      if (
        lower.startsWith('javascript:')
        || lower.startsWith('data:')
        || lower.startsWith('vbscript:')
      ) {
        return null
      }
      try {
        const u = new URL(s)
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          return u.href
        }
        return null
      } catch {
        /* continue */
      }
      try {
        const u = new URL(s, window.location.href)
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          return u.href
        }
      } catch {
        /* continue */
      }
      const hostish = /^[\w.-]+(:\d+)?(\/|$)/.test(s) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(s)
      if (hostish && !/\s/.test(s)) {
        try {
          const cleaned = s.replace(/^\/+/, '')
          return new URL(`http://${cleaned}`).href
        } catch {
          return null
        }
      }
      return null
    },
    startLoadTimeout() {
      clearTimeout(this.loadTimeout)
      this.loadTimeout = setTimeout(() => {
        if (this.loading) {
          this.loading = false
          this.loadError = true
        }
      }, 15000)
    },
    toggleUrlBar() {
      this.urlBarVisible = !this.urlBarVisible
      this.$store.dispatch('windowManager/setAppUrlBarVisible', {
        appId: this.app.id,
        urlBarVisible: this.urlBarVisible,
      })
    },
    onUrlFocus() {
      this.urlInputFocused = true
      this.$nextTick(() => this.$refs.urlInput?.select())
    },
    onUrlBlur() {
      this.urlInputFocused = false
      this.$nextTick(() => {
        if (!this.urlInputFocused) {
          this.syncUrlInputFromApp()
        }
      })
    },
    onUrlCancel() {
      this.syncUrlInputFromApp()
      this.$refs.urlInput?.blur()
    },
    clearUrlInput() {
      this.urlInputValue = ''
      this.$refs.urlInput?.focus()
    },
    onReadonlyUrlActivate() {
      if (!this.canNavigate) {
        this.popout()
      }
    },
    handleUrlSearch(query) {
      const q = String(query || '').trim()
      if (!q || !this.canNavigate) {
        return
      }
      const engine = this.$store.state.searchEngine === ''
        ? 'https://duckduckgo.com/?q='
        : this.$store.state.searchEngine
      const searchUrl = engine + encodeURIComponent(q)
      this.urlInputValue = searchUrl
      this.navigateToUrl(searchUrl, { pushHistory: true })
    },
    pushToHistory(url) {
      if (!url || this.navHistory[this.navIndex] === url) {
        return
      }
      if (this.navIndex < this.navHistory.length - 1) {
        this.navHistory = this.navHistory.slice(0, this.navIndex + 1)
      }
      this.navHistory.push(url)
      this.navIndex = this.navHistory.length - 1
    },
    filesPathFromShellUrl(href) {
      if (!href || typeof href !== 'string') {
        return null
      }
      try {
        const u = new URL(href, window.location.href)
        let h = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash
        if (!h.startsWith('/files')) {
          return null
        }
        const qi = h.indexOf('?')
        const search = qi >= 0 ? h.slice(qi + 1) : ''
        const params = new URLSearchParams(search)
        const cd = params.get('cd')
        return cd != null && cd !== '' ? cd : '/'
      } catch {
        return null
      }
    },
    embedWindowIdFromAppUrl() {
      try {
        const u = new URL(this.app.url, window.location.href)
        const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash
        const qi = hash.indexOf('?')
        const search = qi >= 0 ? hash.slice(qi + 1) : ''
        return new URLSearchParams(search).get('embedWindowId')
      } catch {
        return null
      }
    },
    buildFilesEmbeddedHref(folderPath) {
      const wid = this.embedWindowIdFromAppUrl()
      if (!wid) {
        return null
      }
      const cd = encodeURIComponent(folderPath)
      const { origin, pathname } = window.location
      return `${origin}${pathname}#/files?embedWindowId=${encodeURIComponent(wid)}&cd=${cd}`
    },
    navigateToUrl(href, { pushHistory = false } = {}) {
      if (!href) {
        return
      }
      this.loading = true
      this.loadError = false
      this.iframeEntrySrc = href
      if (this.isCasaFilesEmbedded) {
        const p = this.filesPathFromShellUrl(href)
        this.urlInputValue = p != null ? p : href
      } else {
        this.urlInputValue = href
      }
      this.$store.dispatch('windowManager/setAppNavUrl', {
        appId: this.app.id,
        navUrl: href,
      })
      if (pushHistory) {
        this.pushToHistory(href)
      }
      this.startLoadTimeout()
      const iframe = this.$refs.iframe
      if (iframe) {
        iframe.src = href
      }
    },
    goBack() {
      if (!this.canGoBack) {
        return
      }
      this.suppressHistoryPush = true
      this.navIndex--
      const url = this.navHistory[this.navIndex]
      this.navigateToUrl(url, { pushHistory: false })
    },
    goForward() {
      if (!this.canGoForward) {
        return
      }
      this.suppressHistoryPush = true
      this.navIndex++
      const url = this.navHistory[this.navIndex]
      this.navigateToUrl(url, { pushHistory: false })
    },
    onUrlSubmit() {
      if (!this.canNavigate) {
        this.popout()
        return
      }
      const trimmed = this.urlInputValue.trim()
      if (!trimmed) {
        return
      }
      if (this.isCasaFilesEmbedded && trimmed.startsWith('/')) {
        const filesHref = this.buildFilesEmbeddedHref(trimmed)
        if (filesHref) {
          this.navigateToUrl(filesHref, { pushHistory: true })
          return
        }
      }
      let href = this.normalizeNavigateUrl(trimmed)
      if (!href) {
        href = this.normalizeNavigateUrl(`https://${trimmed}`)
      }
      if (!href) {
        this.handleUrlSearch(trimmed)
        return
      }
      this.navigateToUrl(href, { pushHistory: true })
    },
    /** Focus address bar on active embedded window (Ctrl/Cmd+L) */
    onEmbedHotkeys(e) {
      if (!this.isActive) {
        return
      }
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return
      }
      if (!(e.ctrlKey || e.metaKey) || (e.key !== 'l' && e.key !== 'L')) {
        return
      }
      if (this.urlBarMode === 'never') {
        return
      }
      if (this.urlBarMode === 'auto' && !this.showUrlBarPref) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      if (!this.urlBarVisible) {
        this.urlBarVisible = true
        this.$store.dispatch('windowManager/setAppUrlBarVisible', {
          appId: this.app.id,
          urlBarVisible: true,
        })
      }
      this.$nextTick(() => {
        const el = this.$refs.urlInput
        if (el) {
          el.focus()
          el.select()
        }
      })
    },
    desktopEl() {
      return this.$el && this.$el.closest ? this.$el.closest('.embedded-desktop') : null
    },
    cacheDesktopRect() {
      const desk = this.desktopEl()
      this.desktopRect = desk ? desk.getBoundingClientRect() : null
    },
    onShellMouseDown(e) {
      if (
        e.target.closest('.titlebar-actions')
        || e.target.closest('.resize-handle')
        || e.target.closest('.viewer-urlbar')
      ) {
        return
      }
      this.$store.dispatch('windowManager/activateApp', this.app.id)
    },
    /** Classic: mouse-only drag (original behavior). */
    onTitleMouseDown(e) {
      if (this.isEnhanced) {
        return
      }
      if (this.app.maximized || e.button !== 0) {
        return
      }
      e.preventDefault()
      const desk = this.desktopEl()
      if (!desk) {
        return
      }
      const rect = desk.getBoundingClientRect()
      const r = { ...(this.app.rect || {}) }
      this.drag = {
        startX: e.clientX,
        startY: e.clientY,
        deskW: rect.width,
        deskH: rect.height,
        startRect: { ...r },
      }
      this.$store.dispatch('windowManager/activateApp', this.app.id)
      window.addEventListener('mousemove', this.onDragMove)
      window.addEventListener('mouseup', this.endDragResize)
    },
    /** Enhanced: pointer/touch; slop before drag + shield so iframes do not interrupt drag. */
    onTitlePointerDown(e) {
      if (!this.isEnhanced || this.app.maximized) {
        return
      }
      if (e.button !== 0) {
        return
      }
      if (e.target.closest('.titlebar-actions')) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const desk = this.desktopEl()
      if (!desk) {
        return
      }
      const rect = desk.getBoundingClientRect()
      const r = { ...(this.app.rect || {}) }
      this.pendingTitleDrag = {
        startX: e.clientX,
        startY: e.clientY,
        deskW: rect.width,
        deskH: rect.height,
        startRect: { ...r },
        pointerId: e.pointerId,
      }
      this.$store.dispatch('windowManager/activateApp', this.app.id)
      window.addEventListener('pointermove', this.onTitlePointerMoveSlop, { passive: false })
      window.addEventListener('pointerup', this.onTitlePointerUpSlop)
      window.addEventListener('pointercancel', this.onTitlePointerUpSlop)
    },
    onTitlePointerMoveSlop(e) {
      if (!this.pendingTitleDrag || e.pointerId !== this.pendingTitleDrag.pointerId) {
        return
      }
      const p = this.pendingTitleDrag
      const dx = e.clientX - p.startX
      const dy = e.clientY - p.startY
      if (Math.hypot(dx, dy) < 4) {
        return
      }
      e.preventDefault()
      this.clearPendingTitleDragListeners()
      this.pendingTitleDrag = null
      this.cacheDesktopRect()
      this.dragShield = true
      this.drag = {
        startX: p.startX,
        startY: p.startY,
        deskW: p.deskW,
        deskH: p.deskH,
        startRect: { ...p.startRect },
        pointerId: p.pointerId,
      }
      window.addEventListener('pointermove', this.onDragPointerMove, { passive: false })
      window.addEventListener('pointerup', this.onPointerUpEnd)
      window.addEventListener('pointercancel', this.onPointerUpEnd)
      this.onDragPointerMove(e)
    },
    onTitlePointerUpSlop(e) {
      if (!this.pendingTitleDrag || e.pointerId !== this.pendingTitleDrag.pointerId) {
        return
      }
      this.clearPendingTitleDragListeners()
      this.pendingTitleDrag = null
    },
    clearPendingTitleDragListeners() {
      window.removeEventListener('pointermove', this.onTitlePointerMoveSlop)
      window.removeEventListener('pointerup', this.onTitlePointerUpSlop)
      window.removeEventListener('pointercancel', this.onTitlePointerUpSlop)
    },
    onTitlebarDblClick(e) {
      if (!this.isEnhanced) {
        return
      }
      if (e.target.closest('.titlebar-actions')) {
        return
      }
      e.preventDefault()
      this.toggleMaximize()
    },
    onDragMove(e) {
      if (!this.drag) {
        return
      }
      const { startX, startY, deskW, deskH, startRect } = this.drag
      const dx = ((e.clientX - startX) / deskW) * 100
      const dy = ((e.clientY - startY) / deskH) * 100
      this.$store.dispatch('windowManager/setAppRect', {
        appId: this.app.id,
        rect: {
          left: startRect.left + dx,
          top: startRect.top + dy,
        },
      })
    },
    onDragPointerMove(e) {
      if (!this.drag) {
        return
      }
      e.preventDefault()
      const { startX, startY, deskW, deskH, startRect } = this.drag
      const dx = ((e.clientX - startX) / deskW) * 100
      const dy = ((e.clientY - startY) / deskH) * 100
      this.$store.dispatch('windowManager/setAppRect', {
        appId: this.app.id,
        rect: {
          left: startRect.left + dx,
          top: startRect.top + dy,
        },
      })
    },
    /** Classic: mouse resize. */
    onResizeMouseDown(e) {
      if (this.isEnhanced) {
        return
      }
      if (this.app.maximized || e.button !== 0) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const desk = this.desktopEl()
      if (!desk) {
        return
      }
      const rect = desk.getBoundingClientRect()
      this.resize = {
        startX: e.clientX,
        startY: e.clientY,
        deskW: rect.width,
        deskH: rect.height,
        startRect: { ...(this.app.rect || {}) },
      }
      this.$store.dispatch('windowManager/activateApp', this.app.id)
      window.addEventListener('mousemove', this.onResizeMove)
      window.addEventListener('mouseup', this.endDragResize)
    },
    /** Enhanced: pointer resize + shield. */
    onResizePointerDown(e) {
      if (!this.isEnhanced) {
        return
      }
      if (this.app.maximized || e.button !== 0) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const desk = this.desktopEl()
      if (!desk) {
        return
      }
      this.cacheDesktopRect()
      this.dragShield = true
      const rect = desk.getBoundingClientRect()
      this.resize = {
        startX: e.clientX,
        startY: e.clientY,
        deskW: rect.width,
        deskH: rect.height,
        startRect: { ...(this.app.rect || {}) },
        pointerId: e.pointerId,
      }
      this.$store.dispatch('windowManager/activateApp', this.app.id)
      window.addEventListener('pointermove', this.onResizePointerMove, { passive: false })
      window.addEventListener('pointerup', this.onPointerUpEnd)
      window.addEventListener('pointercancel', this.onPointerUpEnd)
    },
    onResizeMove(e) {
      if (!this.resize) {
        return
      }
      const { startX, startY, deskW, deskH, startRect } = this.resize
      const dx = ((e.clientX - startX) / deskW) * 100
      const dy = ((e.clientY - startY) / deskH) * 100
      this.$store.dispatch('windowManager/setAppRect', {
        appId: this.app.id,
        rect: {
          width: startRect.width + dx,
          height: startRect.height + dy,
        },
      })
    },
    onResizePointerMove(e) {
      if (!this.resize) {
        return
      }
      e.preventDefault()
      const { startX, startY, deskW, deskH, startRect } = this.resize
      const dx = ((e.clientX - startX) / deskW) * 100
      const dy = ((e.clientY - startY) / deskH) * 100
      this.$store.dispatch('windowManager/setAppRect', {
        appId: this.app.id,
        rect: {
          width: startRect.width + dx,
          height: startRect.height + dy,
        },
      })
    },
    onPointerUpEnd(e) {
      if (this.drag && e.pointerId !== this.drag.pointerId) {
        return
      }
      if (this.resize && e.pointerId !== this.resize.pointerId) {
        return
      }
      if (!this.drag && !this.resize) {
        return
      }
      this.endDragResize()
    },
    endDragResize() {
      this.clearPendingTitleDragListeners()
      this.pendingTitleDrag = null
      this.dragShield = false
      this.desktopRect = null
      window.removeEventListener('mousemove', this.onDragMove)
      window.removeEventListener('mousemove', this.onResizeMove)
      window.removeEventListener('mouseup', this.endDragResize)
      window.removeEventListener('pointermove', this.onDragPointerMove)
      window.removeEventListener('pointermove', this.onResizePointerMove)
      window.removeEventListener('pointerup', this.onPointerUpEnd)
      window.removeEventListener('pointercancel', this.onPointerUpEnd)
      this.drag = null
      this.resize = null
    },
    hrefSameOriginAsShell(href) {
      try {
        return new URL(href).origin === window.location.origin
      } catch {
        return false
      }
    },
    onIframeLoad() {
      this.loading = false
      clearTimeout(this.loadTimeout)
      this.maybeSyncNavFromIframe()
      if (this.suppressHistoryPush) {
        this.suppressHistoryPush = false
        this.syncUrlInputFromApp()
        return
      }
      const href = this.readIframeHref()
      if (href && this.hrefSameOriginAsShell(href) && href !== this.navHistory[this.navIndex]) {
        this.pushToHistory(href)
      }
      this.syncUrlInputFromApp()
    },
    onIframeError() {
      this.loading = false
      this.loadError = true
      clearTimeout(this.loadTimeout)
      this.suppressHistoryPush = false
    },
    reloadIframe() {
      this.loading = true
      this.loadError = false
      this.startLoadTimeout()
      this.iframeEntrySrc = this.app.navUrl || this.app.url
      this.syncUrlInputFromApp()
      const iframe = this.$refs.iframe
      if (iframe) {
        iframe.src = this.iframeEntrySrc
      }
    },
    /** Same-origin iframe only; cross-origin throws */
    readIframeHref() {
      const iframe = this.$refs.iframe
      if (!iframe || !iframe.contentWindow) {
        return null
      }
      try {
        const href = iframe.contentWindow.location.href
        if (!href) {
          return null
        }
        const u = new URL(href)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return null
        }
        return href
      } catch {
        return null
      }
    },
    maybeSyncNavFromIframe() {
      const href = this.readIframeHref()
      if (!href || href === this.app.navUrl) {
        return
      }
      if (href === this.app.url && !this.app.navUrl) {
        return
      }
      this.$store.dispatch('windowManager/setAppNavUrl', {
        appId: this.app.id,
        navUrl: href,
      })
    },
    resolvePopoutUrl() {
      return this.app.navUrl || this.readIframeHref() || this.app.url
    },
    popout() {
      window.open(this.resolvePopoutUrl(), '_blank')
    },
    minimize() {
      this.$store.dispatch('windowManager/minimizeApp', this.app.id)
    },
    toggleMaximize() {
      this.$store.dispatch('windowManager/toggleAppMaximized', this.app.id)
    },
    close() {
      this.$store.dispatch('windowManager/closeApp', this.app.id)
    },
    openInNewTab() {
      window.open(this.resolvePopoutUrl(), '_blank')
      this.close()
    },
  },
}
</script>

<template>
  <div
    class="embedded-viewer"
    :class="{
      'is-maximized': app.maximized,
      'is-active-shell': isActive,
      'embedded-viewer--enhanced': isEnhanced,
      'embedded-viewer--enhanced-entry': isEnhanced && enhancedEntryActive,
    }"
    :style="shellStyle"
    @mousedown="onShellMouseDown"
  >
    <!-- Captures pointer above all iframes in the desktop while dragging (enhanced only). -->
    <div
      v-show="dragShield"
      class="embed-drag-shield"
      :style="dragShieldStyle"
      aria-hidden="true"
    />

    <div class="viewer-frame">
      <!-- Window Title Bar -->
      <div
        class="viewer-titlebar"
        :class="{ 'is-draggable': !app.maximized }"
        @mousedown="onTitleMouseDown"
        @pointerdown="onTitlePointerDown"
        @dblclick="onTitlebarDblClick"
      >
        <div class="titlebar-info">
          <img
            v-if="app.icon"
            :src="app.icon"
            class="titlebar-icon"
            :alt="titlebarLabel"
          >
          <span class="titlebar-name" :title="titlebarLabel">{{ titlebarLabel }}</span>
        </div>

        <div class="titlebar-actions" @mousedown.stop @pointerdown.stop>
          <button
            v-if="showTitlebarUrlToggle"
            class="titlebar-btn"
            :class="{ 'is-active': urlBarVisible }"
            :title="$t('Toggle address bar')"
            @click="toggleUrlBar"
          >
            <b-icon icon="link-variant" size="is-small" />
          </button>
          <button class="titlebar-btn" :title="$t('Reload')" @click="reloadIframe">
            <b-icon icon="refresh" size="is-small" />
          </button>
          <button
            v-if="!isCasaShellEmbedded"
            class="titlebar-btn"
            :title="$t('Open in new tab')"
            @click="popout"
          >
            <b-icon icon="open-in-new" size="is-small" />
          </button>
          <button class="titlebar-btn" title="Minimize" @click="minimize">
            <b-icon icon="minus" size="is-small" />
          </button>
          <button
            class="titlebar-btn"
            :title="app.maximized ? 'Restore window' : 'Maximize workspace'"
            @click="toggleMaximize"
          >
            <b-icon :icon="app.maximized ? 'window-restore' : 'window-maximize'" size="is-small" />
          </button>
          <button
            class="titlebar-btn titlebar-btn-close"
            :title="$t('Close')"
            @click="close"
          >
            <b-icon icon="close" size="is-small" />
          </button>
        </div>
      </div>

      <div
        v-if="shouldShowUrlBar"
        class="viewer-urlbar"
        :class="{ 'is-cross-origin': !isSameOrigin }"
        @mousedown.stop
        @pointerdown.stop
      >
        <div class="urlbar-nav">
          <button
            type="button"
            class="urlbar-btn"
            :disabled="!canGoBack"
            :title="$t('Back')"
            @click="goBack"
          >
            <b-icon icon="chevron-left" size="is-small" />
          </button>
          <button
            type="button"
            class="urlbar-btn"
            :disabled="!canGoForward"
            :title="$t('Forward')"
            @click="goForward"
          >
            <b-icon icon="chevron-right" size="is-small" />
          </button>
        </div>

        <div class="urlbar-input-wrapper">
          <b-icon
            :icon="urlBarSecurityIcon"
            :class="urlBarSecurityClass"
            size="is-small"
            class="urlbar-security-icon"
          />
          <input
            ref="urlInput"
            v-model="urlInputValue"
            type="text"
            class="urlbar-input"
            :class="{ 'is-readonly': !canNavigate }"
            :readonly="!canNavigate"
            spellcheck="false"
            autocomplete="off"
            :aria-label="$t('Enter URL or search')"
            :placeholder="$t('Enter URL or search')"
            @focus="onUrlFocus"
            @blur="onUrlBlur"
            @click="onReadonlyUrlActivate"
            @keydown.enter.prevent="onUrlSubmit"
            @keydown.esc.prevent="onUrlCancel"
          >
          <button
            v-if="urlInputFocused && canNavigate"
            type="button"
            class="urlbar-clear"
            :title="$t('Close')"
            @click.stop="clearUrlInput"
          >
            <b-icon icon="close-circle" size="is-small" />
          </button>
        </div>

        <div class="urlbar-actions">
          <button
            type="button"
            class="urlbar-btn"
            :title="$t('Reload')"
            @click="reloadIframe"
          >
            <b-icon icon="refresh" size="is-small" />
          </button>
          <button
            v-if="!isSameOrigin && !isCasaShellEmbedded"
            type="button"
            class="urlbar-btn urlbar-btn-external"
            :title="$t('Open in new tab')"
            @click="popout"
          >
            <b-icon icon="open-in-new" size="is-small" />
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="viewer-content">
        <div v-if="loading" class="viewer-loading">
          <img :src="require('@/assets/img/loading/waiting.svg')" alt="loading" class="loading-spinner">
          <p>{{ $t('Loading') }}...</p>
        </div>

        <div v-if="loadError" class="viewer-error">
          <b-icon icon="alert-circle-outline" size="is-large" />
          <p class="mt-3">{{ $t('This app cannot be displayed in embedded mode.') }}</p>
          <p class="has-text-grey is-size-7 mt-1">{{ $t('The app may block iframe embedding.') }}</p>
          <b-button
            class="mt-4"
            type="is-dark"
            rounded
            @click="openInNewTab"
          >
            {{ $t('Open in new tab') }}
          </b-button>
        </div>

        <iframe
          v-show="!loadError"
          ref="iframe"
          :src="iframeEntrySrc"
          :style="iframeStyle"
          :title="titlebarLabel"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          @load="onIframeLoad"
          @error="onIframeError"
        />
      </div>

      <div
        v-if="!app.maximized"
        class="resize-handle"
        title="Resize"
        @mousedown="onResizeMouseDown"
        @pointerdown="onResizePointerDown"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.embedded-viewer {
  flex-direction: column;
  background: transparent;
  overflow: visible;
  box-sizing: border-box;

  &.is-active-shell .viewer-frame {
    box-shadow:
      0 0 0 1px var(--shell-embed-active-ring),
      0 12px 40px var(--shell-embed-shadow);
  }

  &:not(.is-maximized) .viewer-frame {
    border-radius: 8px;
  }
}

/* Full-screen transparent layer; must not block clicks when hidden */
.embed-drag-shield {
  pointer-events: auto;
  background: transparent;
}

.embedded-viewer--enhanced-entry .viewer-frame {
  animation: shellEmbedWindowIn 0.22s cubic-bezier(0.2, 0.82, 0.2, 1) both;
}

@keyframes shellEmbedWindowIn {
  from {
    opacity: 0.88;
    transform: scale(0.988);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.embedded-viewer--enhanced .viewer-titlebar.is-draggable {
  touch-action: none;
}

.viewer-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--shell-embed-frame-bg);
  overflow: hidden;
}

.viewer-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2rem;
  min-height: 2rem;
  padding: 0 0.5rem;
  background: var(--shell-embed-titlebar-bg);
  border-bottom: 1px solid var(--shell-embed-titlebar-border);
  user-select: none;
  flex-shrink: 0;

  &.is-draggable {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
}

.titlebar-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  pointer-events: none;
}

.titlebar-icon {
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.titlebar-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--shell-embed-titlebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.viewer-urlbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.375rem 0.5rem;
  min-height: 2.25rem;
  box-sizing: border-box;
  background: var(--shell-embed-titlebar-bg);
  border-bottom: 1px solid var(--shell-embed-titlebar-border);

  &.is-cross-origin {
    .urlbar-input-wrapper {
      background: rgba(255, 193, 7, 0.08);
      border-color: rgba(255, 193, 7, 0.35);
    }
  }
}

.urlbar-nav {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.urlbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--shell-embed-icon);
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: var(--shell-embed-icon-hover-bg);
    color: var(--shell-embed-icon-hover);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.urlbar-btn-external {
  color: var(--accent-color, #007aff);
}

.urlbar-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  padding: 0 0.5rem;
  background: var(--shell-embed-frame-bg);
  border: 1px solid var(--shell-embed-titlebar-border);
  border-radius: 6px;
  min-height: 1.75rem;
}

.urlbar-security-icon {
  flex-shrink: 0;

  &.is-secure {
    color: #22c55e;
  }

  &.is-external {
    color: #f59e0b;
  }
}

.urlbar-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: var(--shell-embed-titlebar-text);

  &:focus {
    outline: none;
  }

  &.is-readonly {
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &::placeholder {
    color: var(--shell-muted-text, rgba(255, 255, 255, 0.45));
  }
}

.urlbar-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: var(--shell-muted-text, rgba(255, 255, 255, 0.45));

  &:hover {
    color: var(--shell-embed-icon-hover);
  }
}

.urlbar-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.titlebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--shell-embed-icon);
  transition: all 0.15s;

  &:hover {
    background: var(--shell-embed-icon-hover-bg);
    color: var(--shell-embed-icon-hover);
  }

  &.titlebar-btn-close:hover {
    background: rgba(220, 38, 38, 0.25);
    color: rgb(248, 113, 113);
  }

  &.is-active {
    background: var(--shell-embed-icon-hover-bg);
    color: var(--accent-color, #007aff);
  }
}

.viewer-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  z-index: 3;
  background: linear-gradient(
    135deg,
    transparent 50%,
    var(--shell-embed-resize) 50%
  );
  border-bottom-right-radius: 8px;
}

.embedded-viewer--enhanced .resize-handle {
  touch-action: none;
}

.viewer-loading,
.viewer-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--shell-embed-loading-bg);
  z-index: 2;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
}

.viewer-error {
  color: var(--shell-embed-loading-text);
}
</style>
