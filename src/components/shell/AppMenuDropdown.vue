<script>
import business_OpenThirdApp from '@/mixins/app/Business_OpenThirdApp'
import business_ShowNewAppTag from '@/mixins/app/Business_ShowNewAppTag'
import commonI18n from '@/mixins/base/common-i18n'
import usePreferences from '@/mixins/usePreferences'
import events from '@/events/events'

export default {
  name: 'AppMenuDropdown',
  mixins: [business_OpenThirdApp, business_ShowNewAppTag, commonI18n, usePreferences],
  inject: {
    homeShowFiles: { default: () => () => {} },
  },
  data() {
    return {
      appList: [],
      isLoading: true,
    }
  },
  created() {
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
            hostname: item.hostname || this.$baseIp,
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
      if (this.homeShowFiles) {
        this.homeShowFiles()
      }
    },
  },
  computed: {
    isGridIcons() {
      return this.appMenuDisplay === 'gridIcons'
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
      <div class="app-menu-content" :class="{ 'is-grid-icons': isGridIcons }">
        <h3 class="app-menu-title">{{ $t('Apps') }}</h3>

        <div class="app-menu-fixed">
          <b-tooltip
            :active="isGridIcons && !$store.state.isMobile"
            label="App Store"
            position="is-right"
            type="is-dark"
          >
            <div class="app-menu-item" @click="handleAppStoreClick">
              <img :src="require('@/assets/img/app/appstore.svg')" class="app-menu-icon" alt="App Store">
              <span v-show="!isGridIcons">App Store</span>
            </div>
          </b-tooltip>
          <b-tooltip
            :active="isGridIcons && !$store.state.isMobile"
            :label="$t('Files')"
            position="is-right"
            type="is-dark"
          >
            <div class="app-menu-item" @click="handleFilesClick">
              <img :src="require('@/assets/img/app/files.svg')" class="app-menu-icon" alt="Files">
              <span v-show="!isGridIcons">{{ $t('Files') }}</span>
            </div>
          </b-tooltip>
        </div>

        <div v-if="appList.length > 0" class="app-menu-divider" />

        <div class="app-menu-list">
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
      </div>
    </b-dropdown-item>
  </b-dropdown>
</template>

<style lang="scss" scoped>
.app-menu-content {
  padding: 0.5rem 0;
  max-height: 24rem;
  overflow-y: auto;
  min-width: 14rem;
}

.app-menu-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
  padding: 0.375rem 1rem;
}

.app-menu-fixed {
  padding: 0 0.375rem;
}

.app-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0.375rem 0.75rem;
}

.app-menu-list {
  padding: 0 0.375rem;
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #fff;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.is-stopped {
    opacity: 0.6;
  }
}

.app-menu-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 5px;
  flex-shrink: 0;
}

.app-menu-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-menu-status {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.4);
}

.app-menu-content.is-grid-icons {
  min-width: 16rem;
  max-width: 22rem;

  .app-menu-fixed,
  .app-menu-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-content: flex-start;
    align-items: flex-start;
  }

  .app-menu-item {
    flex-direction: column;
    justify-content: center;
    width: 3.5rem;
    min-height: 3.5rem;
    padding: 0.375rem;
    text-align: center;
    gap: 0;
  }

  .app-menu-icon {
    width: 2rem;
    height: 2rem;
    margin: 0 auto;
  }
}
</style>
