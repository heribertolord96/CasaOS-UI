<script>
import AccountMenuEmbed from '@/components/account/AccountMenuEmbed.vue'
import DashboardSettingsGeneralBlock from '@/components/shell/DashboardSettingsGeneralBlock.vue'
import ShellPreferencesForm from '@/components/shell/ShellPreferencesForm.vue'
import { DEFAULT_SEARCH_ENGINES, defaultLanguagesList } from '@/components/shell/dashboardGeneralDefaults'
import business_OpenThirdApp from '@/mixins/app/Business_OpenThirdApp'
import business_ShowNewAppTag from '@/mixins/app/Business_ShowNewAppTag'
import commonI18n from '@/mixins/base/common-i18n'
import usePreferences from '@/mixins/usePreferences'
import events from '@/events/events'

/**
 * Taskbar “Apps” menu: tools rail + main column (apps list or settings panes).
 * Size caps: --app-menu-max-h (viewport minus TopBar margin), --app-menu-shell-w in scoped CSS.
 */
export default {
  name: 'AppMenuDropdown',
  components: { AccountMenuEmbed, DashboardSettingsGeneralBlock, ShellPreferencesForm },
  mixins: [business_OpenThirdApp, business_ShowNewAppTag, commonI18n, usePreferences],
  props: {
    barData: {
      type: Object,
      required: true,
    },
    languages: {
      type: Array,
      default() {
        return defaultLanguagesList()
      },
    },
    searchEngines: {
      type: Array,
      default() {
        return DEFAULT_SEARCH_ENGINES.slice()
      },
    },
    rssSwitch: {
      type: Boolean,
      default: false,
    },
    updateAvailable: {
      type: Boolean,
      default: false,
    },
    restartText: {
      type: String,
      default: 'Restart',
    },
    shutdownText: {
      type: String,
      default: 'Shutdown',
    },
  },
  data() {
    return {
      appList: [],
      isLoading: true,
      mainPane: 'apps',
    }
  },
  computed: {
    isGridIcons() {
      return this.appMenuDisplay === 'gridIcons'
    },
    mainHeaderTitle() {
      if (this.mainPane === 'settings') {
        return this.$t('Settings')
      }
      if (this.mainPane === 'account') {
        return this.$t('Account')
      }
      if (this.mainPane === 'advanced') {
        return this.$t('Advanced settings')
      }
      return this.$t('Apps')
    },
  },
  mounted() {
    this.loadApps()
    this.$EventBus.$on(events.RELOAD_APP_LIST, this.loadApps)
  },
  beforeDestroy() {
    this.$EventBus.$off(events.RELOAD_APP_LIST, this.loadApps)
  },
  methods: {
    async loadApps() {
      try {
        const orgAppList = await this.$openAPI.appGrid.getAppGrid().then(res => res.data.data || [])
        this.appList = orgAppList
          .filter(item => item.app_type !== 'v1app' && item.app_type !== 'container')
          .map(item => ({
            ...item,
            hostname: this.resolveAppWebHostname(item.hostname || ''),
            icon: item.icon || require('@/assets/img/app/default.svg'),
          }))
        this.isLoading = false
      } catch (e) {
        console.error('AppMenuDropdown: failed to load apps', e)
      }
    },
    handleAppClick(item) {
      this.$refs.menuDrop.toggle()
      if (item.status === 'running') {
        this.openAppToNewWindow(item)
      } else {
        this.firstOpenThirdApp(item)
      }
    },
    handleAppStoreClick() {
      this.$refs.menuDrop.toggle()
      this.$EventBus.$emit('casaUI:openAppStore')
    },
    handleFilesClick() {
      this.$refs.menuDrop.toggle()
      this.$EventBus.$emit('casaUI:openFiles')
    },
    handleTerminalClick() {
      this.$refs.menuDrop.toggle()
      this.$EventBus.$emit('casaUI:requestTerminalFromMenu')
    },
    handleSettingsClick() {
      this.mainPane = 'settings'
    },
    handleSettingsAccountClick() {
      this.mainPane = 'account'
    },
    handleSettingsAdvancedClick() {
      this.mainPane = 'advanced'
    },
    goAppsMainPane() {
      this.mainPane = 'apps'
    },
    onAppMenuActiveChange(isActive) {
      if (!isActive) {
        this.mainPane = 'apps'
      }
    },
    emitDashboardPower(key) {
      this.$emit('dashboard-power', key)
    },
  },
}
</script>

