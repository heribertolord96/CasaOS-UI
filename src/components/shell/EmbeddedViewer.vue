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
    }
  },
  computed: {
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
  },
  mounted() {
    this.loadTimeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false
        this.loadError = true
      }
    }, 15000)
  },
  beforeDestroy() {
    clearTimeout(this.loadTimeout)
    this.endDragResize()
  },
  methods: {
    desktopEl() {
      return this.$el && this.$el.closest ? this.$el.closest('.embedded-desktop') : null
    },
    onShellMouseDown(e) {
      if (e.target.closest('.titlebar-actions') || e.target.closest('.resize-handle')) {
        return
      }
      this.$store.dispatch('windowManager/activateApp', this.app.id)
    },
    onTitleMouseDown(e) {
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
    onResizeMouseDown(e) {
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
    endDragResize() {
      this.drag = null
      this.resize = null
      window.removeEventListener('mousemove', this.onDragMove)
      window.removeEventListener('mousemove', this.onResizeMove)
      window.removeEventListener('mouseup', this.endDragResize)
    },
    onIframeLoad() {
      this.loading = false
      clearTimeout(this.loadTimeout)
    },
    onIframeError() {
      this.loading = false
      this.loadError = true
      clearTimeout(this.loadTimeout)
    },
    reloadIframe() {
      this.loading = true
      this.loadError = false
      this.loadTimeout = setTimeout(() => {
        if (this.loading) {
          this.loading = false
          this.loadError = true
        }
      }, 15000)
      const iframe = this.$refs.iframe
      if (iframe) {
        iframe.src = this.app.url
      }
    },
    popout() {
      window.open(this.app.url, '_blank')
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
      window.open(this.app.url, '_blank')
      this.close()
    },
  },
}
</script>

<template>
  <div
    class="embedded-viewer"
    :class="{ 'is-maximized': app.maximized, 'is-active-shell': isActive }"
    :style="shellStyle"
    @mousedown="onShellMouseDown"
  >
    <div class="viewer-frame">
      <!-- Window Title Bar -->
      <div
        class="viewer-titlebar"
        :class="{ 'is-draggable': !app.maximized }"
        @mousedown="onTitleMouseDown"
      >
        <div class="titlebar-info">
          <img
            v-if="app.icon"
            :src="app.icon"
            class="titlebar-icon"
            :alt="app.name"
          >
          <span class="titlebar-name">{{ app.name }}</span>
        </div>

        <div class="titlebar-actions" @mousedown.stop>
          <button class="titlebar-btn" :title="$t('Reload')" @click="reloadIframe">
            <b-icon icon="refresh" size="is-small" />
          </button>
          <button class="titlebar-btn" :title="$t('Open in new tab')" @click="popout">
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
          <button class="titlebar-btn titlebar-btn-close" title="Close" @click="close">
            <b-icon icon="close" size="is-small" />
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
          :src="app.url"
          :style="iframeStyle"
          :title="app.name"
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
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35), 0 12px 40px rgba(0, 0, 0, 0.35);
  }

  &:not(.is-maximized) .viewer-frame {
    border-radius: 8px;
  }
}

.viewer-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #1a1a1e;
  overflow: hidden;
}

.viewer-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2rem;
  min-height: 2rem;
  padding: 0 0.5rem;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
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
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  &.titlebar-btn-close:hover {
    background: rgba(220, 38, 38, 0.25);
    color: rgb(248, 113, 113);
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
    rgba(255, 255, 255, 0.25) 50%
  );
  border-bottom-right-radius: 8px;
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
  background: #1e1e1e;
  z-index: 2;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
}

.viewer-error {
  color: rgba(255, 255, 255, 0.75);
}
</style>
