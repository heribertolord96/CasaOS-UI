const STORAGE_KEY = 'casaos_prefs'

const defaults = {
  openMode: 'newTab',
  accentColor: '#007AFF',
  iconSize: 'medium',
  gridDensity: 'normal',
  showAppLabels: true,
  wallpaperBlurOnApps: false,
  hiddenSections: [],
  /** TopBar tabs: iconAndLabel | iconTooltip */
  tabBarDisplay: 'iconAndLabel',
  /** App menu dropdown: listLabels | gridIcons */
  appMenuDisplay: 'listLabels',
  /** TopBar / TabBar / app menu / embedded chrome: dark | light */
  uiTheme: 'dark',
  /** 15–100: multiplier for shell glass backgrounds (taskbar, menus, tab strip) */
  shellOpacity: 100,
  /** Persist embedded workspace (open windows, layout) across page reloads */
  rememberWorkspace: true,
  /**
   * Embedded iframe windows: original mouse-only chrome vs improved (pointer, drag shield, dbl-click maximize).
   * Reset via Restore initial configuration → RESET_PREFERENCES.
   */
  embeddedViewerMode: 'classic',
  /** Master switch when urlBarMode is auto: show address bar in embedded windows */
  showUrlBar: false,
  /** auto: follow showUrlBar; always: bar available per-window toggle; never: hide bar */
  urlBarMode: 'auto',
}

function normalizeUrlBarMode(v) {
  if (v === 'auto' || v === 'always' || v === 'never') {
    return v
  }
  return defaults.urlBarMode
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const merged = { ...defaults, ...parsed }
      if (merged.embeddedViewerMode !== 'classic' && merged.embeddedViewerMode !== 'enhanced') {
        merged.embeddedViewerMode = defaults.embeddedViewerMode
      }
      merged.urlBarMode = normalizeUrlBarMode(merged.urlBarMode)
      // Migrate legacy key from earlier fork
      if (parsed.showEmbeddedUrlBar != null && parsed.showUrlBar === undefined) {
        merged.showUrlBar = !!parsed.showEmbeddedUrlBar
      }
      delete merged.showEmbeddedUrlBar
      return merged
    }
  } catch (e) {
    console.warn('Failed to load preferences from localStorage', e)
  }
  return { ...defaults }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save preferences to localStorage', e)
  }
}

const preferences = {
  namespaced: true,

  state: () => loadFromStorage(),

  getters: {
    openMode: s => s.openMode,
    accentColor: s => s.accentColor,
    iconSize: s => s.iconSize,
    gridDensity: s => s.gridDensity,
    showAppLabels: s => s.showAppLabels,
    wallpaperBlurOnApps: s => s.wallpaperBlurOnApps,
    hiddenSections: s => s.hiddenSections,
    tabBarDisplay: s => s.tabBarDisplay,
    appMenuDisplay: s => s.appMenuDisplay,
    uiTheme: s => s.uiTheme,
    shellOpacity: s => s.shellOpacity,
    rememberWorkspace: s => s.rememberWorkspace,
    embeddedViewerMode: s => s.embeddedViewerMode,
    showUrlBar: s => s.showUrlBar,
    urlBarMode: s => s.urlBarMode,
    isSectionHidden: s => id => s.hiddenSections.includes(id),
  },

  mutations: {
    SET_PREFERENCE(state, { key, value }) {
      if (key in defaults) {
        if (key === 'embeddedViewerMode' && value !== 'classic' && value !== 'enhanced') {
          return
        }
        if (key === 'urlBarMode') {
          state.urlBarMode = normalizeUrlBarMode(value)
        } else {
          state[key] = value
        }
        saveToStorage(state)
      }
    },

    TOGGLE_SECTION_VISIBILITY(state, sectionId) {
      const idx = state.hiddenSections.indexOf(sectionId)
      if (idx === -1) {
        state.hiddenSections.push(sectionId)
      } else {
        state.hiddenSections.splice(idx, 1)
      }
      saveToStorage(state)
    },

    RESTORE_ALL_SECTIONS(state) {
      state.hiddenSections = []
      saveToStorage(state)
    },

    RESET_PREFERENCES(state) {
      Object.assign(state, { ...defaults })
      saveToStorage(state)
    },
  },

  actions: {
    updatePreference({ commit }, payload) {
      commit('SET_PREFERENCE', payload)
    },
  },
}

export default preferences
