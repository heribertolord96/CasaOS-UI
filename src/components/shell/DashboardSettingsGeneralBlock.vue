<script>
import { DEFAULT_SEARCH_ENGINES, defaultLanguagesList } from '@/components/shell/dashboardGeneralDefaults'

/**
 * Shared “General / Content” dashboard settings + power shortcuts (Restart / Shutdown).
 * Used in TopBar settings dropdown and App menu embedded pane.
 */
export default {
  name: 'DashboardSettingsGeneralBlock',
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
    restartText: {
      type: String,
      default: 'Restart',
    },
    shutdownText: {
      type: String,
      default: 'Shutdown',
    },
    /** When true, outer scroll (e.g. App menu) handles scrolling — no inner max-height. */
    embedded: {
      type: Boolean,
      default: false,
    },
    /** Hide Restart/Shutdown row (e.g. App menu shows them in its own footer). */
    omitPowerFooter: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    rssModel: {
      get() {
        return this.rssSwitch
      },
      set(val) {
        this.$emit('update:rssSwitch', val)
        this.$emit('rss-input')
      },
    },
  },
  methods: {
    emitSave() {
      this.$emit('save')
    },
    onPower(key) {
      this.$emit('power', key)
    },
  },
}
</script>

<template>
  <div class="dashboard-settings-general topbar-settings-main-block">
    <div
      class="topbar-settings-main-config"
      :class="embedded ? 'dashboard-settings-general__config--embedded' : 'topbar-settings-tab-scroll'"
    >
      <p class="is-size-7 has-text-weight-semibold px-4 pt-2 mb-1 topbar-advanced-section-label">
        {{ $t('General') }}
      </p>
      <div
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon class="mr-1 ml-2" icon="show-search-outline" pack="casa" size="is-20" />
          {{ $t("Show Search Bar") }}
        </div>
        <div>
          <b-field>
            <b-switch
              v-model="barData.search_switch"
              class="is-flex-direction-row-reverse mr-0 _small"
              type="is-dark"
              @input="emitSave"
            />
          </b-field>
        </div>
      </div>

      <div
        v-if="barData.search_switch"
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon class="mr-1 ml-2" icon="search-outline" pack="casa" size="is-20" />
          {{ $t("Search Engine") }}
        </div>
        <div>
          <b-field>
            <b-select
              v-model="barData.search_engine"
              class="set-select"
              size="is-small"
              @input="emitSave"
            >
              <option v-for="item in searchEngines" :key="item.name" :value="item.url">
                {{ item.name }}
              </option>
            </b-select>
          </b-field>
        </div>
      </div>

      <div
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon class="mr-1 ml-2" icon="language-outline" pack="casa" size="is-20" />
          {{ $t("Language") }}
        </div>
        <div>
          <b-field>
            <b-select v-model="barData.lang" class="set-select" size="is-small" @input="emitSave">
              <option v-for="lang in languages" :key="lang.lang" :value="lang.lang">
                {{ lang.name }}
              </option>
            </b-select>
          </b-field>
        </div>
      </div>

      <hr class="topbar-settings-section-divider" role="presentation">

      <p class="is-size-7 has-text-weight-semibold px-4 pt-1 mb-1 topbar-advanced-section-label">
        {{ $t('Content') }}
      </p>
      <div
        v-if="$store.state.notImportList.length > 0"
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon class="mr-1 ml-2" icon="docker-outline" pack="casa" size="is-20" />
          {{ $t("Show other Docker container app(s)") }}
        </div>
        <div>
          <b-field>
            <b-switch
              v-model="barData.existing_apps_switch"
              class="is-flex-direction-row-reverse mr-0 _small"
              type="is-dark"
              @input="emitSave"
            />
          </b-field>
        </div>
      </div>

      <div
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon class="mr-1 ml-2" icon="news-outline" pack="casa" size="is-20" />
          {{ $t("Show news feed from CasaOS Blog") }}
        </div>
        <div>
          <b-field>
            <b-switch
              v-model="rssModel"
              :native-value="barData.rss_switch"
              class="is-flex-direction-row-reverse mr-0 _small"
              type="is-dark"
            />
          </b-field>
        </div>
      </div>

      <div
        class="is-flex is-align-items-center mb-1 _is-large _box hover-effect _is-radius pr-2 mr-4 ml-4"
      >
        <div class="is-flex is-align-items-center is-flex-grow-1 _is-normal">
          <b-icon
            class="mr-1 ml-2"
            icon="display-applications-outline"
            pack="casa"
            size="is-20"
          />
          {{ $t("Show Recommended Apps") }}
        </div>
        <div>
          <b-field>
            <b-switch
              v-model="barData.recommend_switch"
              class="is-flex-direction-row-reverse mr-0 _small"
              type="is-dark"
              @input="emitSave"
            />
          </b-field>
        </div>
      </div>
    </div>

    <div
      v-if="!omitPowerFooter"
      class="topbar-settings-main-quick topbar-settings-main-quick--footer"
    >
      <div
        class="is-flex is-align-content-center is-justify-content-center _footer pl-3 pr-3 pt-2 pb-2"
      >
        <div
          class="mr-1 column is-half is-flex is-align-items-center is-justify-content-center hover-effect is-clickable _is-radius _is-normal"
          @click.stop="onPower('Restart')"
        >
          <b-icon class="mr-1" icon="restart-outline" pack="casa" />
          {{ restartText }}
        </div>
        <div
          class="ml-1 column is-half is-flex is-align-items-center is-justify-content-center is-clickable hover-effect-attention _has-text-attention _is-radius"
          @click.stop="onPower('Shutdown')"
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
</template>

<style lang="scss" scoped>
.topbar-settings-main-block {
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.topbar-settings-main-config {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0 0.75rem;
}

.topbar-settings-main-quick {
  border-bottom: 1px solid var(--shell-divider);
}

.topbar-settings-main-quick--footer {
  border-bottom: none;
  border-top: 1px solid var(--shell-divider);
  margin-top: 0.25rem;
}

.topbar-advanced-section-label {
  color: var(--shell-muted-text);
}

.topbar-settings-section-divider {
  border: none;
  height: 1px;
  margin: 0.5rem 1rem;
  background: var(--shell-divider);
}

.topbar-settings-tab-scroll {
  max-height: min(calc(100dvh - 6.5rem), calc(100vh - 6.5rem));
  overflow-y: auto;
  padding-bottom: 0.25rem;
}

.dashboard-settings-general__config--embedded {
  overflow-x: hidden;
  padding-bottom: 0.25rem;
}
</style>
