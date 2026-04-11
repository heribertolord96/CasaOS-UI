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
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) }
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
    isSectionHidden: s => id => s.hiddenSections.includes(id),
  },

  mutations: {
    SET_PREFERENCE(state, { key, value }) {
      if (key in defaults) {
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