<template>
  <b-dropdown
    ref="menuDrop"
    animation="fade1"
    aria-role="list"
    class="navbar-item app-menu-dropdown"
    :class="{ 'app-menu-dropdown--pane': mainPane !== 'apps' }"
    :mobile-modal="false"
    @active-change="onAppMenuActiveChange"
  >
    <template #trigger>
      <b-tooltip
        :active="!$store.state.isMobile"
        :label="$t('Apps')"
        position="is-bottom"
        type="is-dark"
      >
        <p role="button">
          <b-icon class="picon" icon="display-applications-outline" pack="casa" size="is-20" />
        </p>
      </b-tooltip>
    </template>

    <b-dropdown-item :focusable="false" aria-role="menu-item" class="p-0" custom>
      <div
        class="app-menu-content"
        :class="{ 'is-grid-icons': isGridIcons, 'is-pane-view': mainPane !== 'apps' }"
      >
        <div class="app-menu-panel">
          <aside class="app-menu-tools-rail" role="toolbar">
            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('Apps')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :class="{ 'is-active': mainPane === 'apps' }"
                :aria-label="$t('Apps')"
                :aria-current="mainPane === 'apps' ? 'page' : undefined"
                @click="goAppsMainPane"
              >
                <b-icon class="app-menu-tool-icon app-menu-tool-icon--b" icon="display-applications-outline" pack="casa" />
              </button>
            </b-tooltip>

            <div class="app-menu-rail-divider" role="presentation" />

            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('App Store')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :aria-label="$t('App Store')"
                @click="handleAppStoreClick"
              >
                <img
                  :src="require('@/assets/img/app/appstore.svg')"
                  class="app-menu-tool-icon"
                  alt=""
                >
              </button>
            </b-tooltip>
            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('Files')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :aria-label="$t('Files')"
                @click="handleFilesClick"
              >
                <img :src="require('@/assets/img/app/files.svg')" class="app-menu-tool-icon" alt="">
              </button>
            </b-tooltip>

            <div class="app-menu-rail-divider" role="presentation" />

            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('Terminal & Logs')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :aria-label="$t('Terminal & Logs')"
                @click="handleTerminalClick"
              >
                <b-icon class="app-menu-tool-icon app-menu-tool-icon--b" icon="terminal-outline" pack="casa" />
              </button>
            </b-tooltip>
            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('Settings')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :class="{ 'is-active': mainPane === 'settings' }"
                :aria-label="$t('Settings')"
                :aria-current="mainPane === 'settings' ? 'page' : undefined"
                @click="handleSettingsClick"
              >
                <b-icon
                  class="app-menu-tool-icon app-menu-tool-icon--b"
                  :class="{ 'app-menu-settings-update-dot': updateAvailable }"
                  icon="control-outline"
                  pack="casa"
                />
              </button>
            </b-tooltip>

            <div class="app-menu-rail-divider" role="presentation" />

            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('Account')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :class="{ 'is-active': mainPane === 'account' }"
                :aria-label="$t('Account')"
                @click="handleSettingsAccountClick"
              >
                <b-icon class="app-menu-tool-icon app-menu-tool-icon--b" icon="account-outline" pack="casa" />
              </button>
            </b-tooltip>
            <b-tooltip
              :active="!$store.state.isMobile"
              :label="$t('Advanced settings')"
              position="is-right"
              type="is-dark"
            >
              <button
                type="button"
                class="app-menu-tool"
                :class="{ 'is-active': mainPane === 'advanced' }"
                :aria-label="$t('Advanced settings')"
                @click="handleSettingsAdvancedClick"
              >
                <b-icon class="app-menu-tool-icon app-menu-tool-icon--b" icon="settings-outline" pack="casa" />
              </button>
            </b-tooltip>
          </aside>

          <div class="app-menu-main">
            <!-- Account pane: AccountMenuEmbed already has title + Logout in its header -->
            <div v-if="mainPane !== 'account'" class="app-menu-main-header">
              <h3 class="app-menu-title">
                {{ mainHeaderTitle }}
              </h3>
            </div>
            <div class="app-menu-scroll">
              <template v-if="mainPane === 'apps'">
                <p v-if="isLoading" class="app-menu-loading is-size-7 px-4 py-2">
                  {{ $t('Loading') }}…
                </p>
                <div v-else class="app-menu-list">
                  <b-tooltip
                    v-for="item in appList"
                    :key="item.name"
                    :active="isGridIcons && !$store.state.isMobile"
                    :label="i18n(item.title)"
                    position="is-right"
                    type="is-dark"
                  >
                    <div
                      class="app-menu-item"
                      :class="{ 'is-stopped': item.status !== 'running' }"
                      @click="handleAppClick(item)"
                    >
                      <img :src="item.icon" class="app-menu-icon" :alt="item.name">
                      <span v-show="!isGridIcons" class="app-menu-item-name">{{ i18n(item.title) }}</span>
                      <span v-if="!isGridIcons && item.status !== 'running'" class="app-menu-status">{{ $t('Stopped') }}</span>
                    </div>
                  </b-tooltip>
                </div>
              </template>
              <div v-else-if="mainPane === 'settings'" class="app-menu-pane-embed app-menu-pane-embed--settings">
                <DashboardSettingsGeneralBlock
                  :bar-data="barData"
                  :languages="languages"
                  :search-engines="searchEngines"
                  :rss-switch="rssSwitch"
                  embedded
                  omit-power-footer
                  :restart-text="restartText"
                  :shutdown-text="shutdownText"
                  @save="$emit('dashboard-save')"
                  @update:rssSwitch="$emit('update:rssSwitch', $event)"
                  @rss-input="$emit('rss-input')"
                />
              </div>
              <div v-else-if="mainPane === 'account'" class="app-menu-pane-embed app-menu-pane-embed--account">
                <AccountMenuEmbed />
              </div>
              <div v-else-if="mainPane === 'advanced'" class="app-menu-pane-embed app-menu-pane-embed--advanced">
                <ShellPreferencesForm />
                <hr class="app-menu-section-divider" role="presentation">
                <p class="is-size-7 has-text-weight-semibold px-4 pt-2 mb-1 app-menu-section-label">
                  {{ $t('Danger zone') }}
                </p>
                <div class="app-menu-danger-zone px-4 pb-3">
                  <p class="is-size-7 mb-2 _has-text-gray">
                    {{ $t('Advanced settings hint') }}
                  </p>
                  <b-button
                    class="is-fullwidth"
                    type="is-danger"
                    outlined
                    rounded
                    @click.stop="$emit('restore-initial-configuration')"
                  >
                    {{ $t('Restore initial configuration') }}
                  </b-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="app-menu-power-footer" role="toolbar">
          <div
            class="is-flex is-align-content-center is-justify-content-center _footer pl-2 pr-2 pt-2 pb-2"
          >
            <div
              class="mr-1 column is-half is-flex is-align-items-center is-justify-content-center hover-effect is-clickable _is-radius _is-normal"
              @click.stop="emitDashboardPower('Restart')"
            >
              <b-icon class="mr-1" icon="restart-outline" pack="casa" />
              {{ restartText }}
            </div>
            <div
              class="ml-1 column is-half is-flex is-align-items-center is-justify-content-center is-clickable hover-effect-attention _has-text-attention _is-radius"
              @click.stop="emitDashboardPower('Shutdown')"
            >
              <b-icon
                class="mr-1"
                custom-class="_has-text-attention"
                icon="shutdown-outline"
                pack="casa"
              />
              {{ shutdownText }}
            </div>
          </div>
        </div>
      </div>
    </b-dropdown-item>
  </b-dropdown>
