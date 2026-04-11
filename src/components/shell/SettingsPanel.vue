<script>
import find from 'lodash/find'
import usePreferences from '@/mixins/usePreferences'
import WallpaperPicker from './WallpaperPicker.vue'
import AccentColorPicker from './AccentColorPicker.vue'

const widgetsComponents = require.context(
  '@/widgets',
  false,
  /.vue$/,
)

const WIDGETS_CONFIG_KEY = 'widgets_config'

export default {
  name: 'SettingsPanel',
  components: {
    WallpaperPicker,
    AccentColorPicker,
  },
  mixins: [usePreferences],
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      activeSection: 'appearance',
      widgetApps: [],
      widgetsSettings: [],
      widgetsLoaded: false,
    }
  },
  computed: {
    sections() {
      return [
        { id: 'appearance', label: this.$t('Appearance'), icon: 'wallpaper-outline' },
        { id: 'dashboard', label: 'Dashboard', icon: 'display-applications-outline' },
        { id: 'behavior', label: this.$t('Behavior'), icon: 'control-outline' },
      ]
    },
    iconSizeOptions() {
      return [
        { value: 'small', label: this.$t('Small') },
        { value: 'medium', label: this.$t('Medium') },
        { value: 'large', label: this.$t('Large') },
      ]
    },
    gridDensityOptions() {
      return [
        { value: 'compact', label: this.$t('Compact') },
        { value: 'normal', label: this.$t('Normal') },
        { value: 'spacious', label: this.$t('Spacious') },
      ]
    },
  },
  watch: {
    visible(val) {
      if (val && !this.widgetsLoaded) {
        this.loadWidgetsConfig()
      }
    },
  },
  created() {
    widgetsComponents.keys().forEach((fileName) => {
      const componentConfig = widgetsComponents(fileName)
      this.widgetApps.push({ app: componentConfig.default })
    })
  },
  methods: {
    close() {
      this.$emit('close')
    },
    getWidgetIcon(name) {
      const obj = find(this.widgetApps, o => o.app.name === name)
      return obj ? obj.app.icon : 'settings-outline'
    },
    getWidgetTitle(name) {
      const obj = find(this.widgetApps, o => o.app.name === name)
      return obj ? obj.app.title : name
    },
    loadWidgetsConfig() {
      const initData = this.widgetApps.map(w => ({
        name: w.app.name,
        show: w.app.initShow,
      }))
      this.$api.users.getCustomStorage(WIDGETS_CONFIG_KEY).then((res) => {
        if (res.status === 200) {
          if (res.data === '' || !res.data.data) {
            this.widgetsSettings = initData
          } else {
            this.widgetsSettings = initData.map((item) => {
              const remote = find(res.data.data, el => el.name === item.name)
              return {
                name: item.name,
                show: remote ? remote.show : item.show,
              }
            })
          }
        } else {
          this.widgetsSettings = initData
        }
        this.widgetsLoaded = true
      }).catch(() => {
        this.widgetsSettings = initData
        this.widgetsLoaded = true
      })
    },
    handleWidgetToggle() {
      this.$api.users.setCustomStorage(WIDGETS_CONFIG_KEY, this.widgetsSettings)
      this.$EventBus.$emit('casaUI:widgetsConfigChanged', this.widgetsSettings)
    },
  },
}
</script>

