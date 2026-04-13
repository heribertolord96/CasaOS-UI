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
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const merged = { ...defaults, ...JSON.parse(raw) }
      if (merged.embeddedViewerMode !== 'classic' && merged.embeddedViewerMode !== 'enhanced') {
        merged.embeddedViewerMode = defaults.embeddedViewerMode
      }
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
    isSectionHidden: s => id => s.hiddenSections.includes(id),
  },

  mutations: {
    SET_PREFERENCE(state, { key, value }) {
      if (key in defaults) {
        if (key === 'embeddedViewerMode' && value !== 'classic' && value !== 'enhanced') {
          return
        }
        state[key] = value
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