</template>

<style lang="scss" scoped>
/* Shell size tokens; scroll lives in .app-menu-scroll */
.app-menu-dropdown {
  /* Wider pane for Settings / Account / Advanced; still safe on narrow screens */
  --app-menu-shell-w: min(40rem, calc(100vw - 1.5rem));
  /* Leave air below TopBar (~3.5rem) so the menu never hugs the viewport edge */
  --app-menu-viewport-cap: min(calc(100dvh - 3.75rem), calc(100vh - 3.75rem));
  --app-menu-max-h: var(--app-menu-viewport-cap);
  /* Pane column: tall enough to read forms, never taller than the cap */
  --app-menu-pane-min-h: min(26rem, var(--app-menu-max-h));

  :deep(> .dropdown-menu) {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--app-menu-shell-w) !important;
    min-width: min(19rem, calc(100vw - 1.25rem)) !important;
    max-width: var(--app-menu-shell-w) !important;
    max-height: var(--app-menu-max-h) !important;
    overflow: hidden;
  }

  :deep(.dropdown-menu .dropdown-content) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    min-height: 0;
    max-height: var(--app-menu-max-h);
    overflow: hidden;
  }

  :deep(.dropdown-content > .dropdown-item.p-0) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    box-sizing: border-box;
    align-self: stretch;
    width: 100%;
    min-width: 0;
    min-height: 0;
    max-height: var(--app-menu-max-h);
    white-space: normal;
  }

  /* Settings / Account / Advanced: fixed column height chain + internal scroll */
  &.app-menu-dropdown--pane {
    :deep(> .dropdown-menu) {
      height: auto;
      max-height: var(--app-menu-max-h) !important;
      min-height: var(--app-menu-pane-min-h) !important;
    }

    :deep(.dropdown-menu .dropdown-content) {
      height: auto;
      max-height: var(--app-menu-max-h);
      flex: 1 1 auto;
      min-height: min(var(--app-menu-pane-min-h), var(--app-menu-max-h));
    }

    :deep(.dropdown-content > .dropdown-item.p-0) {
      flex: 1 1 auto;
      height: auto;
      max-height: var(--app-menu-max-h);
      min-height: min(var(--app-menu-pane-min-h), var(--app-menu-max-h));
    }
  }
}

