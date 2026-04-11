<script>
import usePreferences from '@/mixins/usePreferences'

export default {
  name: 'TabBar',
  mixins: [usePreferences],
  computed: {
    openApps() {
      return this.$store.getters['windowManager/openApps']
    },
    activeAppId() {
      return this.$store.getters['windowManager/activeAppId']
    },
    isDashboardActive() {
      return this.activeAppId === null
    },
    iconOnlyTabs() {
      return this.tabBarDisplay === 'iconTooltip'
    },
  },
  methods: {
    activateDashboard() {
      this.$store.dispatch('windowManager/showDashboard')
    },
    activateApp(appId) {
      this.$store.dispatch('windowManager/activateApp', appId)
    },
    closeApp(appId) {
      this.$store.dispatch('windowManager/closeApp', appId)
    },
  },
}
</script>

<template>
  <div class="tab-bar">
    <b-tooltip
      :active="iconOnlyTabs && !$store.state.isMobile"
      label="Dashboard"
      position="is-bottom"
      type="is-dark"
    >
      <div
        class="tab-item"
        :class="{ active: isDashboardActive, 'tab-icon-only': iconOnlyTabs }"
        @click="activateDashboard"
      >
        <b-icon icon="overview-outline" pack="casa" size="is-small" />
        <span v-show="!iconOnlyTabs" class="tab-label">Dashboard</span>
      </div>
    </b-tooltip>

    <b-tooltip
      v-for="app in openApps"
      :key="app.id"
      :active="iconOnlyTabs && !$store.state.isMobile"
      :label="app.name"
      position="is-bottom"
      type="is-dark"
    >
      <div
        class="tab-item"
        :class="{ active: activeAppId === app.id, minimized: app.state === 'minimized', 'tab-icon-only': iconOnlyTabs }"
        @click="activateApp(app.id)"
      >
        <img
          v-if="app.icon"
          :src="app.icon"
          :alt="app.name"
          class="tab-icon"
        >
        <span v-show="!iconOnlyTabs" class="tab-label">{{ app.name }}</span>
        <button
          class="tab-close"
          :class="{ 'tab-close-compact': iconOnlyTabs }"
          @click.stop="closeApp(app.id)"
        >
          <b-icon icon="close" size="is-small" />
        </button>
      </div>
    </b-tooltip>
  </div>
</template>

<style lang="scss" scoped>
.tab-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 0.5rem;
  justify-content: center;

  &::-webkit-scrollbar {
    height: 0;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 10rem;
  height: 2rem;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
  flex-shrink: 0;

  &.tab-icon-only {
    max-width: none;
    padding: 0.25rem 0.5rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 25%;
      right: 25%;
      height: 2px;
      background: var(--accent-color, #007AFF);
      border-radius: 1px;
    }
  }

  &.tab-icon-only.active::after {
    left: 15%;
    right: 15%;
  }

  &.minimized {
    opacity: 0.5;
  }
}

.tab-icon {
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 6rem;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 0.125rem;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  color: inherit;
  flex-shrink: 0;

  .tab-item:hover & {
    opacity: 0.6;
  }

  &:hover {
    opacity: 1 !important;
    background: rgba(255, 255, 255, 0.15);
  }
}

.tab-close-compact {
  opacity: 0.45;
  margin-left: 0;

  .tab-item:hover & {
    opacity: 0.85;
  }
}
</style>