<template>
  <transition name="slide-right">
    <div v-if="visible" class="settings-overlay" @click.self="close">
      <div class="settings-panel">
        <!-- Header -->
        <div class="panel-header">
          <h2 class="panel-title">{{ $t('Settings') }}</h2>
          <button class="panel-close" @click="close">
            <b-icon icon="close" size="is-small" />
          </button>
        </div>

        <!-- Section Tabs -->
        <div class="panel-tabs">
          <button
            v-for="s in sections"
            :key="s.id"
            class="panel-tab"
            :class="{ active: activeSection === s.id }"
            @click="activeSection = s.id"
          >
            <b-icon :icon="s.icon" pack="casa" size="is-small" />
            <span>{{ s.label }}</span>
          </button>
        </div>

        <!-- Content -->
        <div class="panel-content">
          <!-- Appearance Section -->
          <template v-if="activeSection === 'appearance'">
            <div class="setting-group">
              <h4 class="setting-group-title">{{ $t('Accent Color') }}</h4>
              <AccentColorPicker />
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">{{ $t('Wallpaper') }}</h4>
              <WallpaperPicker />
            </div>
          </template>

          <!-- Dashboard Section -->
          <template v-if="activeSection === 'dashboard'">
            <div class="setting-group">
              <h4 class="setting-group-title">Icon Size</h4>
              <div class="option-row">
                <button
                  v-for="opt in iconSizeOptions"
                  :key="opt.value"
                  class="option-btn"
                  :class="{ active: iconSize === opt.value }"
                  @click="setPreference('iconSize', opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">Grid Density</h4>
              <div class="option-row">
                <button
                  v-for="opt in gridDensityOptions"
                  :key="opt.value"
                  class="option-btn"
                  :class="{ active: gridDensity === opt.value }"
                  @click="setPreference('gridDensity', opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">App Labels</h4>
              <div class="is-flex is-align-items-center">
                <span class="is-size-7 mr-2">{{ $t('Show labels under icons') }}</span>
                <b-switch
                  :value="showAppLabels"
                  type="is-dark"
                  size="is-small"
                  @input="setPreference('showAppLabels', $event)"
                />
              </div>
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">Tab bar</h4>
              <p class="is-size-7 has-text-grey mb-2">
                Center tabs: show text on the bar, or only icons with the name in a tooltip.
              </p>
              <div class="option-row option-row--wrap">
                <button
                  class="option-btn"
                  :class="{ active: tabBarDisplay === 'iconAndLabel' }"
                  @click="setPreference('tabBarDisplay', 'iconAndLabel')"
                >
                  Icon + label
                </button>
                <button
                  class="option-btn"
                  :class="{ active: tabBarDisplay === 'iconTooltip' }"
                  @click="setPreference('tabBarDisplay', 'iconTooltip')"
                >
                  Icon + tooltip
                </button>
              </div>
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">Apps menu (top bar)</h4>
              <p class="is-size-7 has-text-grey mb-2">
                Vertical list with names, or compact grid of icons (name on hover).
              </p>
              <div class="option-row option-row--wrap">
                <button
                  class="option-btn"
                  :class="{ active: appMenuDisplay === 'listLabels' }"
                  @click="setPreference('appMenuDisplay', 'listLabels')"
                >
                  List (icon + label)
                </button>
                <button
                  class="option-btn"
                  :class="{ active: appMenuDisplay === 'gridIcons' }"
                  @click="setPreference('appMenuDisplay', 'gridIcons')"
                >
                  Grid (icons)
                </button>
              </div>
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">{{ $t('Hidden Sections') }}</h4>
              <div v-if="hiddenSections.length === 0" class="is-size-7 has-text-grey">
                {{ $t('No hidden sections') }}
              </div>
              <div v-else>
                <div
                  v-for="section in hiddenSections"
                  :key="section"
                  class="hidden-section-item"
                >
                  <span class="is-size-7">{{ section }}</span>
                  <b-button
                    size="is-small"
                    type="is-text"
                    @click="toggleSectionVisibility(section)"
                  >
                    {{ $t('Restore') }}
                  </b-button>
                </div>
                <b-button
                  v-if="hiddenSections.length > 1"
                  size="is-small"
                  type="is-dark"
                  rounded
                  class="mt-2"
                  @click="restoreAllSections"
                >
                  {{ $t('Restore All') }}
                </b-button>
              </div>
            </div>

            <div class="setting-group">
              <h4 class="setting-group-title">{{ $t('Widgets') }}</h4>
              <div v-if="!widgetsLoaded" class="is-size-7 has-text-grey">
                {{ $t('Loading') }}...
              </div>
              <div v-else>
                <div
                  v-for="(item, index) in widgetsSettings"
                  :key="`widget_${index}`"
                  class="widget-toggle-item"
                >
                  <div class="is-flex is-align-items-center is-flex-grow-1">
                    <b-icon :icon="getWidgetIcon(item.name)" pack="casa" size="is-small" class="mr-2" />
                    <span class="is-size-7">{{ $t(getWidgetTitle(item.name)) }}</span>
                  </div>
                  <b-switch
                    v-model="item.show"
                    type="is-dark"
                    size="is-small"
                    @input="handleWidgetToggle"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- Behavior Section -->
          <template v-if="activeSection === 'behavior'">
            <div class="setting-group">
              <h4 class="setting-group-title">{{ $t('Open Mode') }}</h4>
              <p class="is-size-7 has-text-grey mb-2">
                {{ $t('Choose how apps open when clicked') }}
              </p>
              <div class="option-row">
                <button
                  class="option-btn"
                  :class="{ active: openMode === 'newTab' }"
                  @click="setPreference('openMode', 'newTab')"
                >
                  New Tab
                </button>
                <button
                  class="option-btn"
                  :class="{ active: openMode === 'embedded' }"
                  @click="setPreference('openMode', 'embedded')"
                >
                  Embedded
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 50;
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: 22rem;
  max-width: 90vw;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
}

.panel-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: rgba(0, 0, 0, 0.5);

  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
}

.panel-tabs {
  display: flex;
  padding: 0 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.panel-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.5);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;

  &:hover {
    color: rgba(0, 0, 0, 0.8);
  }

  &.active {
    color: var(--accent-color, #007AFF);
    border-bottom-color: var(--accent-color, #007AFF);
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.setting-group {
  margin-bottom: 1.25rem;
}

.setting-group-title {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: rgba(0, 0, 0, 0.7);
}

.option-row {
  display: flex;
  gap: 0.375rem;

  &--wrap {
    flex-wrap: wrap;
  }
}

.option-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all 0.15s;

  &:hover {
    border-color: var(--accent-color, #007AFF);
  }

  &.active {
    background: var(--accent-color, #007AFF);
    color: #fff;
    border-color: var(--accent-color, #007AFF);
  }
}

.hidden-section-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.widget-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  }
}

// Slide transition
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-active .settings-panel,
.slide-right-leave-active .settings-panel {
  transition: transform 0.3s ease;
}

.slide-right-enter .settings-panel,
.slide-right-leave-to .settings-panel {
  transform: translateX(100%);
}

.slide-right-enter,
.slide-right-leave-to {
  opacity: 0;
}

@media (prefers-color-scheme: dark) {
  .settings-panel {
    background: #2a2a2e;
    color: #fff;
  }

  .panel-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .panel-tabs {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .panel-tab {
    color: rgba(255, 255, 255, 0.5);

    &:hover {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  .panel-close {
    color: rgba(255, 255, 255, 0.5);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .setting-group-title {
    color: rgba(255, 255, 255, 0.7);
  }

  .option-btn {
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);
  }
}
</style>