.app-menu-content {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  align-items: stretch;
  align-self: flex-start;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* Apps list: modest min height; short viewports use less dead space */
  min-height: min(16rem, 42vh);
  max-height: var(--app-menu-max-h);
  flex: 1 1 auto;
  padding: 0.5rem;
  overflow: hidden;
}

.app-menu-content.is-pane-view {
  align-self: stretch;
  flex: 1 1 auto;
  min-height: 0;
  /* Preview: height/max-height 100% (devtools “100px” would collapse the pane) */
  height: 100%;
  max-height: 100%;
}

.app-menu-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: row;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--shell-app-menu-divider);
  border-radius: 10px;
  background: var(--shell-dropdown-bg);
  box-shadow: var(--shell-dropdown-shadow);
}

.app-menu-power-footer {
  flex-shrink: 0;
  margin-top: 0.375rem;
  overflow: hidden;
  border: 1px solid var(--shell-app-menu-divider);
  border-radius: 10px;
  background: var(--shell-dropdown-bg);
  box-shadow: var(--shell-dropdown-shadow);
}

.app-menu-tools-rail {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  align-self: stretch;
  justify-content: flex-start;
  /* Slightly looser vertical rhythm between tools and section dividers */
  gap: 0.375rem;
  width: 3.125rem;
  min-width: 3.125rem;
  max-width: 3.125rem;
  padding: 0.5rem 0.25rem;
  border-right: 1px solid var(--shell-app-menu-divider);
  box-sizing: border-box;
  background: var(--shell-app-menu-rail-bg);
}

.app-menu-rail-divider {
  flex-shrink: 0;
  width: 100%;
  height: 1px;
  /* Extra air around divider lines so groups read as distinct blocks */
  margin: 0.1875rem 0;
  background: var(--shell-app-menu-divider);
}

.app-menu-settings-update-dot {
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: $danger;
  }
}

.app-menu-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--shell-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--shell-focus-ring, rgba(100, 180, 255, 0.6));
    outline-offset: 1px;
  }

  &.is-active {
    background: var(--shell-tab-toggle-active-bg, var(--shell-hover));
  }
}

.app-menu-tool-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 5px;
  pointer-events: none;

  &--b {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--shell-app-menu-item);
  }
}

.app-menu-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-menu-main-header {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  align-items: center;
  min-width: 0;
  border-bottom: 1px solid var(--shell-app-menu-divider);
}

.app-menu-main-header .app-menu-title {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.app-menu-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.app-menu-loading {
  margin: 0;
  color: var(--shell-muted-text);
}

.app-menu-title {
  flex-shrink: 0;
  padding: 0.375rem 0.75rem 0.5rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--shell-app-menu-title);
  text-transform: uppercase;
}

.app-menu-list {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  align-content: flex-start;
  gap: 0.375rem;
  box-sizing: border-box;
  width: 100%;
  min-height: min-content;
  padding: 0 0.5rem 0.25rem;

  > * {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
  }
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5625rem 0.75rem;
  font-size: 0.875rem;
  color: var(--shell-app-menu-item);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: var(--shell-hover);
  }

  &.is-stopped {
    opacity: 0.6;
  }
}

.app-menu-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 5px;
}

.app-menu-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-menu-status {
  font-size: 0.6875rem;
  color: var(--shell-app-menu-status);
}

.app-menu-pane-embed {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 0.35rem 0.5rem;
}

.app-menu-section-divider {
  height: 1px;
  margin: 0.5rem 1rem;
  border: none;
  background: var(--shell-divider);
}

.app-menu-section-label {
  color: var(--shell-muted-text);
}

.app-menu-danger-zone {
  padding-top: 0.5rem;
}

.app-menu-content.is-grid-icons {
  min-width: 16rem;
  max-width: min(28rem, calc(100vw - 5rem));

  .app-menu-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.625rem;
    align-items: flex-start;
    align-content: flex-start;
  }

  .app-menu-list > * {
    width: auto;
  }

  .app-menu-item {
    flex-direction: column;
    gap: 0;
    justify-content: center;
    width: 3.5rem;
    min-height: 3.5rem;
    padding: 0.375rem;
    text-align: center;
  }

  .app-menu-icon {
    width: 2rem;
    height: 2rem;
    margin: 0 auto;
  }
}
</style>
