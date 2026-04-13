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
    /** One tab per logical app; multiple instances show a count badge */
    tabBarGroups() {
      const byKey = new Map()
      for (const app of this.openApps) {
        const key = app.groupKey != null ? app.groupKey : app.name
        if (!byKey.has(key)) {
          byKey.set(key, [])
        }
        byKey.get(key).push(app)
      }
      return Array.from(byKey.entries()).map(([groupKey, apps]) => ({
        groupKey,
        apps,
        count: apps.length,
        label: apps[0].name,
        icon: apps[0].icon,
        active: apps.some(a => a.id === this.activeAppId),
        minimized: apps.every(a => a.state === 'minimized'),
      }))
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
    /** Cycle instances when clicking the same grouped tab */
    activateGroup(grp) {
      const aid = this.activeAppId
      const inGroup = grp.apps.find(a => a.id === aid)
      if (grp.apps.length > 1 && inGroup) {
        const idx = grp.apps.findIndex(a => a.id === aid)
        const next = grp.apps[(idx + 1) % grp.apps.length]
        this.activateApp(next.id)
        return
      }
      const front = grp.apps.reduce((a, b) => (a.zIndex >= b.zIndex ? a : b))
      this.activateApp(front.id)
    },
    closeGroup(grp) {
      const aid = this.activeAppId
      const activeInGroup = grp.apps.find(a => a.id === aid)
      const target = activeInGroup || grp.apps.reduce((a, b) => (a.zIndex >= b.zIndex ? a : b))
      this.closeApp(target.id)
    },
    tooltipForGroup(grp) {
      if (grp.count <= 1) {
        return grp.label
      }
      return `${grp.label} (${grp.count})`
    },
  },
}
</script>

<template>
  <div class="tab-bar">
    <b-tooltip
      :active="iconOnlyTabs && !$store.state.isMobile"
      :label="$t('Dashboard')"
      position="is-bottom"
      type="is-dark"
    >
      <div
        class="tab-item"
        :class="{ active: isDashboardActive, 'tab-icon-only': iconOnlyTabs }"
        @click="activateDashboard"
      >
        <b-icon icon="overview-outline" pack="casa" size="is-small" />
        <span v-show="!iconOnlyTabs" class="tab-label">{{ $t('Dashboard') }}</span>
      </div>
    </b-tooltip>

    <b-tooltip
      v-for="grp in tabBarGroups"
      :key="grp.groupKey"
      :active="iconOnlyTabs && !$store.state.isMobile"
      :label="tooltipForGroup(grp)"
      position="is-bottom"
      type="is-dark"
    >
      <div
        class="tab-item"
        :class="{ active: grp.active, minimized: grp.minimized, 'tab-icon-only': iconOnlyTabs }"
        @click="activateGroup(grp)"
      >
        <img
          v-if="grp.icon"
          :src="grp.icon"
          :alt="grp.label"
          class="tab-icon"
        >
        <span v-show="!iconOnlyTabs" class="tab-label">{{ grp.label }}</span>
        <span v-if="grp.count > 1" class="tab-count">{{ grp.count }}</span>
        <button
          class="tab-close"
          :class="{ 'tab-close-compact': iconOnlyTabs }"
          @click.stop="closeGroup(grp)"
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
  gap: 4px;
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  overflow-y: hidden;
  justify-content: center;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    height: 0;
  }

  /* b-tooltip wraps each tab; keep row compact and vertically centered */
  :deep(.b-tooltip) {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }

  :deep(.tooltip-trigger) {
    display: flex;
    align-items: center;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.2rem 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 10rem;
  min-height: 2rem;
  height: auto;
  max-height: 2.25rem;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  color: var(--shell-tab-text);
  position: relative;
  flex-shrink: 0;

  &.tab-icon-only {
    max-width: none;
    padding: 0.25rem 0.5rem;
  }

  &:hover {
    background: var(--shell-tab-hover-bg);
  }

  &.active {
    background: var(--shell-tab-active-bg);
    color: var(--shell-tab-active-text);

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

.tab-count {
  flex-shrink: 0;
  min-width: 1.125rem;
  padding: 0 0.28rem;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.2;
  border-radius: 8px;
  background: var(--shell-tab-count-bg);
  color: var(--shell-tab-count-fg);
}

.tab-item.active .tab-count {
  background: var(--shell-tab-count-bg-active);
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
    background: var(--shell-tab-close-hover);
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
