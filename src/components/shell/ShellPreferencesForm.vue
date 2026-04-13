<script>
import find from 'lodash/find'
import usePreferences from '@/mixins/usePreferences'
import AccentColorPicker from './AccentColorPicker.vue'
import events from '@/events/events'

const widgetsComponents = require.context('@/widgets', false, /.vue$/)
const WIDGETS_CONFIG_KEY = 'widgets_config'

export default {
  name: 'ShellPreferencesForm',
  components: { AccentColorPicker },
  mixins: [usePreferences],
  data() {
    return {
      widgetApps: [],
      widgetsSettings: [],
      widgetsLoaded: false,
    }
  },
  computed: {
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
  created() {
    widgetsComponents.keys().forEach((fileName) => {
      const componentConfig = widgetsComponents(fileName)
      this.widgetApps.push({ app: componentConfig.default })
    })
    this.loadWidgetsConfig()
  },
  methods: {
    openWallpaperModal() {
      this.$EventBus.$emit(events.SHOW_CHANGE_WALLPAPER_MODAL)
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
    onShellOpacityInput(e) {
      const v = Number.parseInt(e.target.value, 10)
      if (Number.isFinite(v)) {
        this.setPreference('shellOpacity', v)
      }
    },
  },
}
</script>

<template>
  <div class="shell-pref-form">
    <!-- Appearance -->
    <p class="is-size-7 has-text-weight-semibold px-4 pt-2 mb-1 topbar-advanced-section-label">
      {{ $t('Appearance') }}
    </p>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-2 shell-pref-muted">{{ $t('Accent Color') }}</p>
      <AccentColorPicker />
    </div>
    <div
      class="is-flex is-align-items-center mb-2 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
    >
      <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
        <b-icon class="mr-1 ml-2" icon="wallpaper-outline" pack="casa" size="is-20" />
        {{ $t('Wallpaper') }}
      </div>
      <div class="ml-2">
        <b-button rounded size="is-small" type="is-dark" @click.stop="openWallpaperModal">
          {{ $t('Change') }}
        </b-button>
      </div>
    </div>

    <hr class="topbar-settings-section-divider" role="presentation">

    <!-- Dashboard -->
    <p class="is-size-7 has-text-weight-semibold px-4 pt-1 mb-1 topbar-advanced-section-label">
      {{ $t('Dashboard') }}
    </p>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Icon size') }}</p>
      <div class="shell-pref-option-row">
        <button
          v-for="opt in iconSizeOptions"
          :key="opt.value"
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': iconSize === opt.value }"
          @click.stop="setPreference('iconSize', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Grid density') }}</p>
      <div class="shell-pref-option-row shell-pref-option-row--wrap">
        <button
          v-for="opt in gridDensityOptions"
          :key="opt.value"
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': gridDensity === opt.value }"
          @click.stop="setPreference('gridDensity', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <div
      class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
    >
      <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
        <b-icon class="mr-1 ml-2" icon="format-text" size="is-20" />
        <span class="is-size-7">{{ $t('Show labels under icons') }}</span>
      </div>
      <b-field>
        <b-switch
          :value="showAppLabels"
          class="is-flex-direction-row-reverse mr-0 _small"
          type="is-dark"
          @input="setPreference('showAppLabels', $event)"
        />
      </b-field>
    </div>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Tab bar') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Tab bar display hint') }}
      </p>
      <div class="shell-pref-option-row shell-pref-option-row--wrap">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': tabBarDisplay === 'iconAndLabel' }"
          @click.stop="setPreference('tabBarDisplay', 'iconAndLabel')"
        >
          {{ $t('Icon and label') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': tabBarDisplay === 'iconTooltip' }"
          @click.stop="setPreference('tabBarDisplay', 'iconTooltip')"
        >
          {{ $t('Icon and tooltip') }}
        </button>
      </div>
    </div>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Apps menu (top bar)') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Apps menu display hint') }}
      </p>
      <div class="shell-pref-option-row shell-pref-option-row--wrap">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': appMenuDisplay === 'listLabels' }"
          @click.stop="setPreference('appMenuDisplay', 'listLabels')"
        >
          {{ $t('List with labels') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': appMenuDisplay === 'gridIcons' }"
          @click.stop="setPreference('appMenuDisplay', 'gridIcons')"
        >
          {{ $t('Grid icons') }}
        </button>
      </div>
    </div>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Hidden Sections') }}</p>
      <div v-if="hiddenSections.length === 0" class="is-size-7 shell-pref-muted">
        {{ $t('No hidden sections') }}
      </div>
      <div v-else>
        <div
          v-for="section in hiddenSections"
          :key="section"
          class="shell-pref-hidden-row is-flex is-align-items-center is-justify-content-space-between"
        >
          <span class="is-size-7">{{ section }}</span>
          <b-button size="is-small" type="is-text" @click.stop="toggleSectionVisibility(section)">
            {{ $t('Restore') }}
          </b-button>
        </div>
        <b-button
          v-if="hiddenSections.length > 1"
          size="is-small"
          type="is-dark"
          rounded
          class="mt-2"
          @click.stop="restoreAllSections"
        >
          {{ $t('Restore All') }}
        </b-button>
      </div>
    </div>

    <hr class="topbar-settings-section-divider" role="presentation">

    <!-- Widgets -->
    <p class="is-size-7 has-text-weight-semibold px-4 pt-1 mb-1 topbar-advanced-section-label">
      {{ $t('Widgets') }}
    </p>
    <p class="is-size-7 px-4 mb-2 shell-pref-muted">
      {{ $t('Widgets sidebar hint') }}
    </p>
    <div v-if="!widgetsLoaded" class="is-size-7 px-4 shell-pref-muted mb-2">
      {{ $t('Loading') }}…
    </div>
    <div v-else>
      <div
        v-for="(item, index) in widgetsSettings"
        :key="`widget_${index}`"
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon :icon="getWidgetIcon(item.name)" pack="casa" size="is-small" class="mr-2 ml-2" />
          <span class="is-size-7">{{ $t(getWidgetTitle(item.name)) }}</span>
        </div>
        <b-field>
          <b-switch
            v-model="item.show"
            class="is-flex-direction-row-reverse mr-0 _small"
            type="is-dark"
            @input="handleWidgetToggle"
          />
        </b-field>
      </div>
    </div>

    <hr class="topbar-settings-section-divider" role="presentation">

    <!-- Behavior -->
    <p class="is-size-7 has-text-weight-semibold px-4 pt-1 mb-1 topbar-advanced-section-label">
      {{ $t('Behavior') }}
    </p>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Interface theme') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Theme shell hint') }}
      </p>
      <div class="shell-pref-option-row">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': uiTheme === 'dark' }"
          @click.stop="setPreference('uiTheme', 'dark')"
        >
          {{ $t('Dark') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': uiTheme === 'light' }"
          @click.stop="setPreference('uiTheme', 'light')"
        >
          {{ $t('Light') }}
        </button>
      </div>
    </div>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Shell background opacity') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Shell opacity hint') }}
      </p>
      <div class="shell-pref-opacity">
        <input
          class="shell-pref-range"
          type="range"
          :value="shellOpacity"
          min="15"
          max="100"
          step="5"
          :aria-label="$t('Shell background opacity')"
          @input="onShellOpacityInput"
        >
        <span class="shell-pref-opacity-value">{{ shellOpacity }}%</span>
      </div>
    </div>
    <div class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Open Mode') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Choose how apps open when clicked') }}
      </p>
      <div class="shell-pref-option-row">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': openMode === 'newTab' }"
          @click.stop="setPreference('openMode', 'newTab')"
        >
          {{ $t('New Tab') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': openMode === 'embedded' }"
          @click.stop="setPreference('openMode', 'embedded')"
        >
          {{ $t('Embedded') }}
        </button>
      </div>
    </div>
    <div v-if="openMode === 'embedded'" class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Remember open apps') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Remember workspace hint') }}
      </p>
      <div class="shell-pref-option-row">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': rememberWorkspace }"
          @click.stop="setPreference('rememberWorkspace', true)"
        >
          {{ $t('On') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': !rememberWorkspace }"
          @click.stop="setPreference('rememberWorkspace', false)"
        >
          {{ $t('Off') }}
        </button>
      </div>
    </div>
    <div v-if="openMode === 'embedded'" class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Embedded window behavior') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Embedded window behavior hint') }}
      </p>
      <div class="shell-pref-option-row">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': embeddedViewerMode === 'classic' }"
          @click.stop="setPreference('embeddedViewerMode', 'classic')"
        >
          {{ $t('Classic') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': embeddedViewerMode === 'enhanced' }"
          @click.stop="setPreference('embeddedViewerMode', 'enhanced')"
        >
          {{ $t('Enhanced') }}
        </button>
      </div>
    </div>
    <div v-if="openMode === 'embedded'" class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('URL bar mode') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('URL bar mode hint') }}
      </p>
      <div class="shell-pref-option-row shell-pref-option-row--wrap">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': urlBarMode === 'never' }"
          @click.stop="setPreference('urlBarMode', 'never')"
        >
          {{ $t('Never') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': urlBarMode === 'auto' }"
          @click.stop="setPreference('urlBarMode', 'auto')"
        >
          {{ $t('Auto') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': urlBarMode === 'always' }"
          @click.stop="setPreference('urlBarMode', 'always')"
        >
          {{ $t('Always') }}
        </button>
      </div>
    </div>
    <div v-if="openMode === 'embedded' && urlBarMode === 'auto'" class="shell-pref-block px-4 mb-2">
      <p class="is-size-7 mb-1 shell-pref-muted">{{ $t('Address bar') }}</p>
      <p class="is-size-7 shell-pref-muted mb-2">
        {{ $t('Show address bar in embedded windows') }}
      </p>
      <div class="shell-pref-option-row">
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': showUrlBar }"
          @click.stop="setPreference('showUrlBar', true)"
        >
          {{ $t('Show') }}
        </button>
        <button
          type="button"
          class="shell-pref-pill"
          :class="{ 'is-active': !showUrlBar }"
          @click.stop="setPreference('showUrlBar', false)"
        >
          {{ $t('Hide') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.shell-pref-form {
  padding-bottom: 0.25rem;
}

.shell-pref-muted {
  color: var(--shell-muted-text);
}

.shell-pref-block {
  max-width: 100%;
  box-sizing: border-box;
}

.shell-pref-option-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.375rem;

  &--wrap {
    flex-wrap: wrap;
  }
}

.shell-pref-pill {
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--shell-select-border);
  background: var(--shell-settings-btn-bg, transparent);
  color: var(--shell-dropdown-text);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover {
    border-color: var(--accent-color, #007aff);
    background: var(--shell-hover);
  }

  &.is-active {
    background: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);
    color: #fff;
  }
}

.shell-pref-opacity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.shell-pref-range {
  flex: 1;
  min-width: 0;
  height: 0.375rem;
  accent-color: var(--accent-color, #007aff);
}

.shell-pref-opacity-value {
  font-size: 0.75rem;
  color: var(--shell-muted-text);
  min-width: 2.75rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.shell-pref-hidden-row {
  padding: 0.25rem 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--shell-divider);
  }
}

.shell-pref-form :deep(.color-hex) {
  color: var(--shell-muted-text);
}

.shell-pref-form :deep(.preset-swatch.active) {
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 0 2px var(--shell-dropdown-bg), 0 0 0 4px var(--accent-color, #007aff);
}
</style>
